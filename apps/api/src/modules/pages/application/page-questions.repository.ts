export const PAGE_QUESTIONS_REPOSITORY = Symbol('PAGE_QUESTIONS_REPOSITORY');

export type QuestionType = 'CHOICE' | 'PLAIN_MESSAGE';

export interface QuestionChoiceInput {
  /** Existing server id, supplied only when preserving a choice on update. */
  id?: string;
  label: string;
  creatorMessage?: string | null;
  /** @deprecated Legacy client fields are ignored by canonical writes. */
  key?: string;
  /** @deprecated The array position owns order. */
  displayOrder?: number;
  /** @deprecated Legacy graph input, ignored by linear question writes. */
  endsJourney?: boolean;
  /** @deprecated Legacy graph input, ignored by linear question writes. */
  nextQuestionId?: string | null;
}

export interface PageQuestionRecord {
  id: string;
  pageId: string;
  key: string;
  type: QuestionType;
  prompt: string;
  displayOrder: number;
  config: Record<string, unknown> | null;
  choices: Array<{
    id: string;
    key: string;
    label: string;
    displayOrder: number;
    creatorMessage: string | null;
  }>;
}

export interface CreatePageQuestionInput {
  creatorId: string;
  pageId: string;
  type: QuestionType;
  prompt: string;
  expectedContentVersion: number;
  choices?: QuestionChoiceInput[];
  /** @deprecated Server assigns order. */
  displayOrder?: number;
  /** @deprecated Server assigns identity. */
  key?: string;
  /** @deprecated Legacy graph input, ignored by linear question writes. */
  endsJourney?: boolean;
  /** @deprecated Legacy graph input, ignored by linear question writes. */
  nextQuestionId?: string | null;
  /** @deprecated Opaque question configuration is no longer accepted. */
  config?: Record<string, unknown> | null;
}

export interface UpdatePageQuestionInput {
  creatorId: string;
  pageId: string;
  questionId: string;
  type?: QuestionType;
  prompt?: string;
  /** @deprecated Server owns order. */
  displayOrder?: number;
  /** @deprecated Legacy graph input, ignored by linear question writes. */
  endsJourney?: boolean;
  /** @deprecated Legacy graph input, ignored by linear question writes. */
  nextQuestionId?: string | null;
  config?: Record<string, unknown> | null;
  choices?: QuestionChoiceInput[];
  expectedContentVersion: number;
  confirmResponseDeletion: boolean;
}

export interface DeletePageQuestionInput {
  creatorId: string;
  pageId: string;
  questionId: string;
  expectedContentVersion: number;
  confirmResponseDeletion: boolean;
}

export interface ReorderPageQuestionsInput {
  creatorId: string;
  pageId: string;
  questionIds: string[];
  expectedContentVersion: number;
}

export type PageQuestionMutationResult =
  | {
      type: 'updated';
      question: PageQuestionRecord;
      contentVersion: number;
    }
  | { type: 'not_found' }
  | { type: 'invalid_state' }
  | { type: 'unsupported_capability' }
  | { type: 'stale'; currentContentVersion: number }
  | { type: 'invalid_branch' }
  | { type: 'invalid_choice' }
  | { type: 'key_taken' }
  | { type: 'question_limit' }
  | { type: 'response_impact'; affectedResponseCount: number };

export type DeletePageQuestionResult =
  | { type: 'deleted'; contentVersion: number }
  | { type: 'not_found' }
  | { type: 'invalid_state' }
  | { type: 'unsupported_capability' }
  | { type: 'stale'; currentContentVersion: number }
  | { type: 'invalid_branch' }
  | { type: 'invalid_choice' }
  | { type: 'response_impact'; affectedResponseCount: number };

export type ReorderPageQuestionsResult =
  | { type: 'reordered'; questionIds: string[]; contentVersion: number }
  | { type: 'not_found' }
  | { type: 'invalid_state' }
  | { type: 'unsupported_capability' }
  | { type: 'stale'; currentContentVersion: number }
  | { type: 'invalid_order' };

export interface PageQuestionsRepository {
  list(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageQuestionRecord[] | null>;
  create(input: CreatePageQuestionInput): Promise<PageQuestionMutationResult>;
  update(input: UpdatePageQuestionInput): Promise<PageQuestionMutationResult>;
  delete(input: DeletePageQuestionInput): Promise<DeletePageQuestionResult>;
  reorder(
    input: ReorderPageQuestionsInput,
  ): Promise<ReorderPageQuestionsResult>;
}
