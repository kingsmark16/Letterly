import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';

export const ADMIN_BOOTSTRAP_REPOSITORY = Symbol('ADMIN_BOOTSTRAP_REPOSITORY');

export type AdminBootstrapResult =
  | { type: 'promoted'; userId: string }
  | { type: 'already_admin'; userId: string }
  | { type: 'not_found' }
  | { type: 'disabled' };

export interface AdminBootstrapRepository {
  promoteUser(input: {
    userId: string;
    requestId: string;
  }): Promise<AdminBootstrapResult>;
}

@Injectable()
export class PrismaAdminBootstrapRepository implements AdminBootstrapRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async promoteUser(input: {
    userId: string;
    requestId: string;
  }): Promise<AdminBootstrapResult> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true, moderationStatus: true },
      });

      if (!user) {
        return { type: 'not_found' as const };
      }
      if (user.moderationStatus === 'DISABLED') {
        return { type: 'disabled' as const };
      }
      if (user.role === 'ADMIN') {
        return { type: 'already_admin' as const, userId: user.id };
      }

      await transaction.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
      await transaction.auditEvent.create({
        data: {
          eventType: 'ADMIN_BOOTSTRAPPED',
          targetType: 'USER',
          targetId: user.id,
          requestId: input.requestId,
          outcome: 'SUCCESS',
          metadata: { operation: 'admin_bootstrap' },
        },
      });

      return { type: 'promoted' as const, userId: user.id };
    });
  }
}
