import {
  draftListResponseSchema,
  ownerPageProjectionSchema,
  type OwnerPageProjection,
  type DraftListResponse,
} from '@letterly/contracts/pages';
import type { DraftSummary, OwnerPage, PageCursor } from '../domain/page.types';

export function toOwnerPageProjection(page: OwnerPage): OwnerPageProjection {
  return ownerPageProjectionSchema.parse({
    id: page.id,
    slug: page.slug,
    recipientLabel: page.content.recipientName.trim() || 'Untitled letter',
    status: page.status,
    contentVersion: page.contentVersion,
    content: page.content,
    settings: page.settings,
    template: page.template,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  });
}

export function toDraftListResponse(
  items: DraftSummary[],
  nextCursor: string | null,
): DraftListResponse {
  return draftListResponseSchema.parse({
    items: items.map((item) => ({
      id: item.id,
      recipientLabel: item.recipientLabel,
      status: item.status,
      contentVersion: item.contentVersion,
      template: item.template,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor,
  });
}

export function toPageCursorPayload(cursor: PageCursor): {
  version: 1;
  updatedAt: string;
  id: string;
} {
  return {
    version: 1,
    updatedAt: cursor.updatedAt.toISOString(),
    id: cursor.id,
  };
}
