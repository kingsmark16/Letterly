import type { Prisma } from '@letterly/database';

export type PublicationTransaction = Pick<
  Prisma.TransactionClient,
  '$queryRaw' | 'pageJourney'
>;

export interface PreparedTemplatePublication {
  incrementsContentVersion: boolean;
  commit: () => Promise<void>;
}

export interface TemplatePublicationAdapter {
  registryKey: string;
  version: number;
  prepare: (
    transaction: PublicationTransaction,
    pageId: string,
  ) => Promise<PreparedTemplatePublication | null>;
}
