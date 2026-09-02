import { Inject, Injectable } from '@nestjs/common';
import { PAGE_QUESTIONS_REPOSITORY } from './page-questions.repository';
import type {
  CreatePageQuestionInput,
  DeletePageQuestionInput,
  PageQuestionMutationResult,
  PageQuestionsRepository,
  DeletePageQuestionResult,
  ReorderPageQuestionsInput,
  ReorderPageQuestionsResult,
  UpdatePageQuestionInput,
} from './page-questions.repository';

export class PageQuestionNotFoundError extends Error {
  constructor() {
    super('Question not found');
    this.name = 'PageQuestionNotFoundError';
  }
}

export class PageQuestionInvalidStateError extends Error {
  constructor() {
    super('This page cannot change questions in its current state');
    this.name = 'PageQuestionInvalidStateError';
  }
}

export class PageQuestionCapabilityUnavailableError extends Error {
  constructor() {
    super('This template does not support questions');
    this.name = 'PageQuestionCapabilityUnavailableError';
  }
}

export class PageQuestionStaleVersionError extends Error {
  constructor(readonly currentContentVersion: number) {
    super('This page changed elsewhere');
    this.name = 'PageQuestionStaleVersionError';
  }
}

/** @deprecated Kept for callers handling legacy graph records. */
export class InvalidQuestionBranchError extends Error {
  constructor() {
    super('The question branch is invalid');
    this.name = 'InvalidQuestionBranchError';
  }
}

export class PageQuestionKeyTakenError extends Error {
  constructor() {
    super('That question key is already in use');
    this.name = 'PageQuestionKeyTakenError';
  }
}

export class PageQuestionLimitReachedError extends Error {
  constructor() {
    super('This page can contain at most 100 questions');
    this.name = 'PageQuestionLimitReachedError';
  }
}

export class QuestionResponseImpactError extends Error {
  constructor(readonly affectedResponseCount: number) {
    super('This question change affects existing responses');
    this.name = 'QuestionResponseImpactError';
  }
}

function resolveMutation(
  result: PageQuestionMutationResult,
): Extract<PageQuestionMutationResult, { type: 'updated' }> {
  switch (result.type) {
    case 'updated':
      return result;
    case 'not_found':
      throw new PageQuestionNotFoundError();
    case 'invalid_state':
      throw new PageQuestionInvalidStateError();
    case 'unsupported_capability':
      throw new PageQuestionCapabilityUnavailableError();
    case 'stale':
      throw new PageQuestionStaleVersionError(result.currentContentVersion);
    case 'invalid_branch':
      throw new InvalidQuestionBranchError();
    case 'invalid_choice':
      throw new InvalidQuestionBranchError();
    case 'key_taken':
      throw new PageQuestionKeyTakenError();
    case 'question_limit':
      throw new PageQuestionLimitReachedError();
    case 'response_impact':
      throw new QuestionResponseImpactError(result.affectedResponseCount);
  }
}

function resolveDelete(
  result: DeletePageQuestionResult,
): Extract<DeletePageQuestionResult, { type: 'deleted' }> {
  switch (result.type) {
    case 'deleted':
      return result;
    case 'not_found':
      throw new PageQuestionNotFoundError();
    case 'invalid_state':
      throw new PageQuestionInvalidStateError();
    case 'unsupported_capability':
      throw new PageQuestionCapabilityUnavailableError();
    case 'stale':
      throw new PageQuestionStaleVersionError(result.currentContentVersion);
    case 'invalid_branch':
      throw new InvalidQuestionBranchError();
    case 'invalid_choice':
      throw new InvalidQuestionBranchError();
    case 'response_impact':
      throw new QuestionResponseImpactError(result.affectedResponseCount);
  }
}

function resolveReorder(
  result: ReorderPageQuestionsResult,
): Extract<ReorderPageQuestionsResult, { type: 'reordered' }> {
  switch (result.type) {
    case 'reordered':
      return result;
    case 'not_found':
      throw new PageQuestionNotFoundError();
    case 'invalid_state':
      throw new PageQuestionInvalidStateError();
    case 'unsupported_capability':
      throw new PageQuestionCapabilityUnavailableError();
    case 'stale':
      throw new PageQuestionStaleVersionError(result.currentContentVersion);
    case 'invalid_order':
      throw new InvalidQuestionOrderError();
  }
}

export class InvalidQuestionOrderError extends Error {
  constructor() {
    super('The question order is invalid');
    this.name = 'InvalidQuestionOrderError';
  }
}

@Injectable()
export class PageQuestionService {
  constructor(
    @Inject(PAGE_QUESTIONS_REPOSITORY)
    private readonly repository: PageQuestionsRepository,
  ) {}

  async create(input: CreatePageQuestionInput) {
    return resolveMutation(await this.repository.create(input));
  }

  async list(input: { creatorId: string; pageId: string }) {
    const result = await this.repository.list(input);
    if (!result) throw new PageQuestionNotFoundError();
    return result;
  }

  async update(input: UpdatePageQuestionInput) {
    return resolveMutation(await this.repository.update(input));
  }

  async delete(input: DeletePageQuestionInput) {
    return resolveDelete(await this.repository.delete(input));
  }

  async reorder(input: ReorderPageQuestionsInput) {
    return resolveReorder(await this.repository.reorder(input));
  }
}
