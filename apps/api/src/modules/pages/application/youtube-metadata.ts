export const YOUTUBE_METADATA_PROVIDER = Symbol('YOUTUBE_METADATA_PROVIDER');
export const YOUTUBE_METADATA_CACHE = Symbol('YOUTUBE_METADATA_CACHE');

export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  durationSeconds: number | null;
  fetchedAt: string;
  expiresAt: string;
}

export type CachedYouTubeMetadata =
  | { type: 'available'; metadata: YouTubeVideoMetadata }
  | { type: 'unavailable'; videoId: string; expiresAt: string };

export type YouTubeMetadataLookup =
  | { type: 'available'; title: string; durationSeconds: number | null }
  | { type: 'unavailable' };
export type YouTubeMetadataResult =
  | { type: 'available'; metadata: YouTubeVideoMetadata }
  | { type: 'unavailable' };

export interface YouTubeMetadataProvider {
  lookup(videoId: string): Promise<YouTubeMetadataLookup>;
}

export interface YouTubeMetadataCache {
  get(videoId: string): Promise<CachedYouTubeMetadata | null>;
  set(
    videoId: string,
    value: CachedYouTubeMetadata,
    ttlSeconds: number,
  ): Promise<void>;
  isQuotaCooldownActive(): Promise<boolean>;
  setQuotaCooldown(ttlSeconds: number): Promise<void>;
}

export class YouTubeMetadataUnavailableError extends Error {}
export class YouTubeVideoUnavailableError extends Error {}
export class YouTubeQuotaExceededError extends Error {}

const POSITIVE_CACHE_TTL_SECONDS = 24 * 60 * 60;
const NEGATIVE_CACHE_TTL_SECONDS = 5 * 60;
const QUOTA_COOLDOWN_TTL_SECONDS = 60;
const MAX_CONCURRENT_LOOKUPS = 4;

export class YouTubeMetadataService {
  private readonly pending = new Map<string, Promise<YouTubeMetadataResult>>();
  private activeLookups = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(
    private readonly provider: YouTubeMetadataProvider,
    private readonly cache: YouTubeMetadataCache,
  ) {}

  async requireAvailable(videoId: string): Promise<YouTubeVideoMetadata> {
    const result = await this.get(videoId);
    if (result.type !== 'available') {
      throw new YouTubeVideoUnavailableError();
    }
    return result.metadata;
  }

  async get(videoId: string): Promise<YouTubeMetadataResult> {
    let cached: CachedYouTubeMetadata | null;
    try {
      cached = await this.cache.get(videoId);
    } catch {
      throw new YouTubeMetadataUnavailableError();
    }
    if (cached) {
      if (cached.type === 'unavailable') return { type: 'unavailable' };
      return { type: 'available', metadata: cached.metadata };
    }

    const existing = this.pending.get(videoId);
    if (existing) return existing;

    const lookup = this.lookupAndCache(videoId);
    this.pending.set(videoId, lookup);
    try {
      return await lookup;
    } finally {
      this.pending.delete(videoId);
    }
  }

  private async lookupAndCache(
    videoId: string,
  ): Promise<YouTubeMetadataResult> {
    const release = await this.acquireLookupSlot();
    try {
      if (await this.cache.isQuotaCooldownActive()) {
        throw new YouTubeMetadataUnavailableError();
      }

      const result = await this.provider.lookup(videoId);
      const fetchedAt = new Date();
      if (result.type === 'unavailable') {
        const expiresAt = new Date(
          fetchedAt.getTime() + NEGATIVE_CACHE_TTL_SECONDS * 1000,
        );
        await this.cache.set(
          videoId,
          { type: 'unavailable', videoId, expiresAt: expiresAt.toISOString() },
          NEGATIVE_CACHE_TTL_SECONDS,
        );
        return { type: 'unavailable' };
      }

      const metadata: YouTubeVideoMetadata = {
        videoId,
        title: result.title,
        durationSeconds: result.durationSeconds,
        fetchedAt: fetchedAt.toISOString(),
        expiresAt: new Date(
          fetchedAt.getTime() + POSITIVE_CACHE_TTL_SECONDS * 1000,
        ).toISOString(),
      };
      await this.cache.set(
        videoId,
        { type: 'available', metadata },
        POSITIVE_CACHE_TTL_SECONDS,
      );
      return { type: 'available', metadata };
    } catch (error) {
      if (error instanceof YouTubeQuotaExceededError) {
        try {
          await this.cache.setQuotaCooldown(QUOTA_COOLDOWN_TTL_SECONDS);
        } catch {
          // The current lookup still fails safely when the cooldown cannot persist.
        }
      }
      throw new YouTubeMetadataUnavailableError();
    } finally {
      release();
    }
  }

  private async acquireLookupSlot(): Promise<() => void> {
    if (this.activeLookups >= MAX_CONCURRENT_LOOKUPS) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.activeLookups += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeLookups -= 1;
      this.waiters.shift()?.();
    };
  }
}
