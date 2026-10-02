import type { Prisma } from '@letterly/database';
import type { CreateDraftInput } from '../../application/pages.repository';

export type DraftTransaction = Pick<
  Prisma.TransactionClient,
  | '$executeRaw'
  | 'pageJourney'
  | 'pageJourneyGraphRevision'
  | 'pageJourneyQuestion'
  | 'pageJourneyOutcome'
  | 'pageJourneyChoice'
>;

export interface PreparedDraftPersistence {
  content: CreateDraftInput['content'];
  settings: CreateDraftInput['settings'];
  beforePage: (transaction: DraftTransaction) => Promise<void>;
  afterPage: (transaction: DraftTransaction, pageId: string) => Promise<void>;
}

export interface TemplateDraftPersistenceAdapter {
  registryKey: string;
  version: number;
  prepare: (input: CreateDraftInput) => PreparedDraftPersistence;
}
