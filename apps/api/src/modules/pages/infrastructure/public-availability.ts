import type { Prisma } from '@letterly/database';
import { lockPageBarrier } from '../../../infrastructure/database/page-barrier';

export async function lockPublicPage(
  transaction: Prisma.TransactionClient,
  slug: string,
) {
  const discovered = await transaction.page.findFirst({
    where: publicPageAvailabilityWhere(slug),
    select: { id: true },
  });
  if (!discovered || !(await lockPageBarrier(transaction, discovered.id)))
    return null;
  return transaction.page.findFirst({
    where: publicPageAvailabilityWhere(slug),
    select: { id: true },
  });
}

/**
 * The one page scope used by anonymous public operations.
 * Password and unlock checks remain separate from this publication scope.
 */
export function publicPageAvailabilityWhere(
  normalizedSlug: string,
  now: Date = new Date(),
): Prisma.PageWhereInput {
  return {
    slug: normalizedSlug,
    status: 'PUBLISHED',
    moderationStatus: 'ACTIVE',
    deletionRequestedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    creator: { moderationStatus: 'ACTIVE', deletionRequestedAt: null },
    slugReservations: {
      some: { normalizedSlug, isCurrent: true },
    },
  };
}
