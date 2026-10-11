import type { PrismaClient } from '@letterly/database';
import { PrismaAdminAccessRepository } from './prisma-admin-access.repository';

describe('PrismaAdminAccessRepository', () => {
  it('queries only current role and moderation status for the authenticated user ID', async () => {
    const user = { role: 'ADMIN', moderationStatus: 'ACTIVE' };
    const findUnique = jest.fn().mockResolvedValue(user);
    const repository = new PrismaAdminAccessRepository({
      user: { findUnique },
    } as unknown as PrismaClient);
    await expect(repository.findUser('user-1')).resolves.toBe(user);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true, moderationStatus: true },
    });
  });
});
