import type { PageStatus } from '../domain/page.types';
import type { PageJourneyGraph } from '@letterly/templates';

export const PAGE_JOURNEYS_REPOSITORY = Symbol('PAGE_JOURNEYS_REPOSITORY');

export interface PageJourneyRevision {
  revisionNumber: number;
  maxDepth: number;
  graph: PageJourneyGraph;
}

export interface PageJourneyOwnerState {
  pageId: string;
  creatorId: string;
  status: PageStatus;
  contentVersion: number;
  template: {
    registryKey: string;
    version: number;
  };
  draft: PageJourneyRevision;
  publishedGraphVersion: number | null;
}

export interface PageJourneySaveInput {
  creatorId: string;
  pageId: string;
  expectedContentVersion: number;
  graph: PageJourneyGraph;
  maxDepth: number;
}

export type PageJourneySaveResult =
  | { type: 'updated'; state: PageJourneyOwnerState }
  | { type: 'not_found' }
  | {
      type: 'stale';
      currentContentVersion: number;
    }
  | { type: 'invalid_state' };

export interface PageJourneysRepository {
  findOwned(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageJourneyOwnerState | null>;
  save(input: PageJourneySaveInput): Promise<PageJourneySaveResult>;
}
