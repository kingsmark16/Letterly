import type {
  DeletionAcceptRequest,
  DeletionListQuery,
  DeletionRetryRequest,
} from '@letterly/contracts';
import type { AdminCursorPort } from './admin-cursor';
import {
  AdminDeletionError,
  type AdminDeletionsRepository,
} from './admin-deletions.repository';

export class AdminDeletionsService {
  constructor(
    private readonly repository: AdminDeletionsRepository,
    private readonly cursors: AdminCursorPort,
    private readonly enabled: boolean,
  ) {}
  preview(actorId: string, pageId: string, version: number) {
    this.requireEnabled();
    return this.repository.preview(actorId, pageId.toLowerCase(), version);
  }
  previewCreator(actorId: string, creatorId: string, version: number) {
    this.requireEnabled();
    return this.repository.preview(actorId, creatorId, version, 'CREATOR');
  }
  acceptCreator(
    actorId: string,
    creatorId: string,
    request: DeletionAcceptRequest,
    requestId: string,
  ) {
    return this.repository.accept(
      actorId,
      creatorId,
      request,
      requestId,
      'CREATOR',
      this.enabled,
    );
  }
  accept(
    actorId: string,
    pageId: string,
    request: DeletionAcceptRequest,
    requestId: string,
  ) {
    this.requireEnabled();
    return this.repository.accept(
      actorId,
      pageId.toLowerCase(),
      request,
      requestId,
    );
  }
  retry(
    actorId: string,
    jobId: string,
    request: DeletionRetryRequest,
    requestId: string,
  ) {
    return this.repository.retry(actorId, jobId, request, requestId);
  }
  async get(id: string) {
    const job = await this.repository.get(id);
    if (!job) throw new AdminDeletionError('NOT_FOUND');
    return job;
  }
  async list(query: DeletionListQuery, parentId?: string) {
    if (parentId) await this.get(parentId);
    const { cursor, size, ...filters } = query;
    const filterHash = this.cursors.filterHash({
      purpose: 'deletions-v1',
      parentId: parentId ?? null,
      ...filters,
    });
    const position = cursor
      ? this.cursors.decode({ cursor, size, filterHash })
      : null;
    const page = await this.repository.list(query, position, parentId);
    return {
      items: page.items,
      nextCursor: page.nextPosition
        ? this.cursors.encode({ position: page.nextPosition, filterHash, size })
        : null,
    };
  }
  private requireEnabled() {
    if (!this.enabled) throw new AdminDeletionError('INVALID_DELETION_STATE');
  }
}
