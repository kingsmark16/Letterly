import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PageAudioLinkService,
  YOUTUBE_LINKS_ENABLED,
  AudioLinkCreationDisabledError,
  AudioLinkLookupUnavailableError,
  AudioLinkUnavailableError,
} from '../src/modules/pages/application/page-audio-link.service';
import {
  PAGE_AUDIO_LINK_REPOSITORY,
  type PageAudioLinkRepository,
  type AudioSourceSlotSnapshot,
} from '../src/modules/pages/application/page-audio-link.repository';
import {
  YOUTUBE_METADATA_PROVIDER,
  YOUTUBE_METADATA_CACHE,
  type YouTubeMetadataProvider,
  type YouTubeMetadataCache,
} from '../src/modules/pages/application/youtube-metadata';
import { YouTubeLinkInvalidError } from '../src/modules/pages/application/youtube-url';
import {
  AudioPageNotFoundError,
  AudioCapabilityUnavailableError,
  AudioSourceOccupiedError,
  AudioUploadActiveError,
} from '../src/modules/pages/application/page-audio.service';
import { pageAudioLinkServiceProvider } from '../src/modules/pages/pages.module';

const videoId = 'dQw4w9WgXcQ';
const owner = { creatorId: 'creator-1', pageId: 'page-1' };
const input = { ...owner, url: ` https://youtu.be/${videoId}?t=20 ` };
const link = {
  id: 'link-1',
  pageId: owner.pageId,
  provider: 'YOUTUBE' as const,
  videoId,
};
const emptySlot: AudioSourceSlotSnapshot = {
  audioCapability: 'optional',
  currentAudioId: null,
  currentAudioLink: null,
  hasActiveUpload: false,
};
const fallback = {
  id: link.id,
  provider: 'YOUTUBE',
  videoId,
  displayTitle: 'YouTube song',
  durationSeconds: null,
  metadataExpiresAt: null,
};

function createPorts() {
  return {
    repository: {
      getOwnerAudioSlot:
        jest.fn<PageAudioLinkRepository['getOwnerAudioSlot']>(),
      attachAudioLink: jest.fn<PageAudioLinkRepository['attachAudioLink']>(),
      getPublicAudioLink:
        jest.fn<PageAudioLinkRepository['getPublicAudioLink']>(),
    },
    provider: { lookup: jest.fn<YouTubeMetadataProvider['lookup']>() },
    cache: {
      get: jest.fn<YouTubeMetadataCache['get']>().mockResolvedValue(null),
      set: jest.fn<YouTubeMetadataCache['set']>().mockResolvedValue(undefined),
      isQuotaCooldownActive: jest
        .fn<YouTubeMetadataCache['isQuotaCooldownActive']>()
        .mockResolvedValue(false),
      setQuotaCooldown: jest
        .fn<YouTubeMetadataCache['setQuotaCooldown']>()
        .mockResolvedValue(undefined),
    },
  };
}

describe('Audio link service factory composition', () => {
  let module: TestingModule | undefined;
  let ports: ReturnType<typeof createPorts>;
  beforeEach(() => {
    ports = createPorts();
    ports.repository.getOwnerAudioSlot.mockResolvedValue({
      type: 'found',
      slot: { ...emptySlot },
    });
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  function bindings(enabled: boolean) {
    return [
      { provide: PAGE_AUDIO_LINK_REPOSITORY, useValue: ports.repository },
      { provide: YOUTUBE_METADATA_PROVIDER, useValue: ports.provider },
      { provide: YOUTUBE_METADATA_CACHE, useValue: ports.cache },
      { provide: YOUTUBE_LINKS_ENABLED, useValue: enabled },
    ];
  }

  async function compose(enabled = true) {
    const builder = Test.createTestingModule({
      providers: [pageAudioLinkServiceProvider, ...bindings(true)],
    });
    for (const binding of bindings(enabled)) {
      builder.overrideProvider(binding.provide).useValue(binding.useValue);
    }
    module = await builder.compile();
    return module.get(PageAudioLinkService);
  }

  it.each(['created', 'existing'] as const)(
    'handles %s attachment through provider/cache overrides and retains singleton scope',
    async (type) => {
      const service = await compose();
      expect(module?.get(PageAudioLinkService)).toBe(service);
      ports.provider.lookup.mockResolvedValue({
        type: 'available',
        title: 'Fixture song',
        durationSeconds: 120,
      });
      ports.repository.attachAudioLink.mockResolvedValue({
        type,
        link,
      });
      const result = await service.addOwnerLink(input);
      expect(result).toMatchObject({
        created: type === 'created',
        audioLink: {
          id: link.id,
          provider: 'YOUTUBE',
          videoId,
          displayTitle: 'Fixture song',
          durationSeconds: 120,
        },
      });
      expect(result.audioLink.metadataExpiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(ports.repository.getOwnerAudioSlot.mock.calls).toEqual([[input]]);
      expect(ports.provider.lookup.mock.calls).toEqual([[videoId]]);
      const attached = ports.repository.attachAudioLink.mock.calls[0]?.[0];
      expect(attached).toMatchObject({ ...owner, videoId });
      expect(attached?.linkId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(ports.cache.set.mock.calls[0]?.[0]).toBe(videoId);
      expect(ports.cache.set.mock.calls[0]?.[2]).toBe(86400);
      expect(ports.cache.set.mock.calls[0]?.[1]).toMatchObject({
        type: 'available',
        metadata: { videoId, title: 'Fixture song', durationSeconds: 120 },
      });
    },
  );

  it('rejects invalid URLs before repository or provider I/O', async () => {
    const service = await compose();
    await expect(
      service.addOwnerLink({
        ...input,
        url: 'https://example.com/watch?v=dQw4w9WgXcQ',
      }),
    ).rejects.toBeInstanceOf(YouTubeLinkInvalidError);
    expect(ports.repository.getOwnerAudioSlot.mock.calls).toHaveLength(0);
    expect(ports.provider.lookup.mock.calls).toHaveLength(0);
  });

  it('injects false without losing existing-link access or allowing new creation', async () => {
    const service = await compose(false);
    await expect(service.addOwnerLink(input)).rejects.toBeInstanceOf(
      AudioLinkCreationDisabledError,
    );
    expect(ports.cache.get.mock.calls).toHaveLength(0);
    expect(ports.repository.attachAudioLink.mock.calls).toHaveLength(0);
    ports.repository.getOwnerAudioSlot.mockResolvedValue({
      type: 'found',
      slot: { ...emptySlot, currentAudioLink: link },
    });
    ports.cache.get.mockRejectedValue(new Error('fixture cache unavailable'));
    await expect(service.addOwnerLink(input)).resolves.toEqual({
      created: false,
      audioLink: fallback,
    });
    expect(ports.repository.attachAudioLink.mock.calls).toHaveLength(0);
  });

  it.each([
    [{ audioCapability: 'hidden' }, AudioCapabilityUnavailableError],
    [{ currentAudioId: 'audio-1' }, AudioSourceOccupiedError],
    [{ hasActiveUpload: true }, AudioUploadActiveError],
    [
      { currentAudioLink: { ...link, videoId: 'aaaaaaaaaaa' } },
      AudioSourceOccupiedError,
    ],
  ] as const)(
    'retains slot rejection %j before metadata lookup',
    async (changes, errorClass) => {
      const service = await compose();
      ports.repository.getOwnerAudioSlot.mockResolvedValue({
        type: 'found',
        slot: { ...emptySlot, ...changes },
      });
      await expect(service.addOwnerLink(input)).rejects.toBeInstanceOf(
        errorClass,
      );
      expect(ports.cache.get.mock.calls).toHaveLength(0);
      expect(ports.repository.attachAudioLink.mock.calls).toHaveLength(0);
    },
  );

  it('retains missing owner errors', async () => {
    const service = await compose();
    ports.repository.getOwnerAudioSlot.mockResolvedValue({ type: 'not_found' });
    await expect(service.addOwnerLink(input)).rejects.toBeInstanceOf(
      AudioPageNotFoundError,
    );
    await expect(service.getOwnerLink(owner)).rejects.toBeInstanceOf(
      AudioPageNotFoundError,
    );
  });

  it.each([
    ['not_found', AudioPageNotFoundError],
    ['unsupported_capability', AudioCapabilityUnavailableError],
    ['active_upload', AudioUploadActiveError],
    ['occupied', AudioSourceOccupiedError],
  ] as const)('maps attachment result %s', async (type, errorClass) => {
    const service = await compose();
    ports.provider.lookup.mockResolvedValue({
      type: 'available',
      title: 'Fixture song',
      durationSeconds: null,
    });
    ports.repository.attachAudioLink.mockResolvedValue({ type });
    await expect(service.addOwnerLink(input)).rejects.toBeInstanceOf(
      errorClass,
    );
  });

  it('rejects unavailable videos before attachment', async () => {
    const service = await compose();
    ports.provider.lookup.mockResolvedValue({ type: 'unavailable' });
    await expect(service.addOwnerLink(input)).rejects.toBeInstanceOf(
      AudioLinkUnavailableError,
    );
    expect(ports.repository.attachAudioLink.mock.calls).toHaveLength(0);
    expect(ports.cache.set.mock.calls[0]?.[2]).toBe(300);
  });

  it('maps provider failure to a safe lookup error before attachment', async () => {
    const service = await compose();
    ports.provider.lookup.mockRejectedValue(
      new Error('fixture provider unavailable'),
    );
    await expect(service.addOwnerLink(input)).rejects.toBeInstanceOf(
      AudioLinkLookupUnavailableError,
    );
    expect(ports.repository.attachAudioLink.mock.calls).toHaveLength(0);
  });

  it('retains owner and public scope forwarding and metadata failure fallback', async () => {
    const service = await compose();
    ports.repository.getOwnerAudioSlot.mockResolvedValue({
      type: 'found',
      slot: { ...emptySlot, currentAudioLink: link },
    });
    ports.repository.getPublicAudioLink.mockResolvedValue(link);
    ports.cache.get.mockRejectedValue(new Error('fixture cache unavailable'));
    await expect(service.getOwnerLink(owner)).resolves.toEqual(fallback);
    await expect(service.getPublicLink({ slug: 'letter42' })).resolves.toEqual(
      fallback,
    );
    expect(ports.repository.getOwnerAudioSlot.mock.calls).toEqual([[owner]]);
    expect(ports.repository.getPublicAudioLink.mock.calls).toEqual([
      [{ slug: 'letter42' }],
    ]);
    expect(ports.provider.lookup.mock.calls).toHaveLength(0);
  });

  it('returns null for absent owner/public links without metadata I/O', async () => {
    const service = await compose();
    ports.repository.getPublicAudioLink.mockResolvedValue(null);
    await expect(service.getOwnerLink(owner)).resolves.toBeNull();
    await expect(
      service.getPublicLink({ slug: 'letter42' }),
    ).resolves.toBeNull();
    expect(ports.cache.get.mock.calls).toHaveLength(0);
  });

  it.each([
    PAGE_AUDIO_LINK_REPOSITORY,
    YOUTUBE_METADATA_PROVIDER,
    YOUTUBE_METADATA_CACHE,
    YOUTUBE_LINKS_ENABLED,
  ])('requires dependency %s', async (token) => {
    await expect(
      Test.createTestingModule({
        providers: [
          pageAudioLinkServiceProvider,
          ...bindings(true).filter((binding) => binding.provide !== token),
        ],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      getOwnerLink: jest
        .fn<PageAudioLinkService['getOwnerLink']>()
        .mockResolvedValue(null),
    };
    module = await Test.createTestingModule({
      providers: [pageAudioLinkServiceProvider],
    })
      .overrideProvider(PageAudioLinkService)
      .useValue(replacement)
      .compile();
    expect(module.get(PageAudioLinkService)).toBe(replacement);
    await expect(
      module.get(PageAudioLinkService).getOwnerLink(owner),
    ).resolves.toBeNull();
  });
});
