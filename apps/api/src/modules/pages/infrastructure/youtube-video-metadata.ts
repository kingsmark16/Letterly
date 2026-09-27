import { createClient } from 'redis';
import type { AppConfig } from '@letterly/config';
import { YouTubeQuotaExceededError } from '../application/youtube-metadata';
import type {
  CachedYouTubeMetadata,
  YouTubeMetadataCache,
  YouTubeMetadataLookup,
  YouTubeMetadataProvider,
} from '../application/youtube-metadata';

type RedisMetadataClient = ReturnType<typeof createClient>;
const redisClients = new Map<string, RedisMetadataClient>();
const memoryEntries = new Map<
  string,
  { value: CachedYouTubeMetadata; expiresAt: number }
>();
const memoryQuotaCooldowns = new Map<string, number>();

function metadataCacheKey(
  config: Pick<AppConfig, 'NODE_ENV'>,
  videoId: string,
) {
  return `letterly:${config.NODE_ENV}:youtube-metadata:v1:${videoId}`;
}

function decodeMetadata(value: string | null): CachedYouTubeMetadata | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return null;
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.type === 'unavailable' &&
      typeof candidate.videoId === 'string' &&
      typeof candidate.expiresAt === 'string'
    ) {
      return {
        type: 'unavailable',
        videoId: candidate.videoId,
        expiresAt: candidate.expiresAt,
      };
    }
    if (candidate.type !== 'available' || !candidate.metadata) return null;
    const metadata = candidate.metadata as Record<string, unknown>;
    if (
      typeof metadata.videoId !== 'string' ||
      typeof metadata.title !== 'string' ||
      !(
        typeof metadata.durationSeconds === 'number' ||
        metadata.durationSeconds === null
      ) ||
      typeof metadata.fetchedAt !== 'string' ||
      typeof metadata.expiresAt !== 'string'
    ) {
      return null;
    }
    return {
      type: 'available',
      metadata: {
        videoId: metadata.videoId,
        title: metadata.title,
        durationSeconds: metadata.durationSeconds,
        fetchedAt: metadata.fetchedAt,
        expiresAt: metadata.expiresAt,
      },
    };
  } catch {
    return null;
  }
}

function configuredRedisClient(redisUrl: string): RedisMetadataClient {
  const existing = redisClients.get(redisUrl);
  if (existing) return existing;
  const client = createClient({ url: redisUrl }) as RedisMetadataClient;
  client.on('error', () => undefined);
  redisClients.set(redisUrl, client);
  return client;
}

export class InMemoryYouTubeMetadataCache implements YouTubeMetadataCache {
  constructor(private readonly environment: AppConfig['NODE_ENV']) {}

  async get(videoId: string): Promise<CachedYouTubeMetadata | null> {
    const key = `letterly:${this.environment}:youtube-metadata:v1:${videoId}`;
    const entry = memoryEntries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      memoryEntries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(
    videoId: string,
    value: CachedYouTubeMetadata,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `letterly:${this.environment}:youtube-metadata:v1:${videoId}`;
    memoryEntries.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async isQuotaCooldownActive(): Promise<boolean> {
    const expiresAt = memoryQuotaCooldowns.get(this.environment) ?? 0;
    if (expiresAt <= Date.now()) {
      memoryQuotaCooldowns.delete(this.environment);
      return false;
    }
    return true;
  }

  async setQuotaCooldown(ttlSeconds: number): Promise<void> {
    memoryQuotaCooldowns.set(this.environment, Date.now() + ttlSeconds * 1000);
  }
}

export class RedisYouTubeMetadataCache implements YouTubeMetadataCache {
  private readonly client: RedisMetadataClient;

  constructor(
    private readonly config: Pick<AppConfig, 'NODE_ENV'>,
    redisUrl: string,
    client?: RedisMetadataClient,
  ) {
    this.client = client ?? configuredRedisClient(redisUrl);
  }

  async get(videoId: string): Promise<CachedYouTubeMetadata | null> {
    await this.ensureConnected();
    const key = metadataCacheKey(this.config, videoId);
    const entry = decodeMetadata(await this.client.get(key));
    if (
      entry &&
      Date.parse(
        entry.type === 'available' ? entry.metadata.expiresAt : entry.expiresAt,
      ) <= Date.now()
    ) {
      await this.client.del(key);
      return null;
    }
    return entry;
  }

  async set(
    videoId: string,
    value: CachedYouTubeMetadata,
    ttlSeconds: number,
  ): Promise<void> {
    await this.ensureConnected();
    const key = metadataCacheKey(this.config, videoId);
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async isQuotaCooldownActive(): Promise<boolean> {
    await this.ensureConnected();
    return (await this.client.exists(this.quotaCooldownKey())) > 0;
  }

  async setQuotaCooldown(ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(this.quotaCooldownKey(), '1', { EX: ttlSeconds });
  }

  private quotaCooldownKey(): string {
    return `letterly:${this.config.NODE_ENV}:youtube-metadata:v1:quota-cooldown`;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }
}

export class YouTubeDataApiMetadataProvider implements YouTubeMetadataProvider {
  constructor(private readonly apiKey: string | undefined) {}

  async lookup(videoId: string): Promise<YouTubeMetadataLookup> {
    if (!this.apiKey)
      throw new Error('YouTube metadata credentials are missing');
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,status,contentDetails');
    url.searchParams.set('id', videoId);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (isQuotaExceeded(body)) throw new YouTubeQuotaExceededError();
      throw new Error('YouTube metadata lookup failed');
    }
    const item = readFirstVideo(body);
    if (!item) return { type: 'unavailable' };
    const title = item.snippet?.title?.trim();
    if (
      !title ||
      item.status?.privacyStatus === 'private' ||
      item.status?.embeddable !== true
    ) {
      return { type: 'unavailable' };
    }
    return {
      type: 'available',
      title: title.slice(0, 120),
      durationSeconds: parseIsoDuration(item.contentDetails?.duration),
    };
  }
}

function isQuotaExceeded(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== 'object' || !('errors' in error)) return false;
  const errors = (error as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return false;
  return errors.some((item: unknown) => {
    if (!item || typeof item !== 'object' || !('reason' in item)) return false;
    const reason = (item as { reason?: unknown }).reason;
    return reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
  });
}

interface YouTubeApiVideo {
  snippet?: { title?: string };
  status?: { privacyStatus?: string; embeddable?: boolean };
  contentDetails?: { duration?: string };
}

function readFirstVideo(value: unknown): YouTubeApiVideo | null {
  if (!value || typeof value !== 'object' || !('items' in value)) return null;
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const item = items[0];
  return item && typeof item === 'object' ? (item as YouTubeApiVideo) : null;
}

function parseIsoDuration(value: string | undefined): number | null {
  if (!value) return null;
  const match =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      value,
    );
  if (!match) return null;
  const seconds =
    Number(match[1] ?? 0) * 86_400 +
    Number(match[2] ?? 0) * 3_600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
}
