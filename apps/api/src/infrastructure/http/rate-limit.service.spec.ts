import type { RateLimitStore } from '@letterly/contracts';
import { createClient } from 'redis';
import {
  createConfiguredRateLimitStore,
  MemoryRateLimitStore,
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
  RedisRateLimitStore,
} from './rate-limit.service';

describe('RateLimitService', () => {
  it('AC-14 limits repeated creator mutations inside the policy window', async () => {
    const store = new MemoryRateLimitStore();
    const service = new RateLimitService(store);

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await service.consumeCreator('creator-123');
    }

    await expect(service.consumeCreator('creator-123')).rejects.toBeInstanceOf(
      RateLimitExceededError,
    );
  });

  it('AC-16 limits public reports per page and anonymous identity', async () => {
    const service = new RateLimitService(new MemoryRateLimitStore());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await service.consumePublicReport('page-1', 'browser-hash');
    }

    await expect(
      service.consumePublicReport('page-1', 'browser-hash'),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it('keeps unlock limits across minute boundaries within fifteen minutes', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-15T00:00:00.000Z'));

    try {
      const service = new RateLimitService(new MemoryRateLimitStore());
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await service.consumeVisitorUnlock('page-1', '203.0.113.24');
      }

      jest.advanceTimersByTime(60_000);

      await expect(
        service.consumeVisitorUnlock('page-1', '203.0.113.24'),
      ).rejects.toBeInstanceOf(RateLimitExceededError);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps report limits across minute boundaries within ten minutes', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-15T00:00:00.000Z'));

    try {
      const service = new RateLimitService(new MemoryRateLimitStore());
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await service.consumePublicReport('page-1', 'browser-hash');
      }

      jest.advanceTimersByTime(60_000);

      await expect(
        service.consumePublicReport('page-1', 'browser-hash'),
      ).rejects.toBeInstanceOf(RateLimitExceededError);
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-14 returns a safe unavailable error when the shared store fails', async () => {
    const store: RateLimitStore = {
      consume: jest.fn().mockRejectedValue(new Error('redis unavailable')),
    };
    const service = new RateLimitService(store);

    await expect(service.consumePublic('127.0.0.1')).rejects.toBeInstanceOf(
      RateLimitUnavailableError,
    );
  });

  it('AC-14 keeps memory storage for development and test only', () => {
    expect(
      createConfiguredRateLimitStore({
        NODE_ENV: 'development',
        REDIS_URL: undefined,
      }),
    ).toBeInstanceOf(MemoryRateLimitStore);

    expect(
      createConfiguredRateLimitStore({
        NODE_ENV: 'test',
        REDIS_URL: undefined,
      }),
    ).toBeInstanceOf(MemoryRateLimitStore);
  });

  it('AC-14 requires a shared store outside development and test', () => {
    expect(() =>
      createConfiguredRateLimitStore({
        NODE_ENV: 'production',
        REDIS_URL: undefined,
      }),
    ).toThrow('REDIS_URL is required outside development and test');

    expect(
      createConfiguredRateLimitStore({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toBeInstanceOf(RedisRateLimitStore);
  });

  it('AC-14 consumes a Redis bucket atomically and returns its remaining window', async () => {
    const evalMock = jest.fn().mockResolvedValue([3, 42]);
    const client = {
      isOpen: true,
      eval: evalMock,
      on: jest.fn(),
      connect: jest.fn(),
      quit: jest.fn(),
    } as unknown as ReturnType<typeof createClient>;
    const store = new RedisRateLimitStore('redis://localhost:6379', client);

    await expect(
      store.consume({
        key: 'creatorWrites:creator-123',
        limit: 60,
        windowSeconds: 60,
      }),
    ).resolves.toEqual({
      allowed: true,
      remaining: 57,
      retryAfterSeconds: 42,
    });

    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      {
        keys: ['creatorWrites:creator-123'],
        arguments: ['60'],
      },
    );
  });
});
