import { Inject, Injectable } from '@nestjs/common';
import type { AdminAuditListQuery, AdminAuditListResponse } from '@letterly/contracts';
import {
  ADMIN_AUDIT_REPOSITORY,
  type AdminAuditRepository,
} from './admin-audit.repository';
import { AdminCursorService, adminFilterHash, InvalidAdminCursorError } from './admin-cursor.service';

@Injectable()
export class AdminAuditService {
  constructor(
    @Inject(ADMIN_AUDIT_REPOSITORY) private readonly repository: AdminAuditRepository,
    private readonly cursors: AdminCursorService,
  ) {}

  async list(query: AdminAuditListQuery): Promise<AdminAuditListResponse> {
    const filterHash = adminFilterHash({
      targetType: query.targetType ?? null,
      targetId: query.targetId ?? null,
      actorId: query.actorId ?? null,
      eventType: query.eventType ?? null,
    });
    const cursor = query.cursor
      ? this.cursors.decode({ cursor: query.cursor, filterHash, size: query.size })
      : null;
    const result = await this.repository.list({ query, cursor });
    return {
      items: result.items,
      nextCursor: result.nextPosition
        ? this.cursors.encode({ position: result.nextPosition, filterHash, size: query.size })
        : null,
    };
  }
}

export { InvalidAdminCursorError };
