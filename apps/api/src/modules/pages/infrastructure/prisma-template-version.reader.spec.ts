jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaTemplateVersionReader } from './prisma-template-version.reader';

describe('PrismaTemplateVersionReader eligibility and retention', () => {
  const prisma = {
    templateVersion: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  const reader = new PrismaTemplateVersionReader(
    prisma as unknown as PrismaClient,
  );
  const pinnedV1 = {
    id: 'retained-v1-id',
    registryKey: 'fixture.letter',
    version: 1,
  };

  beforeEach(() => jest.resetAllMocks());

  it('requires the requested version, family, and category to be active for creation', async () => {
    prisma.templateVersion.findFirst.mockResolvedValue(null);
    await expect(reader.findActiveById(pinnedV1.id)).resolves.toBeNull();
    expect(prisma.templateVersion.findFirst).toHaveBeenCalledWith({
      where: {
        id: pinnedV1.id,
        status: 'ACTIVE',
        template: {
          is: { status: 'ACTIVE', category: { is: { status: 'ACTIVE' } } },
        },
      },
      select: { id: true, version: true, registryKey: true },
    });
    expect(prisma.templateVersion.findUnique).not.toHaveBeenCalled();
  });

  it('reads a saved version by ID without applying creation eligibility or latest selection', async () => {
    prisma.templateVersion.findUnique.mockResolvedValue(pinnedV1);
    await expect(reader.findById(pinnedV1.id)).resolves.toEqual(pinnedV1);
    expect(prisma.templateVersion.findUnique).toHaveBeenCalledWith({
      where: { id: pinnedV1.id },
      select: { id: true, version: true, registryKey: true },
    });
    expect(prisma.templateVersion.findFirst).not.toHaveBeenCalled();
  });

  it('returns missing saved identity rather than looking up another version', async () => {
    prisma.templateVersion.findUnique.mockResolvedValue(null);
    await expect(reader.findById('missing')).resolves.toBeNull();
    expect(prisma.templateVersion.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.templateVersion.findFirst).not.toHaveBeenCalled();
  });

  it.each(['findActiveById', 'findById'] as const)(
    'propagates a %s database failure without substituting another version',
    async (method) => {
      const error = new Error('isolated database failure');
      prisma.templateVersion.findFirst.mockRejectedValue(error);
      prisma.templateVersion.findUnique.mockRejectedValue(error);
      await expect(reader[method](pinnedV1.id)).rejects.toBe(error);
      expect(
        prisma.templateVersion.findFirst.mock.calls.length +
          prisma.templateVersion.findUnique.mock.calls.length,
      ).toBe(1);
    },
  );
});
