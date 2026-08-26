import { Logger } from '@nestjs/common';
import type { ErrorEvent } from '@sentry/node';
import { SafeMonitoring, redactSentryEvent } from './safe-monitoring';

describe('safe monitoring', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ORIGIN = 'http://localhost:3000';
    process.env.PORT = '3001';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
    delete process.env.SENTRY_DSN;
  });

  it('redacts request, identity, content, and stack data before transport', () => {
    const event = {
      event_id: 'event-id',
      message: 'private letter content',
      request: {
        url: 'https://letterly.example/p/private-slug?token=secret',
        data: { message: 'private visitor response' },
      },
      user: { id: 'user-id', email: 'private@example.com' },
      breadcrumbs: [{ message: 'typed private content' }],
      extra: { token: 'secret' },
      tags: {
        route: '/api/v1/admin/reports/:reportId',
        reportId: 'report-id',
      },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'database credentials and private message',
            stacktrace: { frames: [] },
          },
        ],
      },
    } as unknown as ErrorEvent;

    const safe = redactSentryEvent(event);

    expect(safe).toEqual({
      event_id: 'event-id',
      type: undefined,
      level: undefined,
      platform: undefined,
      release: undefined,
      environment: undefined,
      tags: { route: '/api/v1/admin/reports/:reportId' },
      exception: { values: [{ type: 'Error', mechanism: undefined }] },
    });
    expect(JSON.stringify(safe)).not.toContain('private');
    expect(JSON.stringify(safe)).not.toContain('secret');
    expect(JSON.stringify(safe)).not.toContain('report-id');
  });

  it('records only bounded metric fields and ignores unsafe routes', () => {
    const loggerLog = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const monitoring = new SafeMonitoring();

    monitoring.recordMetric('admin_request_total', Number.POSITIVE_INFINITY, {
      route: '/p/private-slug?token=secret',
      operation: 'admin_list',
      outcome: 'success',
    });

    expect(loggerLog).toHaveBeenCalledWith({
      metric: 'admin_request_total',
      value: 0,
      environment: 'test',
      operation: 'admin_list',
      outcome: 'success',
    });
    expect(JSON.stringify(loggerLog.mock.calls)).not.toContain('private-slug');
    expect(JSON.stringify(loggerLog.mock.calls)).not.toContain('secret');
    loggerLog.mockRestore();
  });
});
