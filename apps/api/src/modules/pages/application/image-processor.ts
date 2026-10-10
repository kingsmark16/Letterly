export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');

export interface ImageProcessingInput {
  body: Buffer;
  expectedContentType: string;
  storedContentType: string | undefined;
  storedContentLength: number | undefined;
  storedChecksumSha256: string | undefined;
  expectedChecksumSha256: string;
}

export interface SanitizedImage {
  body: Buffer;
  byteSize: number;
  checksum: string;
  height: number;
  width: number;
}

export interface ImageProcessingPort {
  sanitize: (input: ImageProcessingInput) => Promise<SanitizedImage>;
}

export class ImageProcessingError extends Error {
  constructor(readonly failureCode: string) {
    super('Image processing failed');
    this.name = 'ImageProcessingError';
  }
}
