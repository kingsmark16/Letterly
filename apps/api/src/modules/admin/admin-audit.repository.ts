import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient, Prisma } from '@letterly/database';
import type { AdminAuditListQuery, AdminAuditEvent } from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';

export const ADMIN_AUDIT_REPOSITORY = Symbol('ADMIN_AUDIT_REPOSITORY');

export interface AdminAuditCursorPosition {
  createdAt: Date;
  id: string;
}

export interface AdminAuditRepository {
  list(input: {
    query: AdminAuditListQuery;
    cursor: AdminAuditCursorPosition | null;
  }): Promise<{
    items: AdminAuditEvent[];
    nextPosition: AdminAuditCursorPosition | null;
  }>;
}

const auditSelect = {
  id: true,
  actorId: true,
  eventType: true,
  targetType: true,
  targetId: true,
  requestId: true,
  outcome: true,
  metadata: true,
  createdAt: true,
} as const satisfies Prisma.AuditEventSelect;

@Injectable()
export class PrismaAdminAuditRepository implements AdminAuditRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(input: {
    query: AdminAuditListQuery;
    cursor: AdminAuditCursorPosition | null;
  }): Promise<{
    items: AdminAuditEvent[];
    nextPosition: AdminAuditCursorPosition | null;
  }> {
    const where: Prisma.AuditEventWhereInput = {
      ...(input.query.targetType ? { targetType: input.query.targetType } : {}),
      ...(input.query.targetId ? { targetId: input.query.targetId } : {}),
      ...(input.query.actorId ? { actorId: input.query.actorId } : {}),
      ...(input.query.eventType ? { eventType: input.query.eventType } : {}),
      ...(input.cursor
        ? {
            OR: [
              { createdAt: { lt: input.cursor.createdAt } },
              {
                createdAt: input.cursor.createdAt,
                id: { lt: input.cursor.id },
              },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: input.query.size + 1,
      select: auditSelect,
    });
    const hasMore = rows.length > input.query.size;
    const visible = hasMore ? rows.slice(0, input.query.size) : rows;
    const last = visible.at(-1);
    return {
      items: visible.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        eventType: row.eventType,
        targetType: row.targetType,
        targetId: row.targetId,
        requestId: row.requestId,
        outcome: row.outcome,
        metadata:
          row.metadata &&
          typeof row.metadata === 'object' &&
          !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : null,
        createdAt: row.createdAt.toISOString(),
      })),
      nextPosition:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }
}
