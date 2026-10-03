import type { AdminAuditListQuery, AdminAuditEvent } from '@letterly/contracts';

export const ADMIN_AUDIT_REPOSITORY = Symbol('ADMIN_AUDIT_REPOSITORY');

export interface AdminAuditCursorPosition {
  createdAt: Date;
  id: string;
}

export interface AdminAuditRepository {
  list(input: {
    query: AdminAuditListQuery;
    cursor: AdminAuditCursorPosition | null;
  }): Promise<{
    items: AdminAuditEvent[];
    nextPosition: AdminAuditCursorPosition | null;
  }>;
}
