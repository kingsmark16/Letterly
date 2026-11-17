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
import type { AdminCursorPosition } from './admin-cursor';

export const ADMIN_OPERATIONS_REPOSITORY = Symbol(
  'ADMIN_OPERATIONS_REPOSITORY',
);
export interface AdminReadPage<T> {
  items: T[];
  nextPosition: AdminCursorPosition | null;
}
export interface AdminOperationsRepository {
  creators(
    query: AdminCreatorListQuery | AdminCreatorSearch,
    cursor: AdminCursorPosition | null,
  ): Promise<AdminReadPage<AdminCreatorSummary>>;
  pages(
    query: AdminPageListQuery | AdminPageSearch,
    cursor: AdminCursorPosition | null,
  ): Promise<AdminReadPage<AdminPageRecord>>;
  page(pageId: string): Promise<AdminPageRecord | null>;
  appeals(
    query: AdminAppealListQuery,
    cursor: AdminCursorPosition | null,
  ): Promise<AdminReadPage<AdminAppealInboxItem>>;
  appeal(appealId: string): Promise<AdminAppealDetail | null>;
}
export class AdminRecordNotFoundError extends Error {
  constructor() {
    super('Administrator record not found');
  }
}
