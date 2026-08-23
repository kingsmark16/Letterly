import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  chooseYourHeartTemplate,
  validatePageJourneyGraph,
  type PageJourneyGraph,
} from '@letterly/templates';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './page-journey-metrics';
import { PAGE_JOURNEYS_REPOSITORY } from './page-journeys.repository';
import type {
  PageJourneyOwnerState,
  PageJourneysRepository,
} from './page-journeys.repository';

export class PageJourneyNotFoundError extends Error {
  constructor() {
    super('Journey not found');
    this.name = 'PageJourneyNotFoundError';
  }
}

export class PageJourneyTemplateUnavailableError extends Error {
  constructor() {
    super('This template does not have a journey');
    this.name = 'PageJourneyTemplateUnavailableError';
  }
}

export class PageJourneyStaleVersionError extends Error {
  constructor(readonly currentContentVersion: number) {
    super('This page changed elsewhere');
    this.name = 'PageJourneyStaleVersionError';
  }
}

export class PageJourneyInvalidStateError extends Error {
  constructor() {
    super('This page cannot change its journey in its current state');
    this.name = 'PageJourneyInvalidStateError';
  }
}

export class PageJourneyValidationError extends Error {
  constructor(
    readonly issues: Array<{
      path: Array<string | number>;
      message: string;
    }>,
  ) {
    super('The journey graph is invalid');
    this.name = 'PageJourneyValidationError';
  }
}

@Injectable()
export class PageJourneyService {
  constructor(
    @Inject(PAGE_JOURNEYS_REPOSITORY)
    private readonly repository: PageJourneysRepository,
    @Optional()
    @Inject(PAGE_JOURNEY_METRICS)
    private readonly metrics?: PageJourneyMetrics,
  ) {}

  async getOwned(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageJourneyOwnerState> {
    const state = await this.repository.findOwned(input);
    if (!state) {
      throw new PageJourneyNotFoundError();
    }
    return state;
  }

  async save(input: {
    creatorId: string;
    pageId: string;
    expectedContentVersion: number;
    graph: PageJourneyGraph;
  }): Promise<PageJourneyOwnerState> {
    const validation = validatePageJourneyGraph(input.graph);
    this.metrics?.record({
      event: 'journey_graph_validation',
      templateKey: chooseYourHeartTemplate.renderer.key,
      outcome: validation.valid ? 'valid' : 'invalid',
      questionCount: validation.graph?.questions.length ?? 0,
      outcomeCount: validation.graph?.outcomes.length ?? 0,
      issueCount: validation.issues.length,
    });

    if (
      !validation.valid ||
      !validation.graph ||
      validation.maxDepth === undefined
    ) {
      throw new PageJourneyValidationError(validation.issues);
    }

    const result = await this.repository.save({
      ...input,
      graph: validation.graph,
      maxDepth: validation.maxDepth,
    });

    switch (result.type) {
      case 'updated':
        return result.state;
      case 'not_found':
        throw new PageJourneyNotFoundError();
      case 'stale':
        throw new PageJourneyStaleVersionError(result.currentContentVersion);
      case 'invalid_state':
        throw new PageJourneyInvalidStateError();
    }
  }
}
