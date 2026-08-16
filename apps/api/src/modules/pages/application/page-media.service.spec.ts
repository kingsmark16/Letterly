import type { MediaStorage } from '../../../infrastructure/storage/media-storage';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ImageProcessingError,
  ImageProcessor,
} from '../infrastructure/image-processor';
import {
  MediaImageAttachedError,
  MediaImageProcessingError,
  MediaImageProcessingFailedError,
  MediaPageNotFoundError,
  MediaRateLimitError,
  MediaStorageError,
  PageMediaService,
} from './page-media.service';
import type {
  PageMediaRecord,
  PageMediaRepository,
} from './page-media.repository';
import { PAGE_MEDIA_REPOSITORY } from './page-media.repository';
import { MEDIA_STORAGE } from '../../../infrastructure/storage/media-storage';

const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const imageId = '11111111-1111-4111-8111-111111111111';

function createImage(
  overrides: Partial<PageMediaRecord> = {},
): PageMediaRecord {
  return {
    id: imageId,
    pageId,
    state: 'UPLOADING',
    attachedAt: null,
    storageKey: null,
    sourceStorageKey: `pages/${pageId}/sources/${imageId}`,
    sourceMimeType: 'image/png',
    sourceByteSize: 1024,
    sourceSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    outputByteSize: null,
    outputSha256: null,
    width: null,
    height: null,
    sortOrder: null,
    caption: null,
    failureCode: null,
    processingLeaseExpiresAt: null,
    uploadExpiresAt: new Date('2026-08-11T01:00:00.000Z'),
    expiresAt: new Date('2026-08-12T00:00:00.000Z'),
    ...overrides,
  };
}

function createRepository(): jest.Mocked<PageMediaRepository> {
  return {
    prepareImage: jest.fn(),
    listOwnerImages: jest.fn(),
    claimImage: jest.fn(),
    markImageFailed: jest.fn(),
    markImageReady: jest.fn(),
    retryImage: jest.fn(),
    removeImage: jest.fn(),
    getOwnerImage: jest.fn(),
    getPublicImage: jest.fn(),
    expireImages: jest.fn(),
    claimCleanupTasks: jest.fn(),
    markCleanupSucceeded: jest.fn(),
    markCleanupFailed: jest.fn(),
  };
}

function createStorage(): jest.Mocked<MediaStorage> {
  return {
    createUploadUrl: jest.fn(),
    getObject: jest.fn(),
    putObject: jest.fn(),
    deleteObject: jest.fn(),
  };
}

function createProcessor(): jest.Mocked<Pick<ImageProcessor, 'sanitize'>> {
  return {
    sanitize: jest.fn(),
  };
}

describe('PageMediaService', () => {
  let repository: jest.Mocked<PageMediaRepository>;
  let storage: jest.Mocked<MediaStorage>;
  let processor: jest.Mocked<Pick<ImageProcessor, 'sanitize'>>;
  let service: PageMediaService;

  beforeEach(() => {
    repository = createRepository();
    storage = createStorage();
    processor = createProcessor();
    service = new PageMediaService(
      repository,
      storage,
      processor as unknown as ImageProcessor,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('injects the image processor through the Nest container', async () => {
    const module = await Test.createTestingModule({
      providers: [
        PageMediaService,
        { provide: PAGE_MEDIA_REPOSITORY, useValue: repository },
        { provide: MEDIA_STORAGE, useValue: storage },
        { provide: ImageProcessor, useValue: processor },
      ],
    }).compile();
    const resolved = module.get(PageMediaService);

    expect(Reflect.get(resolved, 'processor')).toBe(processor);

    await module.close();
  });

  it('AC-2 prepares an owner upload with a server generated source key', async () => {
    const image = createImage();
    repository.prepareImage.mockResolvedValue({ type: 'created', image });
    storage.createUploadUrl.mockResolvedValue({
      key: image.sourceStorageKey ?? '',
      uploadUrl: 'https://uploads.example.test/signed',
      expiresAt: new Date('2026-08-11T01:00:00.000Z'),
      requiredHeaders: {
        contentType: 'image/png',
        sha256: image.sourceSha256,
      },
    });

    const response = await service.prepareUpload({
      creatorId,
      pageId,
      contentType: 'image/png',
      byteSize: image.sourceByteSize,
      sha256: image.sourceSha256,
    });

    expect(response).toMatchObject({
      uploadUrl: 'https://uploads.example.test/signed',
      state: 'UPLOADING',
    });
    expect(storage.createUploadUrl.mock.calls).toHaveLength(1);
    const uploadInput = storage.createUploadUrl.mock.calls[0]?.[0];
    expect(uploadInput?.contentType).toBe('image/png');
    expect(uploadInput?.sha256).toBe(image.sourceSha256);
    expect(uploadInput?.key).toMatch(
      new RegExp(`^pages/${pageId}/sources/[0-9a-f-]+$`),
    );
  });

  it('AC-3 completes a claimed upload only after sanitized output is stored', async () => {
    const image = createImage({ state: 'SANITIZING' });
    const ready = createImage({
      state: 'READY',
      sourceStorageKey: null,
      storageKey: `pages/${pageId}/images/${imageId}.webp`,
      outputByteSize: 2048,
      outputSha256: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
      width: 640,
      height: 480,
    });
    repository.claimImage.mockResolvedValue({ type: 'claimed', image });
    repository.markImageReady.mockResolvedValue(ready);
    storage.getObject.mockResolvedValue({
      body: Buffer.from('source'),
      contentType: 'image/png',
      contentLength: 6,
      checksumSha256: image.sourceSha256,
    });
    processor.sanitize.mockResolvedValue({
      body: Buffer.from('webp'),
      byteSize: 2048,
      checksum: ready.outputSha256 ?? '',
      width: 640,
      height: 480,
    });

    const response = await service.completeUpload({
      creatorId,
      pageId,
      imageId,
    });

    expect(response).toMatchObject({
      imageId,
      state: 'READY',
      outputByteSize: 2048,
      width: 640,
      height: 480,
    });
    expect(storage.putObject.mock.calls).toEqual([
      [
        {
          key: `pages/${pageId}/images/${imageId}.webp`,
          body: Buffer.from('webp'),
          contentType: 'image/webp',
        },
      ],
    ]);
    expect(storage.deleteObject.mock.calls).toEqual([[image.sourceStorageKey]]);
    expect(repository.markImageReady.mock.calls).toEqual([
      [
        expect.objectContaining({
          expectedSourceStorageKey: image.sourceStorageKey,
        }),
      ],
    ]);
  });

  it('AC-11 returns the current safe state for a repeated completed upload', async () => {
    const ready = createImage({
      state: 'READY',
      storageKey: `pages/${pageId}/images/${imageId}.webp`,
      outputByteSize: 2048,
      width: 640,
      height: 480,
    });
    repository.claimImage.mockResolvedValue({ type: 'ready', image: ready });

    await expect(
      service.completeUpload({ creatorId, pageId, imageId }),
    ).resolves.toMatchObject({ imageId, state: 'READY' });

    expect(storage.getObject.mock.calls).toHaveLength(0);
    expect(repository.markImageReady.mock.calls).toHaveLength(0);
  });

  it('AC-11 marks a processing failure private and exposes a safe retryable error', async () => {
    const image = createImage({ state: 'SANITIZING' });
    repository.claimImage.mockResolvedValue({ type: 'claimed', image });
    storage.getObject.mockResolvedValue({
      body: Buffer.from('source'),
      contentType: 'image/png',
      contentLength: 6,
      checksumSha256: image.sourceSha256,
    });
    processor.sanitize.mockRejectedValue(
      new ImageProcessingError('MAGIC_MIME_MISMATCH'),
    );

    await expect(
      service.completeUpload({ creatorId, pageId, imageId }),
    ).rejects.toBeInstanceOf(MediaImageProcessingFailedError);

    expect(repository.markImageFailed.mock.calls).toEqual([
      [
        expect.objectContaining({
          failureCode: 'MAGIC_MIME_MISMATCH',
          expectedSourceStorageKey: image.sourceStorageKey,
        }),
      ],
    ]);
    expect(storage.putObject.mock.calls).toHaveLength(0);
  });

  it('AC-7 persists the safe code when the claimed source is missing', async () => {
    const image = createImage({
      state: 'SANITIZING',
      sourceStorageKey: null,
    });
    repository.claimImage.mockResolvedValue({ type: 'claimed', image });

    await expect(
      service.completeUpload({ creatorId, pageId, imageId }),
    ).rejects.toMatchObject({ failureCode: 'SOURCE_MISSING' });

    expect(repository.markImageFailed.mock.calls).toEqual([
      [
        expect.objectContaining({
          failureCode: 'SOURCE_MISSING',
        }),
      ],
    ]);
  });

  it('AC-13 excludes provider messages and stack locations from completion logs', async () => {
    const image = createImage({ state: 'SANITIZING' });
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const providerError = Object.assign(
      new Error(`private object ${image.sourceStorageKey} and credentials`),
      {
        code: 'AccessDenied',
        $metadata: { httpStatusCode: 503 },
      },
    );
    repository.claimImage.mockResolvedValue({ type: 'claimed', image });
    storage.getObject.mockRejectedValue(providerError);

    await expect(
      service.completeUpload({ creatorId, pageId, imageId }),
    ).rejects.toBeInstanceOf(MediaStorageError);

    expect(loggerError).toHaveBeenCalledWith({
      event: 'image_completion_failed',
      stage: 'read_source',
      imageId,
      errorCode: 'AccessDenied',
      errorName: 'Error',
      statusCode: 503,
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain(
      image.sourceStorageKey,
    );
  });

  it('AC-11 rejects a second completion while the processing lease is active', async () => {
    repository.claimImage.mockResolvedValue({ type: 'processing' });

    await expect(
      service.completeUpload({ creatorId, pageId, imageId }),
    ).rejects.toBeInstanceOf(MediaImageProcessingError);

    expect(storage.getObject.mock.calls).toHaveLength(0);
  });

  it('AC-10 reserves a processing slot before claiming an image lease', async () => {
    const image = createImage({ state: 'SANITIZING' });
    const ready = createImage({
      state: 'READY',
      sourceStorageKey: null,
      storageKey: `pages/${pageId}/images/${imageId}.webp`,
      outputByteSize: 2048,
      outputSha256: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
      width: 640,
      height: 480,
    });
    const source = {
      body: Buffer.from('source'),
      contentType: 'image/png',
      contentLength: 6,
      checksumSha256: image.sourceSha256,
    };
    const readResolvers: Array<(value: typeof source) => void> = [];
    repository.claimImage.mockResolvedValue({ type: 'claimed', image });
    repository.markImageReady.mockResolvedValue(ready);
    storage.getObject.mockImplementation(
      () =>
        new Promise((resolve) => {
          readResolvers.push(resolve);
        }),
    );
    processor.sanitize.mockResolvedValue({
      body: Buffer.from('webp'),
      byteSize: 2048,
      checksum: ready.outputSha256 ?? '',
      width: 640,
      height: 480,
    });

    const first = service.completeUpload({ creatorId, pageId, imageId });
    const second = service.completeUpload({ creatorId, pageId, imageId });
    await new Promise((resolve) => setImmediate(resolve));

    await expect(
      service.completeUpload({ creatorId, pageId, imageId }),
    ).rejects.toBeInstanceOf(MediaRateLimitError);
    expect(repository.claimImage.mock.calls).toHaveLength(2);

    for (const resolveRead of readResolvers) resolveRead(source);
    await Promise.all([first, second]);
  });

  it('AC-7 maps an owner image list miss to the same safe page not found error', async () => {
    repository.listOwnerImages.mockResolvedValue(null);

    await expect(
      service.listOwnerImages({ creatorId, pageId }),
    ).rejects.toBeInstanceOf(MediaPageNotFoundError);
  });

  it('AC-7 returns the exact stored bytes for an owner ready image', async () => {
    const body = Buffer.from('owner-webp');
    const storageKey = `pages/${pageId}/images/${imageId}.webp`;
    repository.getOwnerImage.mockResolvedValue(
      createImage({ state: 'READY', storageKey }),
    );
    storage.getObject.mockResolvedValue({
      body,
      contentType: 'image/webp',
      contentLength: body.length,
      checksumSha256: 'checksum',
    });

    await expect(
      service.getOwnerMedia({ creatorId, pageId, imageId }),
    ).resolves.toEqual(body);

    expect(storage.getObject.mock.calls).toEqual([[storageKey]]);
  });

  it('AC-9 returns the exact stored bytes for an attached public image', async () => {
    const body = Buffer.from('public-webp');
    const storageKey = `pages/${pageId}/images/${imageId}.webp`;
    repository.getPublicImage.mockResolvedValue(
      createImage({ state: 'READY', storageKey, attachedAt: new Date() }),
    );
    storage.getObject.mockResolvedValue({
      body,
      contentType: 'image/webp',
      contentLength: body.length,
      checksumSha256: 'checksum',
    });

    await expect(
      service.getPublicMedia({ slug: 'my-letter', imageId }),
    ).resolves.toEqual(body);

    expect(repository.getPublicImage.mock.calls).toEqual([
      [{ slug: 'my-letter', imageId }],
    ]);
    expect(storage.getObject.mock.calls).toEqual([[storageKey]]);
  });

  it('AC-14 replaces provider read failures with a safe storage error', async () => {
    repository.getPublicImage.mockResolvedValue(
      createImage({
        state: 'READY',
        storageKey: `pages/${pageId}/images/${imageId}.webp`,
      }),
    );
    storage.getObject.mockRejectedValue(
      new Error('provider credentials and object key must stay private'),
    );

    await expect(
      service.getPublicMedia({ slug: 'my-letter', imageId }),
    ).rejects.toEqual(new MediaStorageError());
  });

  it('AC-12 retries the same image record with a fresh source key', async () => {
    const image = createImage({ state: 'UPLOADING' });
    repository.retryImage.mockResolvedValue({ type: 'retried', image });
    storage.createUploadUrl.mockImplementation((input) =>
      Promise.resolve({
        key: input.key,
        uploadUrl: 'https://uploads.example.test/retry',
        expiresAt: new Date('2026-08-11T02:00:00.000Z'),
        requiredHeaders: {
          contentType: input.contentType,
          sha256: input.sha256,
        },
      }),
    );

    await expect(
      service.retryUpload({ creatorId, pageId, imageId }),
    ).resolves.toMatchObject({
      imageId,
      uploadUrl: 'https://uploads.example.test/retry',
      state: 'UPLOADING',
    });

    const retryInput = repository.retryImage.mock.calls[0]?.[0];
    expect(retryInput?.sourceStorageKey).toMatch(
      new RegExp(`^pages/${pageId}/sources/${imageId}-[0-9a-f-]+$`),
    );
    expect(storage.createUploadUrl.mock.calls[0]?.[0]).toMatchObject({
      contentType: image.sourceMimeType,
      key: retryInput?.sourceStorageKey,
      sha256: image.sourceSha256,
    });
  });

  it('AC-12 keeps a failed retry private and records its source for cleanup', async () => {
    const image = createImage({ state: 'UPLOADING' });
    repository.retryImage.mockResolvedValue({ type: 'retried', image });
    storage.createUploadUrl.mockRejectedValue(
      new Error('provider unavailable'),
    );

    await expect(
      service.retryUpload({ creatorId, pageId, imageId }),
    ).rejects.toBeInstanceOf(MediaStorageError);

    const sourceStorageKey =
      repository.retryImage.mock.calls[0]?.[0].sourceStorageKey;
    expect(repository.markImageFailed.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId,
          imageId,
          failureCode: 'STORAGE_UNAVAILABLE',
          cleanupKeys: [sourceStorageKey],
          expectedSourceStorageKey: sourceStorageKey,
        },
      ],
    ]);
  });

  it('AC-5 keeps attached image removal behind the page save operation', async () => {
    repository.removeImage.mockResolvedValue({ type: 'attached' });

    await expect(
      service.removeUpload({ creatorId, pageId, imageId }),
    ).rejects.toBeInstanceOf(MediaImageAttachedError);
  });
});
