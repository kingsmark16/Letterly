import { publicPageAvailabilityWhere } from './public-availability';

describe('publicPageAvailabilityWhere', () => {
  it('requires publication, active moderation, active creator, current slug, and expiry', () => {
    const now = new Date('2026-08-24T00:00:00.000Z');

    expect(publicPageAvailabilityWhere('letter42', now)).toEqual({
      slug: 'letter42',
      status: 'PUBLISHED',
      moderationStatus: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      creator: { moderationStatus: 'ACTIVE' },
      slugReservations: {
        some: { normalizedSlug: 'letter42', isCurrent: true },
      },
    });
  });
});
