import type { Prisma } from '@letterly/database';

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
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    creator: { moderationStatus: 'ACTIVE' },
    slugReservations: {
      some: { normalizedSlug, isCurrent: true },
    },
  };
}
