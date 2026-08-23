import { createHash } from 'node:crypto';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@letterly/config';
import type { RateLimitStore } from '@letterly/contracts';
import { createClient } from 'redis';
import { rateLimitBrowserKey } from './browser-token';

type RedisRateLimitClient = ReturnType<typeof createClient>;

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export const rateLimitPolicies = {
  creatorWrites: { limit: 60, windowSeconds: 60 },
  publicPageReads: { limit: 120, windowSeconds: 60 },
  creatorImageUploads: { limit: 30, windowSeconds: 60 },
  publicMediaReads: { limit: 600, windowSeconds: 60 },
  visitorSubmissions: { limit: 3, windowSeconds: 600 },
  visitorUnlocks: { limit: 10, windowSeconds: 900 },
  publicReports: { limit: 5, windowSeconds: 600 },
  adminReads: { limit: 120, windowSeconds: 60 },
  adminWrites: { limit: 30, windowSeconds: 60 },
} as const;

export class RateLimitUnavailableError extends Error {
  constructor() {
    super('Rate limit service unavailable');
    this.name = 'RateLimitUnavailableError';
  }
}

export class RateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many requests');
    this.name = 'RateLimitExceededError';
  }
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, MemoryBucket>();

  consume(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  }> {
    const now = Date.now();
    const current = this.buckets.get(input.key);
    const resetAt =
      current && current.resetAt > now
        ? current.resetAt
        : now + input.windowSeconds * 1000;
    const bucket: MemoryBucket =
      current && current.resetAt > now ? current : { count: 0, resetAt };

    bucket.count += 1;
    this.buckets.set(input.key, bucket);

    const allowed = bucket.count <= input.limit;
    return Promise.resolve({
      allowed,
      remaining: Math.max(0, input.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    });
  }
}

export class RedisRateLimitStore
  implements RateLimitStore, OnApplicationShutdown
{
  private readonly client: RedisRateLimitClient;
  private connection: Promise<void> | null = null;

  constructor(redisUrl: string, client?: RedisRateLimitClient) {
    this.client =
      client ??
      createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5_000,
          reconnectStrategy: false,
        },
      });
    this.client.on('error', () => undefined);
  }

  async consume(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  }> {
    await this.ensureConnected();

    const result = (await this.client.eval(
      `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('TTL', KEYS[1])
        return { count, ttl }
      `,
      {
        keys: [input.key],
        arguments: [String(input.windowSeconds)],
      },
    )) as unknown;

    const [countValue, ttlValue] = parseRedisRateLimitResult(result);
    const count = Number(countValue);
    const ttl = Number(ttlValue);

    return {
      allowed: count <= input.limit,
      remaining: Math.max(0, input.limit - count),
      retryAfterSeconds: Math.max(1, ttl),
    };
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    this.connection ??= this.client
      .connect()
      .then(() => undefined)
      .finally(() => {
        this.connection = null;
      });

    await this.connection;
  }
}

function parseRedisRateLimitResult(
  result: unknown,
): [string | number, string | number] {
  if (!Array.isArray(result) || result.length !== 2) {
    throw new Error('Unexpected Redis rate limit response');
  }

  const values = result as readonly unknown[];
  const count = values[0];
  const ttl = values[1];

  if (
    (typeof count !== 'string' && typeof count !== 'number') ||
    (typeof ttl !== 'string' && typeof ttl !== 'number')
  ) {
    throw new Error('Unexpected Redis rate limit response');
  }

  return [count, ttl];
}

export function createConfiguredRateLimitStore(
  config: Pick<AppConfig, 'NODE_ENV' | 'REDIS_URL'> = loadConfig(),
): RateLimitStore {
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    return new MemoryRateLimitStore();
  }

  if (!config.REDIS_URL) {
    throw new Error('REDIS_URL is required outside development and test');
  }

  return new RedisRateLimitStore(config.REDIS_URL);
}

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(RATE_LIMIT_STORE)
    private readonly store: RateLimitStore,
  ) {}

  async consumeCreator(creatorId: string): Promise<void> {
    await this.consume(
      `creatorWrites:${creatorId}`,
      rateLimitPolicies.creatorWrites,
    );
  }

  async consumePublic(ipAddress: string): Promise<void> {
    await this.consumePublicWithPolicy(
      ipAddress,
      rateLimitPolicies.publicPageReads,
    );
  }

  async consumePublicMedia(ipAddress: string): Promise<void> {
    await this.consumePublicWithPolicy(
      ipAddress,
      rateLimitPolicies.publicMediaReads,
    );
  }

  async consumeCreatorImageUpload(creatorId: string): Promise<void> {
    await this.consume(
      `creatorImageUploads:${creatorId}`,
      rateLimitPolicies.creatorImageUploads,
    );
  }

  async consumeVisitorSubmission(
    pageId: string,
    browserTokenHash: string,
  ): Promise<void> {
    await this.consume(
      `visitorSubmissions:${rateLimitBrowserKey(pageId, browserTokenHash)}`,
      rateLimitPolicies.visitorSubmissions,
    );
  }

  async consumeVisitorUnlock(pageId: string, ipAddress: string): Promise<void> {
    const window = Math.floor(
      Date.now() / (rateLimitPolicies.visitorUnlocks.windowSeconds * 1000),
    );
    const derivedIp = createHash('sha256')
      .update(`${ipAddress}:${window}`)
      .digest('hex');

    await this.consume(
      `visitorUnlocks:${pageId}:${derivedIp}`,
      rateLimitPolicies.visitorUnlocks,
    );
  }

  async consumePublicReport(pageId: string, identity: string): Promise<void> {
    const window = Math.floor(
      Date.now() / (rateLimitPolicies.publicReports.windowSeconds * 1000),
    );
    const derivedIdentity = createHash('sha256')
      .update(`${identity}:${window}`)
      .digest('hex');
    await this.consume(
      `publicReports:${pageId}:${derivedIdentity}`,
      rateLimitPolicies.publicReports,
    );
  }

  async consumeAdminRead(adminId: string): Promise<void> {
    await this.consume(`admin:read:${adminId}`, rateLimitPolicies.adminReads);
  }

  async consumeAdminWrite(adminId: string): Promise<void> {
    await this.consume(`admin:write:${adminId}`, rateLimitPolicies.adminWrites);
  }

  private async consumePublicWithPolicy(
    ipAddress: string,
    policy: { limit: number; windowSeconds: number },
  ): Promise<void> {
    const window = Math.floor(Date.now() / 60_000);
    const derivedIp = createHash('sha256')
      .update(`${ipAddress}:${window}`)
      .digest('hex');

    await this.consume(
      `${policy === rateLimitPolicies.publicMediaReads ? 'publicMediaReads' : 'publicPageReads'}:${derivedIp}`,
      policy,
    );
  }

  private async consume(
    key: string,
    policy: { limit: number; windowSeconds: number },
  ): Promise<void> {
    let result: Awaited<ReturnType<RateLimitStore['consume']>>;

    try {
      result = await this.store.consume({ key, ...policy });
    } catch {
      throw new RateLimitUnavailableError();
    }

    if (!result.allowed) {
      throw new RateLimitExceededError(result.retryAfterSeconds);
    }
  }
}
