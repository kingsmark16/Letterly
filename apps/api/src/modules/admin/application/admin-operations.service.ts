import type {
  AdminCreatorListQuery,
  AdminCreatorSearch,
  AdminPageListQuery,
  AdminPageSearch,
  AdminAppealListQuery,
} from '@letterly/contracts';
import {
  AdminRecordNotFoundError,
  type AdminOperationsRepository,
  type AdminReadPage,
} from './admin-operations.repository';
import type { AdminCursorPort, AdminCursorPosition } from './admin-cursor';

export class AdminOperationsService {
  constructor(
    private readonly repository: AdminOperationsRepository,
    private readonly cursors: AdminCursorPort,
  ) {}
  creators(query: AdminCreatorListQuery | AdminCreatorSearch) {
    return this.read('creators', query, (position) =>
      this.repository.creators(query, position),
    );
  }
  pages(query: AdminPageListQuery | AdminPageSearch) {
    return this.read('pages', query, (position) =>
      this.repository.pages(query, position),
    );
  }
  appeals(query: AdminAppealListQuery) {
    return this.read('appeals', query, (position) =>
      this.repository.appeals(query, position),
    );
  }
  async page(id: string) {
    const record = await this.repository.page(id);
    if (!record) throw new AdminRecordNotFoundError();
    return record;
  }
  async appeal(id: string) {
    const record = await this.repository.appeal(id);
    if (!record) throw new AdminRecordNotFoundError();
    return record;
  }
  private async read<T>(
    purpose: string,
    query: { size: number; cursor?: string },
    load: (position: AdminCursorPosition | null) => Promise<AdminReadPage<T>>,
  ) {
    const { cursor, size, ...values } = query;
    const search =
      'field' in query && 'value' in query
        ? { field: query.field, value: query.value }
        : null;
    const filters = Object.fromEntries(
      Object.entries(values)
        .filter(([key]) => key !== 'field' && key !== 'value')
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    const filterHash = this.cursors.filterHash({
      purpose,
      filters,
      searchHash: search ? this.cursors.filterHash(search) : null,
    });
    const position = cursor
      ? this.cursors.decode({ cursor, filterHash, size })
      : null;
    const result = await load(position);
    return {
      items: result.items,
      nextCursor: result.nextPosition
        ? this.cursors.encode({
            position: result.nextPosition,
            filterHash,
            size,
          })
        : null,
    };
  }
}
