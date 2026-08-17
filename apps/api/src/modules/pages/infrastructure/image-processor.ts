import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const MAX_SOURCE_BYTES = 10_485_760;
export const MAX_LONGEST_SIDE = 8_000;
export const MAX_PIXELS = 40_000_000;
export const MAX_OUTPUT_BYTES = 8_388_608;

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface SanitizedImage {
  body: Buffer;
  byteSize: number;
  checksum: string;
  height: number;
  width: number;
}

export class ImageProcessingError extends Error {
  constructor(readonly failureCode: string) {
    super('Image processing failed');
    this.name = 'ImageProcessingError';
  }
}

export class ImageProcessor {
  async sanitize(input: {
    body: Buffer;
    expectedContentType: string;
    storedContentType: string | undefined;
    storedContentLength: number | undefined;
    storedChecksumSha256: string | undefined;
    expectedChecksumSha256: string;
  }): Promise<SanitizedImage> {
    if (
      input.body.byteLength === 0 ||
      input.body.byteLength > MAX_SOURCE_BYTES
    ) {
      throw new ImageProcessingError('SOURCE_TOO_LARGE');
    }

    if (
      input.storedContentLength !== undefined &&
      input.storedContentLength !== input.body.byteLength
    ) {
      throw new ImageProcessingError('SOURCE_SIZE_MISMATCH');
    }

    if (
      input.storedContentType !== undefined &&
      input.storedContentType !== input.expectedContentType
    ) {
      throw new ImageProcessingError('SOURCE_MIME_MISMATCH');
    }

    const checksum = createHash('sha256').update(input.body).digest('base64');

    if (checksum !== input.expectedChecksumSha256) {
      throw new ImageProcessingError('SOURCE_CHECKSUM_MISMATCH');
    }

    if (
      input.storedChecksumSha256 !== undefined &&
      input.storedChecksumSha256 !== checksum
    ) {
      throw new ImageProcessingError('STORED_CHECKSUM_MISMATCH');
    }

    const fileType = await this.detectFileType(input.body);

    if (!fileType || !allowedMimeTypes.has(fileType.mime)) {
      throw new ImageProcessingError('INVALID_MAGIC_BYTES');
    }

    if (fileType.mime !== input.expectedContentType) {
      throw new ImageProcessingError('MAGIC_MIME_MISMATCH');
    }

    let metadata: sharp.Metadata;

    try {
      metadata = await sharp(input.body, {
        limitInputPixels: MAX_PIXELS,
        animated: false,
        pages: 1,
      }).metadata();
    } catch {
      throw new ImageProcessingError('INVALID_IMAGE');
    }

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (metadata.pages && metadata.pages > 1) {
      throw new ImageProcessingError('MULTI_PAGE_IMAGE');
    }

    if (
      !width ||
      !height ||
      width > MAX_LONGEST_SIDE ||
      height > MAX_LONGEST_SIDE
    ) {
      throw new ImageProcessingError('IMAGE_DIMENSIONS_INVALID');
    }

    if (width * height > MAX_PIXELS) {
      throw new ImageProcessingError('IMAGE_PIXELS_INVALID');
    }

    let body: Buffer;

    try {
      body = await sharp(input.body, {
        limitInputPixels: MAX_PIXELS,
        animated: false,
        pages: 1,
      })
        .rotate()
        .webp({
          quality: 82,
          effort: 4,
          lossless: false,
        })
        .toBuffer();
    } catch {
      throw new ImageProcessingError('CONVERSION_FAILED');
    }

    if (body.byteLength === 0 || body.byteLength > MAX_OUTPUT_BYTES) {
      throw new ImageProcessingError('OUTPUT_TOO_LARGE');
    }

    const outputMetadata = await sharp(body).metadata();
    const outputWidth = outputMetadata.width ?? 0;
    const outputHeight = outputMetadata.height ?? 0;

    if (!outputWidth || !outputHeight) {
      throw new ImageProcessingError('OUTPUT_INVALID');
    }

    return {
      body,
      byteSize: body.byteLength,
      checksum: createHash('sha256').update(body).digest('base64'),
      height: outputHeight,
      width: outputWidth,
    };
  }

  private async detectFileType(
    body: Buffer,
  ): Promise<{ mime: string } | undefined> {
    const module = await import('file-type');
    return module.fileTypeFromBuffer(body);
  }
}
