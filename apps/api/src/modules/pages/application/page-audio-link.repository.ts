export const PAGE_AUDIO_LINK_REPOSITORY = Symbol('PAGE_AUDIO_LINK_REPOSITORY');

export interface PageAudioLinkRecord {
  id: string;
  pageId: string;
  provider: 'YOUTUBE';
  videoId: string;
}

export interface AudioSourceSlotSnapshot {
  audioCapability: 'hidden' | 'optional' | 'required';
  currentAudioId: string | null;
  currentAudioLink: PageAudioLinkRecord | null;
  hasActiveUpload: boolean;
}

export type OwnerAudioSlotResult =
  { type: 'found'; slot: AudioSourceSlotSnapshot } | { type: 'not_found' };

export type AttachAudioLinkResult =
  | { type: 'created'; link: PageAudioLinkRecord }
  | { type: 'existing'; link: PageAudioLinkRecord }
  | { type: 'not_found' }
  | { type: 'unsupported_capability' }
  | { type: 'active_upload' }
  | { type: 'occupied' };

export interface PageAudioLinkRepository {
  getOwnerAudioSlot(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerAudioSlotResult>;
  attachAudioLink(input: {
    creatorId: string;
    pageId: string;
    linkId: string;
    videoId: string;
  }): Promise<AttachAudioLinkResult>;
  getPublicAudioLink(input: {
    slug: string;
  }): Promise<PageAudioLinkRecord | null>;
}
