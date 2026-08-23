import type {
  DraftSummary,
  OwnerPage,
  PageCursor,
  PublicPage,
} from '../domain/page.types';
import type { PageJourneyGraph } from '@letterly/templates';

export const PAGES_REPOSITORY = Symbol('PAGES_REPOSITORY');

export interface CreateDraftInput {
  creatorId: string;
  templateVersionId: string;
  content: OwnerPage['content'];
  settings: OwnerPage['settings'];
  journey?: {
    graph: PageJourneyGraph;
    maxDepth: number;
  };
}

export interface ListDraftsInput {
  creatorId: string;
  size: number;
  cursor: PageCursor | null;
}

export interface ListDraftsResult {
  items: DraftSummary[];
  nextCursor: PageCursor | null;
}

export interface UpdateDraftInput {
  creatorId: string;
  pageId: string;
  recipientName: string;
  mainMessage: string;
  responsesEnabled?: boolean;
  expectedContentVersion: number;
  images?: Array<{
    imageId: string;
    sortOrder: number;
    caption?: string;
  }>;
}

export type UpdateDraftResult =
  | {
      type: 'updated';
      page: OwnerPage;
    }
  | {
      type: 'not_found';
    }
  | {
      type: 'stale';
      currentContentVersion: number;
      currentUpdatedAt: Date;
    }
  | {
      type: 'invalid_image';
    }
  | {
      type: 'image_limit';
    };

export interface PublishPageInput {
  creatorId: string;
  pageId: string;
  expectedContentVersion: number;
  customSlug: string | null;
}

export interface UnpublishPageInput {
  creatorId: string;
  pageId: string;
}

export interface ArchivePageInput {
  creatorId: string;
  pageId: string;
}

export interface RestorePageInput {
  creatorId: string;
  pageId: string;
}

export interface ChangePublishedSlugInput {
  creatorId: string;
  pageId: string;
  customSlug: string;
}

export type PageLifecycleMutationResult =
  | {
      type: 'updated';
      page: OwnerPage;
      publishedAt: Date | null;
      unpublishedAt: Date | null;
    }
  | { type: 'not_found' }
  | { type: 'invalid_state' }
  | { type: 'slug_already_taken' }
  | { type: 'slug_allocation_failed' };

export interface PagesRepository {
  createDraft(input: CreateDraftInput): Promise<OwnerPage>;
  listDrafts(input: ListDraftsInput): Promise<ListDraftsResult>;
  findOwnedPage(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerPage | null>;
  updateDraft(input: UpdateDraftInput): Promise<UpdateDraftResult>;
  deleteOwnedPage(input: {
    creatorId: string;
    pageId: string;
  }): Promise<'deleted' | 'not_found'>;
  publishPage(input: PublishPageInput): Promise<PageLifecycleMutationResult>;
  unpublishPage(
    input: UnpublishPageInput,
  ): Promise<PageLifecycleMutationResult>;
  archivePage(input: ArchivePageInput): Promise<PageLifecycleMutationResult>;
  restorePage(input: RestorePageInput): Promise<PageLifecycleMutationResult>;
  changePublishedSlug(
    input: ChangePublishedSlugInput,
  ): Promise<PageLifecycleMutationResult>;
  findPublicPageBySlug(normalizedSlug: string): Promise<PublicPage | null>;
}
