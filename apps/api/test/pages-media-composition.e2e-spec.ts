import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PageMediaService,
  MediaStorageError,
  MediaImageProcessingFailedError,
  MediaRateLimitError,
  MediaPageNotFoundError,
} from '../src/modules/pages/application/page-media.service';
import {
  PAGE_MEDIA_REPOSITORY,
  type PageMediaRecord,
  type PageMediaRepository,
  type ClaimImageResult,
} from '../src/modules/pages/application/page-media.repository';
import {
  MEDIA_STORAGE,
  type MediaStorage,
} from '../src/modules/pages/application/media-storage';
import {
  IMAGE_PROCESSOR,
  ImageProcessingError,
  type ImageProcessingPort,
} from '../src/modules/pages/application/image-processor';
import {
  PAGE_MEDIA_FAILURE_LOGGER,
  type PageMediaFailureLogger,
} from '../src/modules/pages/application/page-media-failure-logger';
import { pageMediaServiceProvider } from '../src/modules/pages/pages.module';

const command = {
  creatorId: 'creator-1',
  pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
  imageId: '11111111-1111-4111-8111-111111111111',
};
const sourceKey = `pages/${command.pageId}/sources/${command.imageId}`;
const outputKey = `pages/${command.pageId}/images/${command.imageId}.webp`;
const image: PageMediaRecord = {
  id: command.imageId,
  pageId: command.pageId,
  state: 'SANITIZING',
  attachedAt: null,
  storageKey: null,
  sourceStorageKey: sourceKey,
  sourceMimeType: 'image/png',
  sourceByteSize: 6,
  sourceSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  outputByteSize: null,
  outputSha256: null,
  width: null,
  height: null,
  sortOrder: null,
  caption: null,
  failureCode: null,
  processingLeaseExpiresAt: null,
  uploadExpiresAt: new Date('2026-10-03T01:00:00Z'),
  expiresAt: null,
};
const ready: PageMediaRecord = {
  ...image,
  state: 'READY',
  sourceStorageKey: null,
  storageKey: outputKey,
  outputByteSize: 4,
  width: 640,
  height: 480,
};
const source = {
  body: Buffer.from('source'),
  contentType: 'image/png',
  contentLength: 6,
  checksumSha256: image.sourceSha256,
};
const sanitized = {
  body: Buffer.from('webp'),
  byteSize: 4,
  checksum: 'output-checksum',
  width: 640,
  height: 480,
};

function createPorts() {
  return {
    repository: {
      claimImage: jest
        .fn<PageMediaRepository['claimImage']>()
        .mockResolvedValue({ type: 'claimed', image }),
      markImageReady: jest
        .fn<PageMediaRepository['markImageReady']>()
        .mockResolvedValue(ready),
      markImageFailed: jest
        .fn<PageMediaRepository['markImageFailed']>()
        .mockResolvedValue(undefined),
    },
    storage: {
      getObject: jest.fn<MediaStorage['getObject']>().mockResolvedValue(source),
      putObject: jest
        .fn<MediaStorage['putObject']>()
        .mockResolvedValue(undefined),
      deleteObject: jest
        .fn<MediaStorage['deleteObject']>()
        .mockResolvedValue(undefined),
    },
    processor: {
      sanitize: jest
        .fn<ImageProcessingPort['sanitize']>()
        .mockResolvedValue(sanitized),
    },
    logger: { error: jest.fn<PageMediaFailureLogger['error']>() },
  };
}

describe('Media service factory composition', () => {
  let module: TestingModule | undefined;
  let ports: ReturnType<typeof createPorts>;
  beforeEach(() => {
    ports = createPorts();
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  function bindings() {
    return [
      { provide: PAGE_MEDIA_REPOSITORY, useValue: ports.repository },
      { provide: MEDIA_STORAGE, useValue: ports.storage },
      { provide: IMAGE_PROCESSOR, useValue: ports.processor },
      { provide: PAGE_MEDIA_FAILURE_LOGGER, useValue: ports.logger },
    ];
  }
  async function compose() {
    const builder = Test.createTestingModule({
      providers: [
        pageMediaServiceProvider,
        ...bindings().map((binding) => ({
          provide: binding.provide,
          useValue: {},
        })),
      ],
    });
    for (const binding of bindings())
      builder.overrideProvider(binding.provide).useValue(binding.useValue);
    module = await builder.compile();
    return module.get(PageMediaService);
  }

  it('retains singleton scope and sanitized completion ordering through all four overrides', async () => {
    const service = await compose();
    expect(module?.get(PageMediaService)).toBe(service);
    await expect(service.completeUpload(command)).resolves.toMatchObject({
      imageId: command.imageId,
      state: 'READY',
      outputByteSize: 4,
      width: 640,
      height: 480,
      mediaUrl: `/api/v1/pages/${command.pageId}/images/${command.imageId}`,
    });
    const claim = ports.repository.claimImage.mock.calls[0]?.[0];
    expect(claim).toMatchObject(command);
    expect(
      (claim?.leaseExpiresAt.getTime() ?? 0) - (claim?.now.getTime() ?? 0),
    ).toBe(180000);
    expect(ports.processor.sanitize.mock.calls).toEqual([
      [
        {
          body: source.body,
          expectedContentType: 'image/png',
          storedContentType: 'image/png',
          storedContentLength: 6,
          storedChecksumSha256: image.sourceSha256,
          expectedChecksumSha256: image.sourceSha256,
        },
      ],
    ]);
    expect(ports.storage.putObject.mock.calls).toEqual([
      [{ key: outputKey, body: sanitized.body, contentType: 'image/webp' }],
    ]);
    expect(ports.storage.deleteObject.mock.calls).toEqual([[sourceKey]]);
    expect(ports.repository.markImageReady.mock.calls).toEqual([
      [
        {
          creatorId: command.creatorId,
          pageId: command.pageId,
          imageId: command.imageId,
          storageKey: outputKey,
          outputByteSize: 4,
          outputSha256: sanitized.checksum,
          width: 640,
          height: 480,
          expectedSourceStorageKey: sourceKey,
        },
      ],
    ]);
    const order = [
      ports.storage.getObject,
      ports.processor.sanitize,
      ports.storage.putObject,
      ports.storage.deleteObject,
      ports.repository.markImageReady,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(ports.logger.error.mock.calls).toHaveLength(0);
  });

  it.each([
    'read_source',
    'write_output',
    'delete_source',
    'mark_ready',
  ] as const)(
    'retains %s failure logging, cleanup, and safe errors',
    async (stage) => {
      const service = await compose();
      const failure = Object.assign(
        new Error(`private source ${sourceKey} and credentials`),
        { code: 'AccessDenied', $metadata: { httpStatusCode: 503 } },
      );
      if (stage === 'read_source')
        ports.storage.getObject.mockRejectedValue(failure);
      if (stage === 'write_output')
        ports.storage.putObject.mockRejectedValue(failure);
      if (stage === 'delete_source')
        ports.storage.deleteObject.mockRejectedValue(failure);
      if (stage === 'mark_ready')
        ports.repository.markImageReady.mockRejectedValue(failure);
      await expect(service.completeUpload(command)).rejects.toBeInstanceOf(
        MediaStorageError,
      );
      expect(ports.logger.error.mock.calls).toEqual([
        [
          {
            event: 'image_completion_failed',
            stage,
            imageId: command.imageId,
            errorCode: 'AccessDenied',
            errorName: 'Error',
            statusCode: 503,
          },
        ],
      ]);
      expect(ports.repository.markImageFailed.mock.calls).toEqual([
        [
          {
            ...command,
            failureCode: 'STORAGE_UNAVAILABLE',
            cleanupKeys: [outputKey],
            expectedSourceStorageKey: sourceKey,
          },
        ],
      ]);
      expect(ports.logger.error.mock.invocationCallOrder[0]).toBeLessThan(
        ports.repository.markImageFailed.mock.invocationCallOrder[0],
      );
      expect(JSON.stringify(ports.logger.error.mock.calls)).not.toContain(
        sourceKey,
      );
      expect(JSON.stringify(ports.logger.error.mock.calls)).not.toContain(
        failure.message,
      );
    },
  );

  it('retains image processor failure codes without provider failure logging', async () => {
    const service = await compose();
    ports.processor.sanitize.mockRejectedValue(
      new ImageProcessingError('MAGIC_MIME_MISMATCH'),
    );
    await expect(service.completeUpload(command)).rejects.toMatchObject({
      name: MediaImageProcessingFailedError.name,
      failureCode: 'MAGIC_MIME_MISMATCH',
    });
    expect(ports.repository.markImageFailed.mock.calls).toEqual([
      [
        {
          ...command,
          failureCode: 'MAGIC_MIME_MISMATCH',
          cleanupKeys: [outputKey],
          expectedSourceStorageKey: sourceKey,
        },
      ],
    ]);
    expect(ports.logger.error.mock.calls).toHaveLength(0);
    expect(ports.storage.putObject.mock.calls).toHaveLength(0);
  });

  it.each([
    { count: 2, sameCreator: true },
    { count: 8, sameCreator: false },
  ])(
    'retains slot cap and releases after rejected claims: %j',
    async ({ count, sameCreator }) => {
      const service = await compose();
      const resolveClaims: Array<(value: ClaimImageResult) => void> = [];
      ports.repository.claimImage.mockImplementation(
        () => new Promise((resolve) => resolveClaims.push(resolve)),
      );
      const running = Array.from({ length: count }, (_, index) =>
        service
          .completeUpload({
            ...command,
            creatorId: sameCreator ? command.creatorId : `creator-${index}`,
          })
          .catch((error: unknown) => error),
      );
      await expect(
        service.completeUpload({
          ...command,
          creatorId: sameCreator ? command.creatorId : 'overflow-creator',
        }),
      ).rejects.toBeInstanceOf(MediaRateLimitError);
      expect(ports.repository.claimImage.mock.calls).toHaveLength(count);
      for (const resolve of resolveClaims) resolve({ type: 'not_found' });
      const results = await Promise.all(running);
      for (const result of results)
        expect(result).toBeInstanceOf(MediaPageNotFoundError);
      ports.repository.claimImage.mockResolvedValue({
        type: 'ready',
        image: ready,
      });
      await expect(service.completeUpload(command)).resolves.toMatchObject({
        state: 'READY',
      });
    },
  );

  it.each([
    PAGE_MEDIA_REPOSITORY,
    MEDIA_STORAGE,
    IMAGE_PROCESSOR,
    PAGE_MEDIA_FAILURE_LOGGER,
  ])('requires dependency %s', async (token) => {
    await expect(
      Test.createTestingModule({
        providers: [
          pageMediaServiceProvider,
          ...bindings().filter((binding) => binding.provide !== token),
        ],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      listOwnerImages: jest
        .fn<PageMediaService['listOwnerImages']>()
        .mockResolvedValue([]),
    };
    module = await Test.createTestingModule({
      providers: [pageMediaServiceProvider],
    })
      .overrideProvider(PageMediaService)
      .useValue(replacement)
      .compile();
    expect(module.get(PageMediaService)).toBe(replacement);
    await expect(
      module.get(PageMediaService).listOwnerImages(command),
    ).resolves.toEqual([]);
  });
});
