import type { Prisma } from '@letterly/database';
import {
  lockPageBarrier,
  lockUsers,
} from '../../../infrastructure/database/page-barrier';
import { AdminDeletionError } from '../application/admin-deletions.repository';

export async function lockModerationBarrier(
  tx: Prisma.TransactionClient,
  actorId: string,
  kind: 'PAGE' | 'USER' | 'REPORT' | 'APPEAL' | 'ACTION',
  id: string,
) {
  let pageId: string | undefined;
  let userId: string | undefined;
  if (kind === 'PAGE') pageId = id;
  else if (kind === 'USER') userId = id;
  else if (kind === 'REPORT')
    pageId = (
      await tx.pageReport.findUnique({
        where: { id },
        select: { pageId: true },
      })
    )?.pageId;
  else {
    const actionId =
      kind === 'ACTION'
        ? id
        : (
            await tx.appeal.findUnique({
              where: { id },
              select: { originalActionId: true },
            })
          )?.originalActionId;
    if (actionId) {
      const action = await tx.moderationAction.findUnique({
        where: { id: actionId },
        select: {
          pageId: true,
          userId: true,
          targetType: true,
          targetId: true,
          report: { select: { pageId: true } },
        },
      });
      pageId =
        action?.pageId ??
        action?.report?.pageId ??
        (action?.targetType === 'PAGE' ? action.targetId : undefined);
      userId =
        action?.userId ??
        (action?.targetType === 'USER' ? action.targetId : undefined);
    }
  }
  if (pageId) {
    const page = await lockPageBarrier(tx, pageId, {
      actorIds: [actorId],
      allowDeletion: true,
    });
    if (!page) throw new AdminDeletionError('NOT_FOUND');
    if (page.deletionRequestedAt || page.creator.deletionRequestedAt)
      throw new AdminDeletionError('DELETION_IN_PROGRESS');
  } else {
    const users = await lockUsers(tx, [actorId, ...(userId ? [userId] : [])]);
    if (userId && users.get(userId)?.deletionRequestedAt)
      throw new AdminDeletionError('DELETION_IN_PROGRESS');
  }
}
