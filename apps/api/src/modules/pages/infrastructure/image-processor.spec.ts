import { createHash } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  IMAGE_PROCESSOR,
  ImageProcessingError,
  type ImageProcessingPort,
} from '../application/image-processor';
import { ImageProcessor } from './image-processor';

jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn((body: Buffer) =>
    Promise.resolve(body[0] === 0x89 ? { mime: 'image/png' } : undefined),
  ),
}));

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function checksum(value: Buffer): string {
  return createHash('sha256').update(value).digest('base64');
}

describe('ImageProcessor', () => {
  let processor: ImageProcessingPort;
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        ImageProcessor,
        { provide: IMAGE_PROCESSOR, useExisting: ImageProcessor },
      ],
    }).compile();
    processor = module.get<ImageProcessingPort>(IMAGE_PROCESSOR);
  });
  afterAll(async () => {
    await module.close();
  });

  it('AC-3 verifies a PNG and returns sanitized WebP output metadata', async () => {
    const result = await processor.sanitize({
      body: onePixelPng,
      expectedContentType: 'image/png',
      storedContentType: 'image/png',
      storedContentLength: onePixelPng.byteLength,
      storedChecksumSha256: checksum(onePixelPng),
      expectedChecksumSha256: checksum(onePixelPng),
    });

    expect(processor).toBe(module.get(ImageProcessor));
    expect(result.body.subarray(0, 4).toString()).toBe('RIFF');
    expect(result.body.subarray(8, 12).toString()).toBe('WEBP');
    expect(result.byteSize).toBe(result.body.byteLength);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.checksum).toBe(checksum(result.body));
  });

  it('AC-3 rejects a checksum mismatch before image parsing', async () => {
    await expect(
      processor.sanitize({
        body: onePixelPng,
        expectedContentType: 'image/png',
        storedContentType: 'image/png',
        storedContentLength: onePixelPng.byteLength,
        storedChecksumSha256: checksum(onePixelPng),
        expectedChecksumSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      }),
    ).rejects.toMatchObject<Partial<ImageProcessingError>>({
      failureCode: 'SOURCE_CHECKSUM_MISMATCH',
    });
  });

  it('AC-11 rejects a MIME spoof with invalid magic bytes', async () => {
    const body = Buffer.from('not an image');
    const bodyChecksum = checksum(body);

    await expect(
      processor.sanitize({
        body,
        expectedContentType: 'image/png',
        storedContentType: 'image/png',
        storedContentLength: body.byteLength,
        storedChecksumSha256: bodyChecksum,
        expectedChecksumSha256: bodyChecksum,
      }),
    ).rejects.toMatchObject<Partial<ImageProcessingError>>({
      failureCode: 'INVALID_MAGIC_BYTES',
    });
  });
});
