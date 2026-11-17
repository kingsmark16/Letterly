import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import type { AdminCreatorDetail } from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import type { AdminCreatorsRepository } from '../application/admin-creators.repository';

@Injectable()
export class PrismaAdminCreatorsRepository implements AdminCreatorsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findCreator(creatorId: string): Promise<AdminCreatorDetail | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        moderationStatus: true,
        createdAt: true,
        updatedAt: true,
        disabledAt: true,
        disabledReason: true,
        moderationVersion: true,
        _count: { select: { pages: true } },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      moderationStatus: user.moderationStatus,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      disabledAt: user.disabledAt?.toISOString() ?? null,
      disabledReason: user.disabledReason,
      moderationVersion: user.moderationVersion,
      pageCount: user._count.pages,
      deletionRequestedAt: null,
      deletionJobId: null,
    };
  }
}
