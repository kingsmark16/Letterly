import { Prisma } from '@letterly/database';

export async function databaseNow(transaction: Prisma.TransactionClient) {
  return (
    await transaction.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`
  )[0]!.now;
}

export interface LockedCreator {
  id: string;
  role: 'CREATOR' | 'ADMIN';
  moderationStatus: 'ACTIVE' | 'DISABLED';
  deletionRequestedAt: Date | null;
}
export interface LockedPage {
  id: string;
  creatorId: string;
  status: string;
  moderationStatus: 'ACTIVE' | 'DISABLED';
  moderationVersion: number;
  deletionRequestedAt: Date | null;
  creator: LockedCreator;
  expiresAt: Date | null;
}

export async function lockUsers(
  transaction: Prisma.TransactionClient,
  ids: string[],
) {
  const rows = new Map<string, LockedCreator>();
  for (const id of [...new Set(ids)].sort()) {
    const users = await transaction.$queryRaw<LockedCreator[]>`
      SELECT "id", "role", "moderationStatus", "deletionRequestedAt"
      FROM "user" WHERE "id" = ${id} FOR UPDATE`;
    if (users[0]) rows.set(id, users[0]);
  }
  return rows;
}

/** Discover ownership, lock users before the page, then recheck the relationship. */
export async function lockPageBarrier(
  transaction: Prisma.TransactionClient,
  pageId: string,
  options: {
    creatorId?: string;
    actorIds?: string[];
    allowDeletion?: boolean;
  } = {},
): Promise<LockedPage | null> {
  const discovered = await transaction.page.findUnique({
    where: { id: pageId },
    select: { creatorId: true },
  });
  if (
    !discovered ||
    (options.creatorId && discovered.creatorId !== options.creatorId)
  )
    return null;
  const users = await lockUsers(transaction, [
    discovered.creatorId,
    ...(options.actorIds ?? []),
  ]);
  const creator = users.get(discovered.creatorId);
  if (!creator) return null;
  const rows = await transaction.$queryRaw<Omit<LockedPage, 'creator'>[]>`
    SELECT "id", "creatorId", "status", "moderationStatus", "moderationVersion", "deletionRequestedAt", "expiresAt"
    FROM "Page" WHERE "id" = ${pageId}::uuid FOR UPDATE`;
  const page = rows[0];
  if (!page || page.creatorId !== creator.id) return null;
  if (
    !options.allowDeletion &&
    (page.deletionRequestedAt || creator.deletionRequestedAt)
  )
    return null;
  return { ...page, creator };
}

export async function lockPageUsers(
  transaction: Prisma.TransactionClient,
  pageIds: string[],
) {
  const pages = await transaction.page.findMany({
    where: { id: { in: pageIds } },
    select: { creatorId: true },
  });
  await lockUsers(
    transaction,
    pages.map((page) => page.creatorId),
  );
}

export const ownerPageBarrierWhere = {
  deletionRequestedAt: null,
  creator: { deletionRequestedAt: null },
} satisfies Prisma.PageWhereInput;
