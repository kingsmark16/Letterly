import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import type { AdminAccessRepository } from '../application/admin-access.repository';

@Injectable()
export class PrismaAdminAccessRepository implements AdminAccessRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  findUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, moderationStatus: true },
    });
  }
}
