export const PAGE_QUESTIONS_REPOSITORY = Symbol('PAGE_QUESTIONS_REPOSITORY');

export type QuestionType = 'CHOICE' | 'PLAIN_MESSAGE';

export interface QuestionChoiceInput {
  key: string;
  label: string;
  displayOrder: number;
  creatorMessage?: string;
  endsJourney?: boolean;
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
  endsJourney: boolean;
  nextQuestionId: string | null;
  choices: Array<{
    id: string;
    key: string;
    label: string;
    displayOrder: number;
    creatorMessage: string | null;
    endsJourney: boolean;
    nextQuestionId: string | null;
  }>;
}

export interface CreatePageQuestionInput {
  creatorId: string;
  pageId: string;
  key: string;
  type: QuestionType;
  prompt: string;
  displayOrder: number;
  config?: Record<string, unknown> | null;
  endsJourney?: boolean;
  nextQuestionId?: string | null;
  choices?: QuestionChoiceInput[];
}

export interface UpdatePageQuestionInput {
  creatorId: string;
  pageId: string;
  questionId: string;
  type?: QuestionType;
  prompt?: string;
  displayOrder?: number;
  config?: Record<string, unknown> | null;
  endsJourney?: boolean;
  nextQuestionId?: string | null;
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
  | { type: 'key_taken' }
  | { type: 'question_referenced' }
  | { type: 'response_impact'; affectedResponseCount: number };

export type DeletePageQuestionResult =
  | { type: 'deleted'; contentVersion: number }
  | { type: 'not_found' }
  | { type: 'invalid_state' }
  | { type: 'unsupported_capability' }
  | { type: 'stale'; currentContentVersion: number }
  | { type: 'invalid_branch' }
  | { type: 'question_referenced' }
  | { type: 'response_impact'; affectedResponseCount: number };

export type ReorderPageQuestionsResult =
  | { type: 'reordered'; contentVersion: number }
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
