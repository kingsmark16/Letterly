// Repository unit tests isolate the shared lock protocol; its real behavior is
// covered by page-barrier.spec.ts and the PostgreSQL deletion/race suites.
jest.mock('../../src/infrastructure/database/page-barrier', () => ({
  databaseNow: jest.fn().mockResolvedValue(new Date('2026-09-10T02:00:00Z')),
  ownerPageBarrierWhere: {
    deletionRequestedAt: null,
    creator: { deletionRequestedAt: null },
  },
  lockPageBarrier: jest.fn(
    async (
      transaction: {
        $queryRaw?: (
          strings: TemplateStringsArray,
          ...values: unknown[]
        ) => Promise<unknown>;
      },
      pageId: string,
      options?: { creatorId?: string },
    ) => {
      if (transaction.$queryRaw)
        await transaction.$queryRaw`SELECT "id" FROM "Page" WHERE "id" = ${pageId} FOR UPDATE`;
      return {
        id: pageId,
        creatorId: options?.creatorId ?? 'creator-1',
        status: 'DRAFT',
        moderationStatus: 'ACTIVE',
        moderationVersion: 0,
        deletionRequestedAt: null,
        expiresAt: null,
        creator: {
          id: options?.creatorId ?? 'creator-1',
          role: 'CREATOR',
          moderationStatus: 'ACTIVE',
          deletionRequestedAt: null,
        },
      };
    },
  ),
  lockUsers: jest.fn((_transaction: unknown, ids: string[]) =>
    Promise.resolve(
      new Map(
        ids.map((id) => [
          id,
          {
            id,
            role: 'CREATOR',
            moderationStatus: 'ACTIVE',
            deletionRequestedAt: null,
          },
        ]),
      ),
    ),
  ),
  lockPageUsers: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  '../../src/modules/pages/infrastructure/media-processing-identity',
  () => ({
    processingInstanceId: '60000000-0000-4000-8000-000000000002',
    claimMediaProcessing: jest.fn().mockResolvedValue({
      attemptToken: '60000000-0000-4000-8000-000000000001',
      processingState: 'RUNNING',
      processingInstanceId: '60000000-0000-4000-8000-000000000002',
      processingHostIdentity: { platform: 'LOCAL' },
      processingStartedAt: new Date('2026-11-18T00:00:00Z'),
      settledAt: null,
      outputManifest: [],
      storageWriteState: 'NONE',
    }),
  }),
);
