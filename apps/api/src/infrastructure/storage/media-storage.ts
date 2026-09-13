import type { Readable } from 'node:stream';

export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

export interface MediaStorage {
  createUploadUrl(input: {
    contentType: string;
    expiresInSeconds: number;
    key: string;
    sha256: string;
  }): Promise<{
    expiresAt: Date;
    key: string;
    uploadUrl: string;
    requiredHeaders: {
      contentType: string;
      sha256: string;
    };
  }>;
  getObject(key: string): Promise<{
    body: Buffer;
    contentType: string | undefined;
    contentLength: number | undefined;
    checksumSha256: string | undefined;
  }>;
  getObjectRange(input: {
    key: string;
    start?: number;
    end?: number;
  }): Promise<{
    body: Readable;
    contentType: string | undefined;
    contentLength: number | undefined;
    contentRange: string | undefined;
    totalLength: number | undefined;
  }>;
  putObject(input: {
    body: Buffer;
    contentType: string;
    key: string;
  }): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

export class MediaStorageUnavailableError extends Error {
  constructor() {
    super('Media storage unavailable');
    this.name = 'MediaStorageUnavailableError';
  }
}

export class MediaStorageRangeNotSatisfiableError extends Error {
  constructor() {
    super('Media range not satisfiable');
    this.name = 'MediaStorageRangeNotSatisfiableError';
  }
}
