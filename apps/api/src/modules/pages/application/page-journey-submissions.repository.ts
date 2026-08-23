import type { PageJourneySnapshot } from '@letterly/templates';

export const PAGE_JOURNEY_SUBMISSIONS_REPOSITORY = Symbol(
  'PAGE_JOURNEY_SUBMISSIONS_REPOSITORY',
);

export interface PageJourneySubmissionAnswerInput {
  questionKey: string;
  choiceKey: string;
}

export interface SubmitPageJourneyResponseInput {
  slug: string;
  browserTokenHash: string;
  idempotencyKey: string;
  idempotencyPayloadHash: string;
  publishedGraphVersion: number;
  answers: PageJourneySubmissionAnswerInput[];
  outcomeKey: string;
  visitorMessage?: string;
  observedPasswordVersion?: string | null;
}

export type SubmitPageJourneyResponseResult =
  | { type: 'accepted' }
  | { type: 'not_found' }
  | { type: 'unsupported_capability' }
  | { type: 'invalid_branch' }
  | { type: 'version_conflict' }
  | { type: 'duplicate' }
  | { type: 'idempotency_conflict' };

export interface PageJourneySubmissionRepository {
  findPublishedPageScope(slug: string): Promise<string | null>;
  submitJourneyResponse(
    input: SubmitPageJourneyResponseInput,
  ): Promise<SubmitPageJourneyResponseResult>;
}

export type { PageJourneySnapshot };
