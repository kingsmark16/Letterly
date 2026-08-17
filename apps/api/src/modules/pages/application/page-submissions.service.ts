import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PAGE_SUBMISSIONS_REPOSITORY } from './page-submissions.repository';
import type {
  ListSubmissionsInput,
  ListSubmissionsResult,
  PageSubmissionsRepository,
  SubmissionCursor,
  SubmitVisitorResponseInput,
} from './page-submissions.repository';

export class SubmissionPageNotFoundError extends Error {
  constructor() {
    super('This letter is not available');
    this.name = 'SubmissionPageNotFoundError';
  }
}

export class InvalidSubmissionBranchError extends Error {
  constructor() {
    super('The response does not follow the question path');
    this.name = 'InvalidSubmissionBranchError';
  }
}

export class SubmissionCapabilityUnavailableError extends Error {
  constructor() {
    super('This template does not support this response');
    this.name = 'SubmissionCapabilityUnavailableError';
  }
}

export class DuplicateSubmissionError extends Error {
  constructor() {
    super('This browser has already submitted a response');
    this.name = 'DuplicateSubmissionError';
  }
}

export class SubmissionIdempotencyConflictError extends Error {
  constructor() {
    super('That idempotency key was already used for another response');
    this.name = 'SubmissionIdempotencyConflictError';
  }
}

export class SubmissionNotFoundError extends Error {
  constructor() {
    super('Submission not found');
    this.name = 'SubmissionNotFoundError';
  }
}

export class SubmissionConfirmationRequiredError extends Error {
  constructor() {
    super('Explicit confirmation is required');
    this.name = 'SubmissionConfirmationRequiredError';
  }
}

export function hashSubmissionPayload(
  input: Pick<SubmitVisitorResponseInput, 'answers' | 'visitorMessage'>,
): string {
  const answers = [...input.answers]
    .map((answer) => ({
      questionId: answer.questionId,
      choiceId: answer.choiceId ?? null,
      textAnswer: answer.textAnswer?.trim() ?? null,
    }))
    .sort((left, right) => left.questionId.localeCompare(right.questionId));

  return createHash('sha256')
    .update(
      JSON.stringify({
        answers,
        visitorMessage: input.visitorMessage
          ? { message: input.visitorMessage.message.trim() }
          : null,
      }),
    )
    .digest('hex');
}

@Injectable()
export class PageSubmissionsService {
  constructor(
    @Inject(PAGE_SUBMISSIONS_REPOSITORY)
    private readonly repository: PageSubmissionsRepository,
  ) {}

  async submit(
    input: Omit<SubmitVisitorResponseInput, 'idempotencyPayloadHash'>,
  ): Promise<{ accepted: true }> {
    const result = await this.repository.submitVisitorResponse({
      ...input,
      idempotencyPayloadHash: hashSubmissionPayload(input),
    });

    switch (result.type) {
      case 'accepted':
        return { accepted: true };
      case 'not_found':
        throw new SubmissionPageNotFoundError();
      case 'unsupported_capability':
        throw new SubmissionCapabilityUnavailableError();
      case 'invalid_branch':
        throw new InvalidSubmissionBranchError();
      case 'duplicate':
        throw new DuplicateSubmissionError();
      case 'idempotency_conflict':
        throw new SubmissionIdempotencyConflictError();
    }
  }

  async findPublicPageScope(slug: string): Promise<string> {
    const pageId = await this.repository.findPublishedPageScope(slug);
    if (!pageId) {
      throw new SubmissionPageNotFoundError();
    }
    return pageId;
  }

  async list(input: ListSubmissionsInput): Promise<ListSubmissionsResult> {
    const result = await this.repository.listOwned(input);
    if ('type' in result) {
      throw new SubmissionNotFoundError();
    }
    return result;
  }

  async find(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }) {
    const result = await this.repository.findOwned(input);
    if (!result) {
      throw new SubmissionNotFoundError();
    }
    return result;
  }

  async markRead(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }) {
    const result = await this.repository.markRead(input);
    if (result === 'not_found') {
      throw new SubmissionNotFoundError();
    }
    return {
      submissionId: input.submissionId,
      readState: 'READ' as const,
    };
  }

  async delete(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
    confirm: boolean;
  }) {
    if (!input.confirm) {
      throw new SubmissionConfirmationRequiredError();
    }

    const result = await this.repository.deleteOwned(input);
    if (result === 'not_found') {
      throw new SubmissionNotFoundError();
    }
    return { deleted: true as const };
  }
}

export type { SubmissionCursor };
