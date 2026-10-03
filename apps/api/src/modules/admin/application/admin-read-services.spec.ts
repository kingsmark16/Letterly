import {
  AdminReportsService,
  AdminReportNotFoundError,
} from './admin-reports.service';
import { AdminAuditService } from './admin-audit.service';
import { InvalidAdminCursorError, type AdminCursorPort } from './admin-cursor';
import type { AdminReportsRepository } from './admin-reports.repository';
import type { AdminAuditRepository } from './admin-audit.repository';

function createCursors() {
  return {
    filterHash: jest
      .fn<
        ReturnType<AdminCursorPort['filterHash']>,
        Parameters<AdminCursorPort['filterHash']>
      >()
      .mockReturnValue('filter-hash'),
    decode: jest.fn<
      ReturnType<AdminCursorPort['decode']>,
      Parameters<AdminCursorPort['decode']>
    >(),
    encode: jest
      .fn<
        ReturnType<AdminCursorPort['encode']>,
        Parameters<AdminCursorPort['encode']>
      >()
      .mockReturnValue('next-cursor'),
  };
}

describe('Admin read services', () => {
  const position = { id: 'row-1', createdAt: new Date('2026-08-24T00:00:00Z') };
  function setup() {
    const cursors = createCursors();
    const reports = {
      listReports: jest
        .fn<
          ReturnType<AdminReportsRepository['listReports']>,
          Parameters<AdminReportsRepository['listReports']>
        >()
        .mockResolvedValue({ items: [], nextPosition: null }),
      findReport: jest
        .fn<
          ReturnType<AdminReportsRepository['findReport']>,
          Parameters<AdminReportsRepository['findReport']>
        >()
        .mockResolvedValue(null),
    };
    const audit = {
      list: jest
        .fn<
          ReturnType<AdminAuditRepository['list']>,
          Parameters<AdminAuditRepository['list']>
        >()
        .mockResolvedValue({ items: [], nextPosition: null }),
    };
    return {
      cursors,
      reports,
      audit,
      reportService: new AdminReportsService(reports, cursors),
      auditService: new AdminAuditService(audit, cursors),
    };
  }

  it('binds every report filter and size to decoded and emitted cursor positions', async () => {
    const { cursors, reports, reportService } = setup();
    const query = {
      size: 20,
      status: 'OPEN' as const,
      reason: 'SPAM' as const,
      pageId: 'page-1',
      userId: 'user-1',
      cursor: 'incoming',
    };
    cursors.decode.mockReturnValue(position);
    reports.listReports.mockResolvedValue({
      items: [],
      nextPosition: position,
    });
    await expect(reportService.list(query)).resolves.toEqual({
      items: [],
      nextCursor: 'next-cursor',
    });
    expect(cursors.filterHash).toHaveBeenCalledWith({
      status: 'OPEN',
      reason: 'SPAM',
      pageId: 'page-1',
      userId: 'user-1',
    });
    expect(cursors.decode).toHaveBeenCalledWith({
      cursor: 'incoming',
      filterHash: 'filter-hash',
      size: 20,
    });
    expect(reports.listReports).toHaveBeenCalledWith({
      query,
      cursor: position,
    });
    expect(cursors.encode).toHaveBeenCalledWith({
      position,
      filterHash: 'filter-hash',
      size: 20,
    });
  });

  it('binds audit filter values, size, and pagination to its cursor port', async () => {
    const { cursors, audit, auditService } = setup();
    const query = {
      size: 10,
      targetType: 'PAGE' as const,
      targetId: 'page-1',
      actorId: 'admin-1',
      eventType: 'PAGE_DISABLED' as const,
      cursor: 'incoming',
    };
    cursors.decode.mockReturnValue(position);
    audit.list.mockResolvedValue({ items: [], nextPosition: position });
    await expect(auditService.list(query)).resolves.toEqual({
      items: [],
      nextCursor: 'next-cursor',
    });
    expect(cursors.filterHash).toHaveBeenCalledWith({
      targetType: 'PAGE',
      targetId: 'page-1',
      actorId: 'admin-1',
      eventType: 'PAGE_DISABLED',
    });
    expect(cursors.decode).toHaveBeenCalledWith({
      cursor: 'incoming',
      filterHash: 'filter-hash',
      size: 10,
    });
    expect(audit.list).toHaveBeenCalledWith({ query, cursor: position });
    expect(cursors.encode).toHaveBeenCalledWith({
      position,
      filterHash: 'filter-hash',
      size: 10,
    });
  });

  it('uses explicit null filter values and skips cursor work on final unfiltered pages', async () => {
    const { cursors, reportService, auditService, reports, audit } = setup();
    await expect(reportService.list({ size: 20 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(auditService.list({ size: 10 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(cursors.filterHash).toHaveBeenNthCalledWith(1, {
      status: null,
      reason: null,
      pageId: null,
      userId: null,
    });
    expect(cursors.filterHash).toHaveBeenNthCalledWith(2, {
      targetType: null,
      targetId: null,
      actorId: null,
      eventType: null,
    });
    expect(cursors.decode).not.toHaveBeenCalled();
    expect(cursors.encode).not.toHaveBeenCalled();
    expect(reports.listReports).toHaveBeenCalledWith({
      query: { size: 20 },
      cursor: null,
    });
    expect(audit.list).toHaveBeenCalledWith({
      query: { size: 10 },
      cursor: null,
    });
  });

  it('rejects cursor failures before either repository reads', async () => {
    const { cursors, reports, audit, reportService, auditService } = setup();
    cursors.decode.mockImplementation(() => {
      throw new InvalidAdminCursorError();
    });
    await expect(
      reportService.list({ size: 20, cursor: 'bad' }),
    ).rejects.toBeInstanceOf(InvalidAdminCursorError);
    await expect(
      auditService.list({ size: 20, cursor: 'bad' }),
    ).rejects.toBeInstanceOf(InvalidAdminCursorError);
    expect(reports.listReports).not.toHaveBeenCalled();
    expect(audit.list).not.toHaveBeenCalled();
  });

  it('preserves read failures and maps only absent reports to not found', async () => {
    const { reports, audit, reportService, auditService } = setup();
    const failure = new Error('provider unavailable');
    reports.listReports.mockRejectedValue(failure);
    audit.list.mockRejectedValue(failure);
    await expect(reportService.list({ size: 20 })).rejects.toBe(failure);
    await expect(auditService.list({ size: 20 })).rejects.toBe(failure);
    await expect(reportService.detail('missing')).rejects.toBeInstanceOf(
      AdminReportNotFoundError,
    );
    reports.findReport.mockRejectedValue(failure);
    await expect(reportService.detail('unavailable')).rejects.toBe(failure);
  });
});
