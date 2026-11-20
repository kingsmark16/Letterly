import type { Prisma } from '@letterly/database';
import { lockPageBarrier } from './page-barrier';

function fixture(
  options: {
    pageDeleted?: boolean;
    creatorDeleted?: boolean;
    changedOwner?: boolean;
  } = {},
) {
  const order: string[] = [];
  const page = {
    id: '60000000-0000-4000-8000-000000000001',
    creatorId: options.changedOwner ? 'different' : 'z-creator',
    status: 'PUBLISHED',
    moderationStatus: 'ACTIVE',
    moderationVersion: 0,
    deletionRequestedAt: options.pageDeleted ? new Date() : null,
    expiresAt: null,
  };
  const tx = {
    page: {
      findUnique: jest.fn().mockResolvedValue({ creatorId: 'z-creator' }),
    },
    $queryRaw: jest.fn(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        if (strings.join('').includes('FROM "user"')) {
          const id = String(values[0]);
          order.push(`user:${id}`);
          return Promise.resolve([
            {
              id,
              role: id === 'a-admin' ? 'ADMIN' : 'CREATOR',
              moderationStatus: 'ACTIVE',
              deletionRequestedAt:
                id === 'z-creator' && options.creatorDeleted
                  ? new Date()
                  : null,
            },
          ]);
        }
        order.push('page');
        return Promise.resolve([page]);
      },
    ),
  };
  return { tx: tx as unknown as Prisma.TransactionClient, order, page };
}
describe('Shared deletion barrier lock', () => {
  it('locks distinct users in code unit order before the page and rechecks ownership', async () => {
    const { tx, order } = fixture();
    const page = await lockPageBarrier(
      tx,
      '60000000-0000-4000-8000-000000000001',
      { actorIds: ['a-admin', 'a-admin'], creatorId: 'z-creator' },
    );
    expect(page?.creatorId).toBe('z-creator');
    expect(order).toEqual(['user:a-admin', 'user:z-creator', 'page']);
    const changed = fixture({ changedOwner: true });
    expect(await lockPageBarrier(changed.tx, changed.page.id)).toBeNull();
  });
  it.each([{ pageDeleted: true }, { creatorDeleted: true }])(
    'rejects a current barrier %o after acquiring locks',
    async (flags) => {
      const { tx, page, order } = fixture(flags);
      expect(await lockPageBarrier(tx, page.id)).toBeNull();
      expect(order).toEqual(['user:z-creator', 'page']);
    },
  );
  it('permits internal cleanup to inspect a blocked target without clearing its barrier', async () => {
    const { tx, page } = fixture({ pageDeleted: true });
    expect(
      (await lockPageBarrier(tx, page.id, { allowDeletion: true }))
        ?.deletionRequestedAt,
    ).toBe(page.deletionRequestedAt);
  });
});
