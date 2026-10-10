import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  chooseYourHeartTemplate,
  chooseYourHeartDefaultGraph,
} from '@letterly/templates';
import {
  APP_ORIGIN,
  PageService,
  PublicPageReadUnavailableError,
  TemplateDefinitionUnavailableError,
} from '../src/modules/pages/application/page.service';
import {
  PAGES_REPOSITORY,
  type PagesRepository,
} from '../src/modules/pages/application/pages.repository';
import {
  TEMPLATE_VERSION_READER,
  type TemplateVersionReader,
} from '../src/modules/pages/application/template-version.reader';
import {
  PUBLIC_PAGE_READ_FAILURE_LOGGER,
  type PublicPageReadFailureLogger,
} from '../src/modules/pages/application/public-page-read-failure-logger';
import { PagePasswordService } from '../src/modules/pages/application/page-password.service';
import {
  PageJourneyService,
  PageJourneyInvalidStateError,
} from '../src/modules/pages/application/page-journeys.service';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from '../src/modules/pages/application/page-journey-metrics';
import { TransientPublicReadError } from '../src/modules/pages/application/transient-public-read.error';
import type {
  OwnerPage,
  PublicPage,
} from '../src/modules/pages/domain/page.types';
import { pageServiceProvider } from '../src/modules/pages/pages.module';

const owner = {
  creatorId: 'creator-1',
  pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
};
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';
const publicPage: PublicPage = {
  displaySlug: 'letter42',
  canonicalSlug: 'letter42',
  template: {
    registryKey: 'confession.secret-letter',
    key: 'secret-letter',
    version: 1,
  },
  recipientName: 'Juliet',
  mainMessage: 'Private fixture message',
};
const ownerPage: OwnerPage = {
  id: owner.pageId,
  creatorId: owner.creatorId,
  slug: 'letter42',
  displaySlug: 'letter42',
  status: 'DRAFT',
  contentVersion: 0,
  content: { recipientName: '', mainMessage: '', sections: [] },
  settings: {
    theme: 'romantic',
    fontStyle: 'handwritten',
    autoPlayMusic: false,
    music: null,
    responsesEnabled: false,
  },
  template: {
    id: 'template-1',
    key: 'choose-your-heart',
    name: 'Choose Your Heart',
    templateVersionId,
    version: 1,
    registryKey: 'confession.choose-your-heart',
  },
  createdAt: new Date('2026-10-03T01:00:00Z'),
  updatedAt: new Date('2026-10-03T01:00:00Z'),
};

function createPorts() {
  return {
    repository: {
      findPublicPageBySlug: jest
        .fn<PagesRepository['findPublicPageBySlug']>()
        .mockResolvedValue(publicPage),
      findOwnedPage: jest
        .fn<PagesRepository['findOwnedPage']>()
        .mockResolvedValue(ownerPage),
      createDraft: jest
        .fn<PagesRepository['createDraft']>()
        .mockResolvedValue(ownerPage),
      publishPage: jest.fn<PagesRepository['publishPage']>(),
    },
    reader: {
      findActiveById: jest
        .fn<TemplateVersionReader['findActiveById']>()
        .mockResolvedValue({
          id: templateVersionId,
          registryKey: chooseYourHeartTemplate.registryKey,
          version: 1,
        }),
      findById: jest.fn<TemplateVersionReader['findById']>(),
    },
    logger: { warn: jest.fn<PublicPageReadFailureLogger['warn']>() },
    password: {
      findPublicProtection: jest
        .fn<PagePasswordService['findPublicProtection']>()
        .mockResolvedValue({
          pageId: owner.pageId,
          passwordVersion: 'version-1',
        }),
      verifyUnlockToken: jest.fn<PagePasswordService['verifyUnlockToken']>(),
    },
    journey: { getOwned: jest.fn<PageJourneyService['getOwned']>() },
    metrics: { record: jest.fn<PageJourneyMetrics['record']>() },
  };
}

describe('Page service factory composition', () => {
  let module: TestingModule | undefined;
  let ports: ReturnType<typeof createPorts>;
  beforeEach(() => {
    ports = createPorts();
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
    jest.useRealTimers();
  });

  function required() {
    return [
      { provide: PAGES_REPOSITORY, useValue: ports.repository },
      { provide: TEMPLATE_VERSION_READER, useValue: ports.reader },
      { provide: PUBLIC_PAGE_READ_FAILURE_LOGGER, useValue: ports.logger },
    ];
  }
  async function compose(
    options: {
      origin?: string;
      password?: boolean;
      journey?: boolean;
      metrics?: boolean;
    } = {},
  ) {
    const bindings = [
      ...required(),
      ...(options.origin
        ? [{ provide: APP_ORIGIN, useValue: options.origin }]
        : []),
      ...(options.password
        ? [{ provide: PagePasswordService, useValue: ports.password }]
        : []),
      ...(options.journey
        ? [{ provide: PageJourneyService, useValue: ports.journey }]
        : []),
      ...(options.metrics
        ? [{ provide: PAGE_JOURNEY_METRICS, useValue: ports.metrics }]
        : []),
    ];
    const builder = Test.createTestingModule({
      providers: [
        pageServiceProvider,
        ...bindings.map((binding) => ({
          provide: binding.provide,
          useValue: {},
        })),
      ],
    });
    for (const binding of bindings)
      builder.overrideProvider(binding.provide).useValue(binding.useValue);
    module = await builder.compile();
    return module.get(PageService);
  }

  it.each([undefined, 'https://letterly.example'])(
    'preserves the origin default or override: %s',
    async (origin) => {
      const service = await compose({ origin });
      expect(module?.get(PageService)).toBe(service);
      await expect(service.getPublicPage(' Letter42 ')).resolves.toMatchObject({
        canonicalUrl: `${origin ?? 'http://localhost:3000'}/p/letter42`,
        mainMessage: publicPage.mainMessage,
      });
      expect(ports.repository.findPublicPageBySlug.mock.calls).toEqual([
        ['letter42'],
      ]);
      expect(ports.password.findPublicProtection.mock.calls).toHaveLength(0);
    },
  );

  it.each([false, true])(
    'injects password checks and page-scoped proofs, unlocked: %s',
    async (unlocked) => {
      const service = await compose({ password: true });
      ports.password.verifyUnlockToken.mockResolvedValue(unlocked);
      const readToken = jest
        .fn<(pageId: string) => string>()
        .mockReturnValue('fixture-proof');
      const result = await service.getPublicPage('letter42', readToken);
      expect(ports.password.findPublicProtection.mock.calls).toEqual([
        ['letter42'],
      ]);
      expect(readToken.mock.calls).toEqual([[owner.pageId]]);
      expect(ports.password.verifyUnlockToken.mock.calls).toEqual([
        [owner.pageId, 'version-1', 'fixture-proof'],
      ]);
      if (unlocked) {
        expect(result).toMatchObject({ mainMessage: publicPage.mainMessage });
      } else {
        expect(result).toEqual({
          state: 'LOCKED',
          displaySlug: 'letter42',
          canonicalUrl: 'http://localhost:3000/p/letter42',
          recipientName: 'Juliet',
          template: publicPage.template,
        });
      }
    },
  );

  it.each([true, false])(
    'creates validated journey defaults with metrics enabled: %s',
    async (metrics) => {
      const service = await compose({ metrics });
      await expect(
        service.createDraft({ creatorId: owner.creatorId, templateVersionId }),
      ).resolves.toBe(ownerPage);
      expect(ports.reader.findActiveById.mock.calls).toEqual([
        [templateVersionId],
      ]);
      expect(ports.repository.createDraft.mock.calls[0]?.[0]).toMatchObject({
        creatorId: owner.creatorId,
        templateVersionId,
        template: { registryKey: 'confession.choose-your-heart', version: 1 },
        journey: { graph: chooseYourHeartDefaultGraph, maxDepth: 1 },
      });
      expect(ports.metrics.record.mock.calls).toEqual(
        metrics
          ? [
              [
                {
                  event: 'journey_graph_validation',
                  templateKey: 'choose-your-heart',
                  outcome: 'valid',
                  questionCount: 1,
                  outcomeCount: 2,
                  issueCount: 0,
                },
              ],
            ]
          : [],
      );
    },
  );

  it.each([true, false])(
    'retains journey publication dependency checks, journey enabled: %s',
    async (journey) => {
      const service = await compose({ journey, metrics: true });
      const failure = new PageJourneyInvalidStateError();
      ports.journey.getOwned.mockRejectedValue(failure);
      const result = service.publishPage({ ...owner, confirmReady: true });
      if (journey) await expect(result).rejects.toBe(failure);
      else
        await expect(result).rejects.toBeInstanceOf(
          TemplateDefinitionUnavailableError,
        );
      expect(ports.journey.getOwned.mock.calls).toEqual(
        journey ? [[owner]] : [],
      );
      expect(ports.repository.publishPage.mock.calls).toHaveLength(0);
      expect(ports.metrics.record.mock.calls).toEqual([
        [
          {
            event: 'journey_publish',
            templateKey: 'choose-your-heart',
            outcome: journey ? 'conflict' : 'unavailable',
          },
        ],
      ]);
    },
  );

  it.each([
    'page_repository',
    'password_repository',
    'projection_validation',
  ] as const)('retains %s warning metadata and safe errors', async (stage) => {
    const service = await compose({
      password: stage === 'password_repository',
    });
    const failure = new Error('Private provider message');
    if (stage === 'page_repository')
      ports.repository.findPublicPageBySlug.mockRejectedValue(failure);
    if (stage === 'password_repository')
      ports.password.findPublicProtection.mockRejectedValue(failure);
    if (stage === 'projection_validation')
      ports.repository.findPublicPageBySlug.mockResolvedValue({
        ...publicPage,
        images: [
          {
            imageId: 'invalid-image-id',
            mediaUrl: '/fixture-image',
            caption: null,
          },
        ],
      });
    await expect(service.getPublicPage('letter42')).rejects.toBeInstanceOf(
      PublicPageReadUnavailableError,
    );
    expect(ports.logger.warn.mock.calls).toEqual([
      [
        {
          event: 'public_page_read_failed',
          stage,
          errorName: stage === 'projection_validation' ? 'ZodError' : 'Error',
          errorCode: undefined,
        },
      ],
    ]);
    expect(JSON.stringify(ports.logger.warn.mock.calls)).not.toContain(
      failure.message,
    );
  });

  it('preserves bounded transient retries through the factory-provided logger', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const service = await compose();
    const original = Object.assign(new Error('Private database details'), {
      code: 'P2024',
    });
    ports.repository.findPublicPageBySlug.mockRejectedValue(
      new TransientPublicReadError(original),
    );
    const result = expect(
      service.getPublicPage('letter42'),
    ).rejects.toBeInstanceOf(PublicPageReadUnavailableError);
    await jest.advanceTimersByTimeAsync(300);
    await result;
    expect(ports.repository.findPublicPageBySlug.mock.calls).toHaveLength(3);
    expect(ports.logger.warn.mock.calls).toEqual([
      [
        {
          event: 'public_page_read_failed',
          stage: 'page_repository',
          errorName: 'Error',
          errorCode: 'P2024',
        },
      ],
    ]);
  });

  it.each([
    PAGES_REPOSITORY,
    TEMPLATE_VERSION_READER,
    PUBLIC_PAGE_READ_FAILURE_LOGGER,
  ])('requires dependency %s', async (token) => {
    await expect(
      Test.createTestingModule({
        providers: [
          pageServiceProvider,
          ...required().filter((binding) => binding.provide !== token),
        ],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      getOwnedPage: jest
        .fn<PageService['getOwnedPage']>()
        .mockResolvedValue(ownerPage),
    };
    module = await Test.createTestingModule({
      providers: [pageServiceProvider],
    })
      .overrideProvider(PageService)
      .useValue(replacement)
      .compile();
    expect(module.get(PageService)).toBe(replacement);
    await expect(module.get(PageService).getOwnedPage(owner)).resolves.toBe(
      ownerPage,
    );
  });
});
