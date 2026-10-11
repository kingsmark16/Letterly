import type {
  AdminAuditListQuery,
  AdminAuditListResponse,
} from '@letterly/contracts';
import { type AdminAuditRepository } from './admin-audit.repository';
import type { AdminCursorPort } from './admin-cursor';

export class AdminAuditService {
  constructor(
    private readonly repository: AdminAuditRepository,
    private readonly cursors: AdminCursorPort,
  ) {}

  async list(query: AdminAuditListQuery): Promise<AdminAuditListResponse> {
    const filterHash = this.cursors.filterHash({
      targetType: query.targetType ?? null,
      targetId: query.targetId ?? null,
      actorId: query.actorId ?? null,
      eventType: query.eventType ?? null,
    });
    const cursor = query.cursor
      ? this.cursors.decode({
          cursor: query.cursor,
          filterHash,
          size: query.size,
        })
      : null;
    const result = await this.repository.list({ query, cursor });
    return {
      items: result.items,
      nextCursor: result.nextPosition
        ? this.cursors.encode({
            position: result.nextPosition,
            filterHash,
            size: query.size,
          })
        : null,
    };
  }
}
