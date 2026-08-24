import {
  AdminCursorService,
  adminFilterHash,
  InvalidAdminCursorError,
} from './admin-cursor.service';

describe('AdminCursorService', () => {
  const filterHash = adminFilterHash({ status: 'OPEN' });
  const position = {
    createdAt: new Date('2026-08-24T00:00:00.000Z'),
    id: 'report-1',
  };

  it('round trips a signed cursor with its filter and size', () => {
    const service = new AdminCursorService('s'.repeat(32));
    const cursor = service.encode({ position, filterHash, size: 20 });

    expect(service.decode({ cursor, filterHash, size: 20 })).toEqual(position);
  });

  it('rejects tampered or mismatched cursors', () => {
    const service = new AdminCursorService('s'.repeat(32));
    const cursor = service.encode({ position, filterHash, size: 20 });

    expect(() =>
      service.decode({ cursor: `${cursor}x`, filterHash, size: 20 }),
    ).toThrow(InvalidAdminCursorError);
    expect(() =>
      service.decode({ cursor, filterHash: adminFilterHash({}), size: 20 }),
    ).toThrow(InvalidAdminCursorError);
  });
});
