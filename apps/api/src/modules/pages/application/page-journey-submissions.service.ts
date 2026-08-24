import { createHash } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { chooseYourHeartTemplate } from '@letterly/templates';
import { PAGE_JOURNEY_SUBMISSIONS_REPOSITORY } from './page-journey-submissions.repository';
import type {
  PageJourneySubmissionRepository,
  SubmitPageJourneyResponseInput,
} from './page-journey-submissions.repository';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './page-journey-metrics';

export class PageJourneySubmissionNotFoundError extends Error {
  constructor() {
    super('This letter is not available');
    this.name = 'PageJourneySubmissionNotFoundError';
  }
}

export class PageJourneySubmissionCapabilityError extends Error {
  constructor() {
    super('This template does not support this response');
    this.name = 'PageJourneySubmissionCapabilityError';
  }
}

export class PageJourneySubmissionInvalidBranchError extends Error {
  constructor() {
    super('The response does not follow the journey path');
    this.name = 'PageJourneySubmissionInvalidBranchError';
  }
}

export class PageJourneySubmissionVersionConflictError extends Error {
  constructor() {
    super('The journey has changed since it was opened');
    this.name = 'PageJourneySubmissionVersionConflictError';
  }
}

export class PageJourneySubmissionDuplicateError extends Error {
  constructor() {
    super('This browser has already submitted a response');
    this.name = 'PageJourneySubmissionDuplicateError';
  }
}

export class PageJourneySubmissionIdempotencyConflictError extends Error {
  constructor() {
    super('That idempotency key was already used for another response');
    this.name = 'PageJourneySubmissionIdempotencyConflictError';
  }
}

function submissionMetricOutcome(
  result: Awaited<
    ReturnType<PageJourneySubmissionRepository['submitJourneyResponse']>
  >,
):
  | 'accepted'
  | 'duplicate'
  | 'conflict'
  | 'invalid'
  | 'not_found'
  | 'unsupported'
  | 'error' {
  switch (result.type) {
    case 'accepted':
      return 'accepted';
    case 'duplicate':
      return 'duplicate';
    case 'idempotency_conflict':
      return 'conflict';
    case 'invalid_branch':
      return 'invalid';
    case 'not_found':
      return 'not_found';
    case 'unsupported_capability':
      return 'unsupported';
    case 'version_conflict':
      return 'conflict';
  }
}

export function hashPageJourneySubmissionPayload(
  input: Pick<
    SubmitPageJourneyResponseInput,
    | 'slug'
    | 'publishedGraphVersion'
    | 'answers'
    | 'outcomeKey'
    | 'visitorMessage'
  >,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        slug: input.slug.trim().toLowerCase(),
        publishedGraphVersion: input.publishedGraphVersion,
        answers: input.answers,
        outcomeKey: input.outcomeKey,
        visitorMessage: input.visitorMessage?.trim() ?? null,
      }),
    )
    .digest('hex');
}

@Injectable()
export class PageJourneySubmissionService {
  constructor(
    @Inject(PAGE_JOURNEY_SUBMISSIONS_REPOSITORY)
    private readonly repository: PageJourneySubmissionRepository,
    @Optional()
    @Inject(PAGE_JOURNEY_METRICS)
    private readonly metrics?: PageJourneyMetrics,
  ) {}

  async submit(
    input: Omit<SubmitPageJourneyResponseInput, 'idempotencyPayloadHash'>,
  ): Promise<{ accepted: true }> {
    let result: Awaited<
      ReturnType<PageJourneySubmissionRepository['submitJourneyResponse']>
    >;
    try {
      result = await this.repository.submitJourneyResponse({
        ...input,
        idempotencyPayloadHash: hashPageJourneySubmissionPayload(input),
      });
    } catch (error: unknown) {
      this.metrics?.record({
        event: 'journey_submission',
        templateKey: chooseYourHeartTemplate.renderer.key,
        outcome: 'error',
      });
      throw error;
    }

    this.metrics?.record({
      event: 'journey_submission',
      templateKey: chooseYourHeartTemplate.renderer.key,
      outcome: submissionMetricOutcome(result),
    });

    switch (result.type) {
      case 'accepted':
        return { accepted: true };
      case 'not_found':
        throw new PageJourneySubmissionNotFoundError();
      case 'unsupported_capability':
        throw new PageJourneySubmissionCapabilityError();
      case 'invalid_branch':
        throw new PageJourneySubmissionInvalidBranchError();
      case 'version_conflict':
        throw new PageJourneySubmissionVersionConflictError();
      case 'duplicate':
        throw new PageJourneySubmissionDuplicateError();
      case 'idempotency_conflict':
        throw new PageJourneySubmissionIdempotencyConflictError();
    }
  }

  async findPublicPageScope(slug: string): Promise<string> {
    const pageId = await this.repository.findPublishedPageScope(slug);
    if (!pageId) {
      throw new PageJourneySubmissionNotFoundError();
    }
    return pageId;
  }
}
