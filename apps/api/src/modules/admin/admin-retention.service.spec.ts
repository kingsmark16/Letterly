import { AdminRetentionService } from './admin-retention.service';

describe('AdminRetentionService', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ORIGIN = 'http://localhost:3000';
    process.env.PORT = '3001';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
    process.env.MODERATION_RETENTION_DAYS = '730';
    process.env.MODERATION_PURGE_INTERVAL_SECONDS = '86400';
    process.env.MODERATION_PURGE_BATCH_SIZE = '100';
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.restoreAllMocks();
  });

  it('runs a bounded purge and records a safe success event', async () => {
    const repository = {
      run: jest.fn().mockResolvedValue({
        acquired: true,
        claimed: 4,
        deleted: 4,
      }),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminRetentionService(repository);
    const now = new Date('2026-08-26T00:00:00.000Z');

    await service.runOnce(now);

    expect(repository.run).toHaveBeenCalledWith({
      now,
      retentionDays: 730,
      batchSize: 100,
    });
    expect(repository.recordSuccess).toHaveBeenCalledWith({
      now,
      claimed: 4,
      deleted: 4,
    });
  });

  it('does not record a success when another worker owns the lease', async () => {
    const repository = {
      run: jest.fn().mockResolvedValue({
        acquired: false,
        claimed: 0,
        deleted: 0,
      }),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminRetentionService(repository);

    await service.runOnce(new Date('2026-08-26T00:00:00.000Z'));

    expect(repository.recordSuccess).not.toHaveBeenCalled();
  });

  it('records a bounded failure when the success audit cannot be written', async () => {
    const repository = {
      run: jest.fn().mockResolvedValue({
        acquired: true,
        claimed: 1,
        deleted: 1,
      }),
      recordSuccess: jest
        .fn()
        .mockRejectedValue(new Error('audit database unavailable')),
      recordFailure: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminRetentionService(repository);
    const now = new Date('2026-08-26T00:00:00.000Z');

    await service.runOnce(now);

    expect(repository.recordFailure).toHaveBeenCalledWith({
      now,
      failureCode: 'UNKNOWN',
    });
  });

  it('starts and stops the configured interval', async () => {
    jest.useFakeTimers();
    const repository = {
      run: jest.fn().mockResolvedValue({
        acquired: false,
        claimed: 0,
        deleted: 0,
      }),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminRetentionService(repository);

    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(86_400_000);
    service.onModuleDestroy();

    expect(repository.run).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
