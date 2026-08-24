import type { PageJourneySnapshot } from '@letterly/templates';

export const PAGE_SUBMISSIONS_REPOSITORY = Symbol(
  'PAGE_SUBMISSIONS_REPOSITORY',
);

export interface SubmissionAnswerInput {
  questionId: string;
  choiceId?: string | null;
  textAnswer?: string | null;
}

export interface VisitorMessageInput {
  message: string;
}

export interface SubmitVisitorResponseInput {
  slug: string;
  browserTokenHash: string;
  idempotencyKey: string;
  idempotencyPayloadHash: string;
  answers: SubmissionAnswerInput[];
  visitorMessage?: VisitorMessageInput;
  observedPasswordVersion?: string | null;
}

export interface SubmissionCursor {
  submittedAt: Date;
  id: string;
}

export interface SubmissionSummary {
  id: string;
  readState: 'UNREAD' | 'READ';
  submittedAt: Date;
  answerCount: number;
  hasVisitorMessage: boolean;
}

export interface SubmissionDetail {
  id: string;
  pageId: string;
  readState: 'UNREAD' | 'READ';
  submittedAt: Date;
  answers: Array<{
    questionId: string;
    promptSnapshot: string;
    choiceLabelSnapshot: string | null;
    textAnswer: string | null;
  }>;
  visitorMessage: {
    promptSnapshot: string;
    message: string;
  } | null;
  journeySnapshot: PageJourneySnapshot | null;
}

export type SubmitVisitorResponseResult =
  | { type: 'accepted' }
  | { type: 'not_found' }
  | { type: 'unsupported_capability' }
  | { type: 'invalid_branch' }
  | { type: 'duplicate' }
  | { type: 'idempotency_conflict' };

export interface ListSubmissionsInput {
  creatorId: string;
  pageId: string;
  filter: 'all' | 'unread';
  size: number;
  cursor: SubmissionCursor | null;
}

export interface ListSubmissionsResult {
  items: SubmissionSummary[];
  unreadCount: number;
  nextCursor: SubmissionCursor | null;
}

export interface PageSubmissionsRepository {
  findPublishedPageScope(slug: string): Promise<string | null>;
  submitVisitorResponse(
    input: SubmitVisitorResponseInput,
  ): Promise<SubmitVisitorResponseResult>;
  listOwned(
    input: ListSubmissionsInput,
  ): Promise<ListSubmissionsResult | { type: 'not_found' }>;
  findOwned(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }): Promise<SubmissionDetail | null>;
  markRead(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }): Promise<'updated' | 'not_found'>;
  deleteOwned(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }): Promise<'deleted' | 'not_found'>;
}
