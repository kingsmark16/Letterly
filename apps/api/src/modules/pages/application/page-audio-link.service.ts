import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PageAudioLink as PageAudioLinkDto } from '@letterly/contracts/pages';
import {
  PAGE_AUDIO_LINK_REPOSITORY,
  type PageAudioLinkRecord,
  type PageAudioLinkRepository,
} from './page-audio-link.repository';
import {
  YOUTUBE_METADATA_CACHE,
  YOUTUBE_METADATA_PROVIDER,
  YouTubeMetadataService,
  YouTubeMetadataUnavailableError,
  YouTubeVideoUnavailableError,
  type YouTubeMetadataCache,
  type YouTubeMetadataProvider,
} from './youtube-metadata';
import { normalizeYouTubeVideoId } from './youtube-url';
import {
  AudioPageNotFoundError,
  AudioSourceOccupiedError,
  AudioUploadActiveError,
  AudioCapabilityUnavailableError,
} from './page-audio.service';

export const YOUTUBE_LINKS_ENABLED = Symbol('YOUTUBE_LINKS_ENABLED');

export class AudioLinkCreationDisabledError extends Error {}
export class AudioLinkLookupUnavailableError extends Error {}
export class AudioLinkUnavailableError extends Error {}

@Injectable()
export class PageAudioLinkService {
  private readonly metadata: YouTubeMetadataService;

  constructor(
    @Inject(PAGE_AUDIO_LINK_REPOSITORY)
    private readonly repository: PageAudioLinkRepository,
    @Inject(YOUTUBE_METADATA_PROVIDER)
    provider: YouTubeMetadataProvider,
    @Inject(YOUTUBE_METADATA_CACHE)
    cache: YouTubeMetadataCache,
    @Inject(YOUTUBE_LINKS_ENABLED)
    private readonly linksEnabled: boolean,
  ) {
    this.metadata = new YouTubeMetadataService(provider, cache);
  }

  async addOwnerLink(input: {
    creatorId: string;
    pageId: string;
    url: string;
  }): Promise<{ audioLink: PageAudioLinkDto; created: boolean }> {
    const videoId = normalizeYouTubeVideoId(input.url);
    const slotResult = await this.repository.getOwnerAudioSlot(input);
    if (slotResult.type === 'not_found') throw new AudioPageNotFoundError();
    const slot = slotResult.slot;
    if (slot.audioCapability === 'hidden') {
      throw new AudioCapabilityUnavailableError();
    }

    const existingLink = slot.currentAudioLink;
    if (existingLink) {
      if (existingLink.videoId !== videoId) {
        throw new AudioSourceOccupiedError();
      }
      const metadata = await this.tryGetMetadata(videoId);
      return {
        audioLink: this.toDto(existingLink, metadata),
        created: false,
      };
    }
    if (slot.currentAudioId) throw new AudioSourceOccupiedError();
    if (slot.hasActiveUpload) throw new AudioUploadActiveError();
    if (!this.linksEnabled) throw new AudioLinkCreationDisabledError();

    const metadata = await this.requireMetadata(videoId);
    const attached = await this.repository.attachAudioLink({
      creatorId: input.creatorId,
      pageId: input.pageId,
      linkId: randomUUID(),
      videoId,
    });
    if (attached.type === 'not_found') throw new AudioPageNotFoundError();
    if (attached.type === 'unsupported_capability') {
      throw new AudioCapabilityUnavailableError();
    }
    if (attached.type === 'active_upload') throw new AudioUploadActiveError();
    if (attached.type === 'occupied') throw new AudioSourceOccupiedError();
    return {
      audioLink: this.toDto(attached.link, metadata),
      created: attached.type === 'created',
    };
  }

  async getOwnerLink(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageAudioLinkDto | null> {
    const result = await this.repository.getOwnerAudioSlot(input);
    if (result.type === 'not_found') throw new AudioPageNotFoundError();
    if (result.slot.audioCapability === 'hidden') {
      throw new AudioCapabilityUnavailableError();
    }
    const link = result.slot.currentAudioLink;
    if (!link) return null;
    return this.toDto(link, await this.tryGetMetadata(link.videoId));
  }

  async getPublicLink(input: {
    slug: string;
  }): Promise<PageAudioLinkDto | null> {
    const link = await this.repository.getPublicAudioLink(input);
    if (!link) return null;
    return this.toDto(link, await this.tryGetMetadata(link.videoId));
  }

  private async requireMetadata(videoId: string) {
    try {
      return await this.metadata.requireAvailable(videoId);
    } catch (error) {
      if (error instanceof YouTubeVideoUnavailableError) {
        throw new AudioLinkUnavailableError();
      }
      if (error instanceof YouTubeMetadataUnavailableError) {
        throw new AudioLinkLookupUnavailableError();
      }
      throw error;
    }
  }

  private async tryGetMetadata(videoId: string) {
    try {
      const result = await this.metadata.get(videoId);
      return result.type === 'available' ? result.metadata : null;
    } catch {
      return null;
    }
  }

  private toDto(
    link: PageAudioLinkRecord,
    metadata: Awaited<
      ReturnType<PageAudioLinkService['requireMetadata']>
    > | null,
  ): PageAudioLinkDto {
    return {
      id: link.id,
      provider: 'YOUTUBE',
      videoId: link.videoId,
      displayTitle: metadata?.title ?? 'YouTube song',
      durationSeconds: metadata?.durationSeconds ?? null,
      metadataExpiresAt: metadata?.expiresAt ?? null,
    };
  }
}
