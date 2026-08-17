import { OnApplicationShutdown } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@letterly/config';
import { createClient } from 'redis';
import type { UnlockProofStore } from '../../modules/pages/application/unlock-proof.store';

type RedisClient = ReturnType<typeof createClient>;

export class MemoryUnlockProofStore implements UnlockProofStore {
  private readonly values = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    const entry = this.values.get(key);
    if (!entry) {
      return Promise.resolve(null);
    }
    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  revoke(pageId: string, ttlSeconds: number): Promise<void> {
    return this.set(`unlock:revoked:${pageId}`, String(Date.now()), ttlSeconds);
  }
}

export class RedisUnlockProofStore
  implements UnlockProofStore, OnApplicationShutdown
{
  private readonly client: RedisClient;
  private connection: Promise<void> | null = null;

  constructor(redisUrl: string, client?: RedisClient) {
    this.client =
      client ??
      createClient({
        url: redisUrl,
        socket: { connectTimeout: 5_000, reconnectStrategy: false },
      });
    this.client.on('error', () => undefined);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return this.client.get(key);
  }

  async revoke(pageId: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(`unlock:revoked:${pageId}`, String(Date.now()), {
      EX: ttlSeconds,
    });
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

export function createConfiguredUnlockProofStore(
  config: Pick<AppConfig, 'NODE_ENV' | 'REDIS_URL'> = loadConfig(),
): UnlockProofStore {
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    return new MemoryUnlockProofStore();
  }

  if (!config.REDIS_URL) {
    throw new Error('REDIS_URL is required outside development and test');
  }

  return new RedisUnlockProofStore(config.REDIS_URL);
}
