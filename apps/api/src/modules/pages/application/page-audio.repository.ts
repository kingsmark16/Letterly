export const PAGE_AUDIO_REPOSITORY = Symbol('PAGE_AUDIO_REPOSITORY');

export type PageAudioState =
  'UPLOADING' | 'VERIFYING' | 'READY' | 'FAILED' | 'EXPIRED';

export interface PageAudioRecord {
  id: string;
  pageId: string;
  state: PageAudioState;
  sourceStorageKey: string | null;
  sourceMimeType: string;
  displayTitle: string;
  sourceByteSize: number;
  sourceSha256: string;
  durationMilliseconds: number | null;
  rightsConfirmedAt: Date | null;
  rightsStatementVersion: string | null;
  failureCode: string | null;
  processingLeaseExpiresAt: Date | null;
  uploadExpiresAt: Date;
  expiresAt: Date | null;
}

export type PrepareAudioResult =
  | { type: 'created'; audio: PageAudioRecord }
  | { type: 'not_found' }
  | { type: 'active_upload' };

export type ClaimAudioResult =
  | { type: 'claimed'; audio: PageAudioRecord }
  | { type: 'ready'; audio: PageAudioRecord }
  | { type: 'not_found' }
  | { type: 'processing' }
  | { type: 'not_ready' };

export interface PageAudioRepository {
  prepareAudio(input: {
    creatorId: string;
    pageId: string;
    audioId: string;
    sourceStorageKey: string;
    sourceMimeType: 'audio/mpeg' | 'audio/mp4';
    displayTitle: string;
    sourceByteSize: number;
    sourceSha256: string;
    durationMilliseconds?: number;
    rightsStatementVersion: string;
    uploadExpiresAt: Date;
    expiresAt: Date;
  }): Promise<PrepareAudioResult>;
  claimAudio(input: {
    creatorId: string;
    pageId: string;
    audioId: string;
    now: Date;
    leaseExpiresAt: Date;
  }): Promise<ClaimAudioResult>;
  markAudioReady(input: {
    creatorId: string;
    pageId: string;
    audioId: string;
    expectedSourceStorageKey: string;
  }): Promise<PageAudioRecord | null>;
  markAudioFailed(input: {
    creatorId: string;
    pageId: string;
    audioId: string;
    failureCode: string;
    expectedSourceStorageKey?: string;
  }): Promise<void>;
  removeCurrentAudio(input: {
    creatorId: string;
    pageId: string;
  }): Promise<
    | { type: 'removed'; audio: PageAudioRecord }
    | { type: 'not_found' }
    | { type: 'none' }
  >;
  expireAudio(input: { now: Date }): Promise<void>;
  getOwnerAudio(input: { creatorId: string; pageId: string }): Promise<PageAudioRecord | null>;
  getPublicAudio(input: { slug: string }): Promise<PageAudioRecord | null>;
}
