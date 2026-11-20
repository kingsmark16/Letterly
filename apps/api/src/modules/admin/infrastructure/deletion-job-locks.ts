import type { Prisma } from '@letterly/database';
import {
  lockPageBarrier,
  lockUsers,
} from '../../../infrastructure/database/page-barrier';

type Tx = Prisma.TransactionClient;
type Job = Prisma.DeletionJobGetPayload<Record<string, never>>;

export async function lockDeletionJob(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${id}::uuid FOR UPDATE`;
  return tx.deletionJob.findUnique({ where: { id } });
}

export async function lockDeletionPageScope(
  tx: Tx,
  source: Job,
  actorIds: string[] = [],
) {
  const attached = source.parentJobId
    ? await tx.deletionJob.findUnique({ where: { id: source.parentJobId } })
    : null;
  const page = source.detachedPage
    ? null
    : await lockPageBarrier(tx, source.targetId, {
        actorIds,
        allowDeletion: true,
      });
  const creatorId = source.detachedPage ? attached?.targetId : page?.creatorId;
  const users =
    source.detachedPage || !page
      ? await lockUsers(tx, [...actorIds, ...(creatorId ? [creatorId] : [])])
      : null;
  const creator =
    page?.creator ?? (creatorId ? users?.get(creatorId) : undefined);
  const potential = creator?.deletionRequestedAt
    ? await tx.deletionJob.findUnique({
        where: {
          targetType_targetId: { targetType: 'CREATOR', targetId: creator.id },
        },
      })
    : null;
  const parentId = source.parentJobId ?? potential?.id;
  const parent = parentId ? await lockDeletionJob(tx, parentId) : null;
  const job = await lockDeletionJob(tx, source.id);
  if (!job || (job.parentJobId && job.parentJobId !== parent?.id)) {
    return { job: null, page, parent, valid: false };
  }
  const parentValid =
    !parentId ||
    (parent?.targetType === 'CREATOR' &&
      parent.targetId === creator?.id &&
      parent.state !== 'COMPLETED' &&
      !!creator?.deletionRequestedAt);
  if (!job.detachedPage)
    return {
      job,
      page,
      parent,
      valid: !!(
        page &&
        parentValid &&
        (page.deletionRequestedAt || creator?.deletionRequestedAt)
      ),
    };
  const present = await tx.page.findUnique({
    where: { id: job.targetId },
    select: { id: true },
  });
  const mismatchedGrant = creatorId
    ? await tx.pageUploadGrant.findFirst({
        where: {
          pageId: job.targetId,
          OR: [{ creatorId: null }, { creatorId: { not: creatorId } }],
        },
        select: { id: true },
      })
    : null;
  return {
    job,
    page: null,
    parent,
    valid: !!(
      parentValid &&
      parent &&
      job.parentJobId &&
      !present &&
      !mismatchedGrant
    ),
  };
}
