import { Inject, Injectable } from '@nestjs/common';
import { PAGE_QUESTIONS_REPOSITORY } from './page-questions.repository';
import type {
  CreatePageQuestionInput,
  DeletePageQuestionInput,
  PageQuestionMutationResult,
  PageQuestionsRepository,
  DeletePageQuestionResult,
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

export class PageQuestionReferencedError extends Error {
  constructor() {
    super('This question is used by another answer');
    this.name = 'PageQuestionReferencedError';
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
    case 'key_taken':
      throw new PageQuestionKeyTakenError();
    case 'question_referenced':
      throw new PageQuestionReferencedError();
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
    case 'question_referenced':
      throw new PageQuestionReferencedError();
    case 'response_impact':
      throw new QuestionResponseImpactError(result.affectedResponseCount);
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
}
