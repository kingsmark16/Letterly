import { TransientPublicReadError } from '../application/transient-public-read.error';
jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPagePasswordRepository } from './prisma-page-password.repository';

const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const creatorId = 'creator-123';

describe('PrismaPagePasswordRepository', () => {
  it('updates only an owned page and preserves the private settings shape', async () => {
    const prisma = {
      page: {
        findFirst: jest.fn().mockResolvedValue({
          settings: {
            theme: 'romantic',
            fontStyle: 'handwritten',
            autoPlayMusic: false,
            music: null,
            responsesEnabled: false,
          },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaPagePasswordRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(
      repository.setOwnedPassword({
        creatorId,
        pageId,
        password: {
          ciphertext: 'ciphertext',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: '1',
          passwordVersion: 'password-1',
        },
      }),
    ).resolves.toBe('updated');

    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId },
      data: {
        settings: {
          theme: 'romantic',
          fontStyle: 'handwritten',
          autoPlayMusic: false,
          music: null,
          responsesEnabled: false,
          passwordProtection: {
            ciphertext: 'ciphertext',
            iv: 'iv',
            authTag: 'tag',
            keyVersion: '1',
            passwordVersion: 'password-1',
          },
        },
      },
    });
  });

  it('returns only a current published page password', async () => {
    const prisma = {
      page: {
        findFirst: jest.fn().mockResolvedValue({
          id: pageId,
          settings: {
            theme: 'romantic',
            fontStyle: 'handwritten',
            autoPlayMusic: false,
            music: null,
            responsesEnabled: false,
            passwordProtection: {
              ciphertext: 'ciphertext',
              iv: 'iv',
              authTag: 'tag',
              keyVersion: '1',
              passwordVersion: 'password-1',
            },
          },
        }),
      },
    };
    const repository = new PrismaPagePasswordRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(repository.findPublishedPassword('letter42')).resolves.toEqual(
      {
        pageId,
        password: {
          ciphertext: 'ciphertext',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: '1',
          passwordVersion: 'password-1',
        },
      },
    );
    expect(prisma.page.findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'letter42',
        status: 'PUBLISHED',
        moderationStatus: 'ACTIVE',
        creator: { moderationStatus: 'ACTIVE' },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: expect.any(Date) as Date } },
        ],
        slugReservations: {
          some: { normalizedSlug: 'letter42', isCurrent: true },
        },
      },
      select: { id: true, settings: true },
    });
  });
  it.each([
    Object.assign(new Error('Network reset'), { code: 'ECONNRESET' }),
    new Error(' CONNECTION TERMINATED UNEXPECTEDLY '),
    new Error('Wrapped driver failure', {
      cause: Object.assign(new Error('Database failure'), { code: '08006' }),
    }),
  ])(
    'translates recognized public password read failures and recovers the pool',
    async (original) => {
      const prisma = {
        page: { findFirst: jest.fn().mockRejectedValue(original) },
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $connect: jest.fn().mockResolvedValue(undefined),
      };
      const repository = new PrismaPagePasswordRepository(
        prisma as unknown as PrismaClient,
      );
      let failure: unknown;
      try {
        await repository.findPublishedPassword('letter');
      } catch (error: unknown) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(TransientPublicReadError);
      expect((failure as TransientPublicReadError).cause).toBe(original);
      expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
      expect(prisma.$connect).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves non transient public password failures without recovery', async () => {
    const original = new Error('Invalid projection');
    const prisma = {
      page: { findFirst: jest.fn().mockRejectedValue(original) },
      $disconnect: jest.fn(),
      $connect: jest.fn(),
    };
    const repository = new PrismaPagePasswordRepository(
      prisma as unknown as PrismaClient,
    );
    await expect(repository.findPublishedPassword('letter')).rejects.toBe(
      original,
    );
    expect(prisma.$disconnect).not.toHaveBeenCalled();
    expect(prisma.$connect).not.toHaveBeenCalled();
  });
});
