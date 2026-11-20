import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@letterly/database';
import type {
  AdminCreatorListQuery,
  AdminCreatorSearch,
  AdminCreatorSummary,
  AdminPageListQuery,
  AdminPageSearch,
  AdminPageRecord,
  AdminAppealListQuery,
  AdminAppealInboxItem,
  AdminAppealDetail,
} from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import type { AdminCursorPosition } from '../application/admin-cursor';
import type {
  AdminOperationsRepository,
  AdminReadPage,
} from '../application/admin-operations.repository';

const creatorSelect = {
  deletionRequestedAt: true,
  id: true,
  name: true,
  email: true,
  role: true,
  moderationStatus: true,
  moderationVersion: true,
  createdAt: true,
  updatedAt: true,
  disabledAt: true,
  _count: { select: { pages: true } },
} as const satisfies Prisma.UserSelect;
const pageSelect = {
  deletionRequestedAt: true,
  creator: { select: { deletionRequestedAt: true } },
  id: true,
  creatorId: true,
  slug: true,
  status: true,
  moderationStatus: true,
  moderationVersion: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  disabledAt: true,
  templateVersion: {
    select: { version: true, template: { select: { key: true } } },
  },
  _count: { select: { reports: true } },
} as const satisfies Prisma.PageSelect;
const appealSelect = {
  id: true,
  status: true,
  moderationVersion: true,
  originalActionId: true,
  reasonCode: true,
  createdAt: true,
  resolvedAt: true,
  originalAction: { select: { targetType: true, targetId: true } },
} as const satisfies Prisma.AppealSelect;
type PageRow = Prisma.PageGetPayload<{ select: typeof pageSelect }>;
type AppealRow = Prisma.AppealGetPayload<{ select: typeof appealSelect }>;
const order = [{ createdAt: 'desc' }, { id: 'desc' }] as const;
function before(position: AdminCursorPosition | null) {
  return position
    ? {
        OR: [
          { createdAt: { lt: position.createdAt } },
          { createdAt: position.createdAt, id: { lt: position.id } },
        ],
      }
    : {};
}
function dates(query: { createdFrom?: string; createdTo?: string }) {
  return query.createdFrom || query.createdTo
    ? {
        createdAt: {
          ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
          ...(query.createdTo ? { lt: new Date(query.createdTo) } : {}),
        },
      }
    : {};
}
function result<T extends { id: string; createdAt: Date }, U>(
  rows: T[],
  size: number,
  map: (row: T) => U,
): AdminReadPage<U> {
  const visible = rows.slice(0, size);
  const last = visible.at(-1);
  return {
    items: visible.map(map),
    nextPosition:
      rows.length > size && last
        ? { id: last.id, createdAt: last.createdAt }
        : null,
  };
}
function pageRecord(
  row: PageRow,
  jobId: string | null = null,
): AdminPageRecord {
  return {
    id: row.id,
    creatorId: row.creatorId,
    slug: row.slug,
    templateKey: row.templateVersion.template.key,
    templateVersion: row.templateVersion.version,
    status: row.status,
    moderationStatus: row.moderationStatus,
    moderationVersion: row.moderationVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    reportCount: row._count.reports,
    deletionRequestedAt:
      (
        row.deletionRequestedAt ?? row.creator.deletionRequestedAt
      )?.toISOString() ?? null,
    deletionJobId: jobId,
  };
}
function appealRecord(row: AppealRow): AdminAppealInboxItem {
  return {
    id: row.id,
    status: row.status,
    moderationVersion: row.moderationVersion,
    originalActionId: row.originalActionId,
    targetType: row.originalAction.targetType,
    targetId: row.originalAction.targetId,
    reasonCode: row.reasonCode,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class PrismaAdminOperationsRepository implements AdminOperationsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}
  async creators(
    query: AdminCreatorListQuery | AdminCreatorSearch,
    cursor: AdminCursorPosition | null,
  ) {
    let searchWhere: Prisma.UserWhereInput = {};
    if ('field' in query) {
      if (query.field === 'id') searchWhere = { id: query.value };
      else {
        const conditions: Prisma.Sql[] = [];
        if (query.field === 'email')
          conditions.push(
            Prisma.sql`lower("email" COLLATE "C") = ${query.value} COLLATE "C"`,
          );
        else {
          const escaped = query.value.replace(/[\\%_]/g, '\\$&');
          conditions.push(
            Prisma.sql`lower("name") LIKE lower(${escaped}) || '%'`,
          );
        }
        if (query.moderationStatus)
          conditions.push(
            Prisma.sql`"moderationStatus"::text = ${query.moderationStatus}`,
          );
        if (query.createdFrom)
          conditions.push(
            Prisma.sql`"createdAt" >= ${new Date(query.createdFrom)}`,
          );
        if (query.createdTo)
          conditions.push(
            Prisma.sql`"createdAt" < ${new Date(query.createdTo)}`,
          );
        if (cursor)
          conditions.push(
            Prisma.sql`("createdAt", "id") < (${cursor.createdAt}, ${cursor.id})`,
          );
        const ids = await this.prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT "id" FROM "user" WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY "createdAt" DESC, "id" DESC LIMIT ${query.size + 1}`,
        );
        searchWhere = { id: { in: ids.map((row) => row.id) } };
      }
    }
    const rows = await this.prisma.user.findMany({
      where: {
        AND: [
          searchWhere,
          before(cursor),
          dates(query),
          ...(query.moderationStatus
            ? [{ moderationStatus: query.moderationStatus }]
            : []),
        ],
      },
      select: creatorSelect,
      orderBy: [...order],
      take: query.size + 1,
    });
    const pending = rows
      .filter((row) => row.deletionRequestedAt)
      .map((row) => row.id);
    const jobs = pending.length
      ? await this.prisma.deletionJob.findMany({
          where: { targetType: 'CREATOR', targetId: { in: pending } },
          select: { id: true, targetId: true },
          take: 101,
        })
      : [];
    const ids = new Map(jobs.map((job) => [job.targetId, job.id]));
    return result(rows, query.size, (row): AdminCreatorSummary => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      moderationStatus: row.moderationStatus,
      moderationVersion: row.moderationVersion,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      disabledAt: row.disabledAt?.toISOString() ?? null,
      pageCount: row._count.pages,
      deletionRequestedAt: row.deletionRequestedAt?.toISOString() ?? null,
      deletionJobId: ids.get(row.id) ?? null,
    }));
  }
  async pages(
    query: AdminPageListQuery | AdminPageSearch,
    cursor: AdminCursorPosition | null,
  ) {
    const rows = await this.prisma.page.findMany({
      where: {
        AND: [
          before(cursor),
          dates(query),
          { creator: { role: 'CREATOR' } },
          ...(query.creatorId ? [{ creatorId: query.creatorId }] : []),
          ...(query.status ? [{ status: query.status }] : []),
          ...(query.moderationStatus
            ? [{ moderationStatus: query.moderationStatus }]
            : []),
          ...(query.templateKey
            ? [{ templateVersion: { template: { key: query.templateKey } } }]
            : []),
          ...('field' in query
            ? [
                query.field === 'id'
                  ? { id: query.value }
                  : { slug: query.value },
              ]
            : []),
        ],
      },
      select: pageSelect,
      orderBy: [...order],
      take: query.size + 1,
    });
    const jobs = rows.some(
      (row) => row.deletionRequestedAt || row.creator.deletionRequestedAt,
    )
      ? await this.prisma.deletionJob.findMany({
          where: {
            targetType: 'PAGE',
            targetId: {
              in: rows
                .filter(
                  (row) =>
                    row.deletionRequestedAt || row.creator.deletionRequestedAt,
                )
                .map((row) => row.id),
            },
          },
          select: { id: true, targetId: true },
          take: 101,
        })
      : [];
    const ids = new Map(jobs.map((job) => [job.targetId, job.id]));
    return result(rows, query.size, (row) =>
      pageRecord(row, ids.get(row.id) ?? null),
    );
  }
  async page(id: string) {
    const row = await this.prisma.page.findFirst({
      where: { id, creator: { role: 'CREATOR' } },
      select: pageSelect,
    });
    if (!row) return null;
    const job =
      row.deletionRequestedAt || row.creator.deletionRequestedAt
        ? await this.prisma.deletionJob.findUnique({
            where: {
              targetType_targetId: { targetType: 'PAGE', targetId: row.id },
            },
            select: { id: true },
          })
        : null;
    const parent =
      !job && row.creator.deletionRequestedAt
        ? await this.prisma.deletionJob.findUnique({
            where: {
              targetType_targetId: {
                targetType: 'CREATOR',
                targetId: row.creatorId,
              },
            },
            select: { id: true },
          })
        : null;
    return pageRecord(row, job?.id ?? parent?.id ?? null);
  }
  async appeals(
    query: AdminAppealListQuery,
    cursor: AdminCursorPosition | null,
  ) {
    const rows = await this.prisma.appeal.findMany({
      where: {
        ...before(cursor),
        ...(query.status ? { status: query.status } : {}),
        ...(query.targetType
          ? {
              originalAction: {
                targetType: query.targetType,
                ...(query.targetId ? { targetId: query.targetId } : {}),
              },
            }
          : {}),
      },
      select: appealSelect,
      orderBy: [...order],
      take: query.size + 1,
    });
    return result(rows, query.size, appealRecord);
  }
  async appeal(id: string): Promise<AdminAppealDetail | null> {
    const row = await this.prisma.appeal.findUnique({
      where: { id },
      select: {
        ...appealSelect,
        externalReference: true,
        updatedAt: true,
        resolvedById: true,
        actions: {
          where: { actionType: { in: ['APPEAL_ACCEPT', 'APPEAL_REJECT'] } },
          orderBy: [...order],
          take: 1,
          select: { reasonCode: true, note: true },
        },
      },
    });
    if (!row) return null;
    const decision = row.actions[0];
    return {
      ...appealRecord(row),
      externalReference: row.externalReference,
      updatedAt: row.updatedAt.toISOString(),
      resolvedById: row.resolvedById,
      resolutionReasonCode: decision?.reasonCode ?? null,
      resolutionNote: decision?.note ?? null,
    };
  }
}
