import {
  draftListResponseSchema,
  pageLifecycleResponseSchema,
  ownerPageProjectionSchema,
  type OwnerPageProjection,
  type DraftListResponse,
  type PageLifecycleResponse,
} from '@letterly/contracts/pages';
import type { DraftSummary, OwnerPage, PageCursor } from '../domain/page.types';

export function toOwnerPageProjection(
  page: OwnerPage,
  appOrigin?: string,
): OwnerPageProjection {
  const projection = {
    id: page.id,
    slug: page.slug,
    canonicalUrl:
      page.status === 'PUBLISHED' && appOrigin
        ? new URL(
            `/p/${encodeURIComponent(page.displaySlug)}`,
            appOrigin,
          ).toString()
        : null,
    recipientLabel: page.content.recipientName.trim() || 'Untitled letter',
    status: page.status,
    contentVersion: page.contentVersion,
    content: page.content,
    settings: page.settings,
    template: page.template,
    images: (page.images ?? []).map((image) => ({
      imageId: image.imageId,
      state: image.state,
      attached: image.attached,
      sortOrder: image.sortOrder,
      mediaUrl: image.mediaUrl,
      caption: image.caption,
      failureCode: image.failureCode,
      expiresAt: image.expiresAt?.toISOString() ?? null,
    })),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };

  if (page.settings.responsesEnabled === undefined) {
    return projection as OwnerPageProjection;
  }

  return ownerPageProjectionSchema.parse(projection);
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

export function toPageLifecycleResponse(input: {
  page: OwnerPage;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  appOrigin: string;
}): PageLifecycleResponse {
  return pageLifecycleResponseSchema.parse({
    pageId: input.page.id,
    status: input.page.status,
    slug: input.page.displaySlug,
    publicUrl: new URL(
      `/p/${encodeURIComponent(input.page.displaySlug)}`,
      input.appOrigin,
    ).toString(),
    publishedAt: input.publishedAt?.toISOString() ?? null,
    unpublishedAt: input.unpublishedAt?.toISOString() ?? null,
    contentVersion: input.page.contentVersion,
    updatedAt: input.page.updatedAt.toISOString(),
  });
}
