import type { DraftSummary, OwnerPage, PageCursor } from '../domain/page.types';

export const PAGES_REPOSITORY = Symbol('PAGES_REPOSITORY');

export interface CreateDraftInput {
  creatorId: string;
  templateVersionId: string;
  content: OwnerPage['content'];
  settings: OwnerPage['settings'];
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
  expectedContentVersion: number;
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
    };

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
}
