import { PublicPageAnalyticsController } from './presentation/public-page-analytics.controller';
import { PublicPageMediaController } from './presentation/public-page-media.controller';
import { OwnerPageAudioController } from './presentation/owner-page-audio.controller';
import { OwnerPageImagesController } from './presentation/owner-page-images.controller';
import { OwnerPagesController } from './presentation/owner-pages.controller';
import { OwnerPageAnalyticsController } from './presentation/owner-page-analytics.controller';
import { OwnerPageJourneysController } from './presentation/owner-page-journeys.controller';
import { OwnerPageQuestionsController } from './presentation/owner-page-questions.controller';
import { OwnerPagePasswordController } from './presentation/owner-page-password.controller';
import { OwnerPageSubmissionsController } from './presentation/owner-page-submissions.controller';
import { ListOwnerPages } from './application/list-owner-pages';
import type { PagesRepository } from './application/pages.repository';
import { Module, type FactoryProvider } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitModule } from '../../infrastructure/http/rate-limit.module';
import { APP_ORIGIN, PageService } from './application/page.service';
import { PAGES_REPOSITORY } from './application/pages.repository';
import {
  TEMPLATE_VERSION_READER,
  type TemplateVersionReader,
} from './application/template-version.reader';
import {
  PUBLIC_PAGE_READ_FAILURE_LOGGER,
  type PublicPageReadFailureLogger,
} from './application/public-page-read-failure-logger';
import { StructuredPublicPageReadFailureLogger } from './infrastructure/structured-public-page-read-failure-logger';
import { PrismaPagesRepository } from './infrastructure/prisma-pages.repository';
import { PrismaTemplateVersionReader } from './infrastructure/prisma-template-version.reader';
import { PublicPageSubmissionsController } from './presentation/public-page-submissions.controller';
import { PublicPageReportsController } from './presentation/public-page-reports.controller';
import { PublicPageUnlockController } from './presentation/public-page-unlock.controller';
import { PublicPagesController } from './pages.controller';
import { loadConfig } from '@letterly/config';
import { VISITOR_IDENTITY_SECRET } from '../../infrastructure/http/visitor-identity';
import { MEDIA_STORAGE, type MediaStorage } from './application/media-storage';
import { R2Storage } from '../../infrastructure/storage/r2-storage';
import {
  PAGE_MEDIA_REPOSITORY,
  type PageMediaRepository,
} from './application/page-media.repository';
import { PageMediaService } from './application/page-media.service';
import { PageAudioService } from './application/page-audio.service';
import {
  PageAudioLinkService,
  YOUTUBE_LINKS_ENABLED,
} from './application/page-audio-link.service';
import {
  PAGE_AUDIO_LINK_REPOSITORY,
  type PageAudioLinkRepository,
} from './application/page-audio-link.repository';
import {
  YOUTUBE_METADATA_CACHE,
  YOUTUBE_METADATA_PROVIDER,
  type YouTubeMetadataProvider,
  type YouTubeMetadataCache,
} from './application/youtube-metadata';
import { MediaCleanupService } from './application/media-cleanup.service';
import type { MediaCleanupRunner } from './application/media-cleanup';
import { MediaCleanupScheduler } from './infrastructure/media-cleanup.scheduler';
import {
  IMAGE_PROCESSOR,
  type ImageProcessingPort,
} from './application/image-processor';
import {
  PAGE_MEDIA_FAILURE_LOGGER,
  type PageMediaFailureLogger,
} from './application/page-media-failure-logger';
import { StructuredPageMediaFailureLogger } from './infrastructure/structured-page-media-failure-logger';
import { ImageProcessor } from './infrastructure/image-processor';
import { PrismaPageMediaRepository } from './infrastructure/prisma-page-media.repository';
import { PrismaPageAudioRepository } from './infrastructure/prisma-page-audio.repository';
import { PrismaPageAudioLinkRepository } from './infrastructure/prisma-page-audio-link.repository';
import {
  InMemoryYouTubeMetadataCache,
  RedisYouTubeMetadataCache,
  YouTubeDataApiMetadataProvider,
} from './infrastructure/youtube-video-metadata';
import {
  PAGE_AUDIO_REPOSITORY,
  type PageAudioRepository,
} from './application/page-audio.repository';
import { PageQuestionService } from './application/page-questions.service';
import {
  PAGE_QUESTIONS_REPOSITORY,
  type PageQuestionsRepository,
} from './application/page-questions.repository';
import { PrismaPageQuestionsRepository } from './infrastructure/prisma-page-questions.repository';
import { PageSubmissionsService } from './application/page-submissions.service';
import { PageAnalyticsService } from './application/page-analytics.service';
import {
  PAGE_ANALYTICS_REPOSITORY,
  type PageAnalyticsRepository,
} from './application/page-analytics.repository';
import { PrismaPageAnalyticsRepository } from './infrastructure/prisma-page-analytics.repository';
import {
  PAGE_SUBMISSIONS_REPOSITORY,
  type PageSubmissionsRepository,
} from './application/page-submissions.repository';
import { PrismaPageSubmissionsRepository } from './infrastructure/prisma-page-submissions.repository';
import { PagePasswordService } from './application/page-password.service';
import {
  PAGE_PASSWORD_REPOSITORY,
  type PagePasswordRepository,
} from './application/page-password.repository';
import { PrismaPagePasswordRepository } from './infrastructure/prisma-page-password.repository';
import { PageReportsService } from './application/page-reports.service';
import { PageJourneyService } from './application/page-journeys.service';
import {
  PAGE_JOURNEYS_REPOSITORY,
  type PageJourneysRepository,
} from './application/page-journeys.repository';
import { PageJourneySubmissionService } from './application/page-journey-submissions.service';
import {
  PAGE_JOURNEY_SUBMISSIONS_REPOSITORY,
  type PageJourneySubmissionRepository,
} from './application/page-journey-submissions.repository';
import {
  PAGE_REPORTS_REPOSITORY,
  type PageReportsRepository,
} from './application/page-reports.repository';
import { PrismaPageReportsRepository } from './infrastructure/prisma-page-reports.repository';
import { PrismaPageJourneysRepository } from './infrastructure/prisma-page-journeys.repository';
import { PrismaPageJourneySubmissionRepository } from './infrastructure/prisma-page-journey-submissions.repository';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './application/page-journey-metrics';
import { StructuredPageJourneyMetrics } from './infrastructure/structured-page-journey-metrics';
import {
  UNLOCK_PROOF_STORE,
  type UnlockProofStore,
} from './application/unlock-proof.store';
import { createConfiguredUnlockProofStore } from '../../infrastructure/http/unlock-proof.store';
import {
  PAGE_PASSWORD_ENCRYPTION_KEY,
  PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
} from './application/page-password.service';

export const pageServiceProvider: FactoryProvider<PageService> = {
  provide: PageService,
  useFactory: (
    repository: PagesRepository,
    templateReader: TemplateVersionReader,
    logger: PublicPageReadFailureLogger,
    appOrigin?: string,
    passwordService?: PagePasswordService,
    journeyService?: PageJourneyService,
    metrics?: PageJourneyMetrics,
  ) =>
    new PageService(
      repository,
      templateReader,
      logger,
      appOrigin,
      passwordService,
      journeyService,
      metrics,
    ),
  inject: [
    PAGES_REPOSITORY,
    TEMPLATE_VERSION_READER,
    PUBLIC_PAGE_READ_FAILURE_LOGGER,
    { token: APP_ORIGIN, optional: true },
    { token: PagePasswordService, optional: true },
    { token: PageJourneyService, optional: true },
    { token: PAGE_JOURNEY_METRICS, optional: true },
  ],
};

export const pageMediaServiceProvider: FactoryProvider<PageMediaService> = {
  provide: PageMediaService,
  useFactory: (
    repository: PageMediaRepository,
    storage: MediaStorage,
    processor: ImageProcessingPort,
    logger: PageMediaFailureLogger,
  ) => new PageMediaService(repository, storage, processor, logger),
  inject: [
    PAGE_MEDIA_REPOSITORY,
    MEDIA_STORAGE,
    IMAGE_PROCESSOR,
    PAGE_MEDIA_FAILURE_LOGGER,
  ],
};

export const mediaCleanupServiceProvider: FactoryProvider<MediaCleanupService> =
  {
    provide: MediaCleanupService,
    useFactory: (
      repository: PageMediaRepository,
      storage: MediaStorage,
      audioRepository?: PageAudioRepository,
    ) => new MediaCleanupService(repository, storage, audioRepository),
    inject: [
      PAGE_MEDIA_REPOSITORY,
      MEDIA_STORAGE,
      { token: PAGE_AUDIO_REPOSITORY, optional: true },
    ],
  };

export const pageAudioServiceProvider: FactoryProvider<PageAudioService> = {
  provide: PageAudioService,
  useFactory: (
    repository: PageAudioRepository,
    storage: MediaStorage,
    cleanup?: MediaCleanupRunner,
  ) => new PageAudioService(repository, storage, cleanup),
  inject: [
    PAGE_AUDIO_REPOSITORY,
    MEDIA_STORAGE,
    { token: MediaCleanupService, optional: true },
  ],
};

export const pageAudioLinkServiceProvider: FactoryProvider<PageAudioLinkService> =
  {
    provide: PageAudioLinkService,
    useFactory: (
      repository: PageAudioLinkRepository,
      provider: YouTubeMetadataProvider,
      cache: YouTubeMetadataCache,
      linksEnabled: boolean,
    ) => new PageAudioLinkService(repository, provider, cache, linksEnabled),
    inject: [
      PAGE_AUDIO_LINK_REPOSITORY,
      YOUTUBE_METADATA_PROVIDER,
      YOUTUBE_METADATA_CACHE,
      YOUTUBE_LINKS_ENABLED,
    ],
  };

export const pageJourneySubmissionServiceProvider: FactoryProvider<PageJourneySubmissionService> =
  {
    provide: PageJourneySubmissionService,
    useFactory: (
      repository: PageJourneySubmissionRepository,
      metrics?: PageJourneyMetrics,
    ) => new PageJourneySubmissionService(repository, metrics),
    inject: [
      PAGE_JOURNEY_SUBMISSIONS_REPOSITORY,
      { token: PAGE_JOURNEY_METRICS, optional: true },
    ],
  };

export const pageJourneyServiceProvider: FactoryProvider<PageJourneyService> = {
  provide: PageJourneyService,
  useFactory: (
    repository: PageJourneysRepository,
    metrics?: PageJourneyMetrics,
  ) => new PageJourneyService(repository, metrics),
  inject: [
    PAGE_JOURNEYS_REPOSITORY,
    { token: PAGE_JOURNEY_METRICS, optional: true },
  ],
};

export const pageSubmissionsServiceProvider: FactoryProvider<PageSubmissionsService> =
  {
    provide: PageSubmissionsService,
    useFactory: (repository: PageSubmissionsRepository) =>
      new PageSubmissionsService(repository),
    inject: [PAGE_SUBMISSIONS_REPOSITORY],
  };

export const pageAnalyticsServiceProvider: FactoryProvider<PageAnalyticsService> =
  {
    provide: PageAnalyticsService,
    useFactory: (repository: PageAnalyticsRepository) =>
      new PageAnalyticsService(repository),
    inject: [PAGE_ANALYTICS_REPOSITORY],
  };

export const pageReportsServiceProvider: FactoryProvider<PageReportsService> = {
  provide: PageReportsService,
  useFactory: (repository: PageReportsRepository) =>
    new PageReportsService(repository),
  inject: [PAGE_REPORTS_REPOSITORY],
};

export const pageQuestionServiceProvider: FactoryProvider<PageQuestionService> =
  {
    provide: PageQuestionService,
    useFactory: (repository: PageQuestionsRepository) =>
      new PageQuestionService(repository),
    inject: [PAGE_QUESTIONS_REPOSITORY],
  };

export const pagePasswordServiceProvider: FactoryProvider<PagePasswordService> =
  {
    provide: PagePasswordService,
    useFactory: (
      repository: PagePasswordRepository,
      proofStore: UnlockProofStore,
      encryptionKey?: string,
      encryptionKeyVersion?: string,
    ) =>
      new PagePasswordService(
        repository,
        proofStore,
        encryptionKey,
        encryptionKeyVersion,
      ),
    inject: [
      PAGE_PASSWORD_REPOSITORY,
      UNLOCK_PROOF_STORE,
      { token: PAGE_PASSWORD_ENCRYPTION_KEY, optional: true },
      { token: PAGE_PASSWORD_ENCRYPTION_KEY_VERSION, optional: true },
    ],
  };

@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [
    OwnerPageImagesController,
    OwnerPageAudioController,
    OwnerPagesController,
    OwnerPageAnalyticsController,
    OwnerPageJourneysController,
    OwnerPageQuestionsController,
    OwnerPagePasswordController,
    OwnerPageSubmissionsController,
    PublicPageMediaController,
    PublicPageAnalyticsController,
    PublicPageSubmissionsController,
    PublicPageReportsController,
    PublicPageUnlockController,
    PublicPagesController,
  ],
  providers: [
    {
      provide: ListOwnerPages,
      useFactory: (repository: PagesRepository) =>
        new ListOwnerPages(repository),
      inject: [PAGES_REPOSITORY],
    },
    pageServiceProvider,
    StructuredPublicPageReadFailureLogger,
    {
      provide: PUBLIC_PAGE_READ_FAILURE_LOGGER,
      useExisting: StructuredPublicPageReadFailureLogger,
    },
    pageMediaServiceProvider,
    StructuredPageMediaFailureLogger,
    {
      provide: PAGE_MEDIA_FAILURE_LOGGER,
      useExisting: StructuredPageMediaFailureLogger,
    },
    pageAudioServiceProvider,
    pageAudioLinkServiceProvider,
    pageQuestionServiceProvider,
    pageSubmissionsServiceProvider,
    pageAnalyticsServiceProvider,
    pagePasswordServiceProvider,
    pageReportsServiceProvider,
    pageJourneyServiceProvider,
    pageJourneySubmissionServiceProvider,
    mediaCleanupServiceProvider,
    MediaCleanupScheduler,
    PrismaPagesRepository,
    PrismaPageMediaRepository,
    PrismaPageAudioRepository,
    PrismaPageAudioLinkRepository,
    PrismaPageQuestionsRepository,
    PrismaPageSubmissionsRepository,
    PrismaPageAnalyticsRepository,
    PrismaPagePasswordRepository,
    PrismaPageReportsRepository,
    PrismaPageJourneysRepository,
    PrismaPageJourneySubmissionRepository,
    StructuredPageJourneyMetrics,
    PrismaTemplateVersionReader,
    ImageProcessor,
    { provide: IMAGE_PROCESSOR, useExisting: ImageProcessor },
    R2Storage,
    {
      provide: PAGES_REPOSITORY,
      useExisting: PrismaPagesRepository,
    },
    {
      provide: TEMPLATE_VERSION_READER,
      useExisting: PrismaTemplateVersionReader,
    },
    {
      provide: PAGE_MEDIA_REPOSITORY,
      useExisting: PrismaPageMediaRepository,
    },
    {
      provide: PAGE_AUDIO_REPOSITORY,
      useExisting: PrismaPageAudioRepository,
    },
    {
      provide: PAGE_AUDIO_LINK_REPOSITORY,
      useExisting: PrismaPageAudioLinkRepository,
    },
    {
      provide: YOUTUBE_LINKS_ENABLED,
      useFactory: () => loadConfig().YOUTUBE_LINKS_ENABLED,
    },
    {
      provide: YOUTUBE_METADATA_PROVIDER,
      useFactory: () =>
        new YouTubeDataApiMetadataProvider(loadConfig().YOUTUBE_DATA_API_KEY),
    },
    {
      provide: YOUTUBE_METADATA_CACHE,
      useFactory: () => {
        const config = loadConfig();
        if (config.NODE_ENV !== 'production') {
          return new InMemoryYouTubeMetadataCache(config.NODE_ENV);
        }
        if (!config.REDIS_URL) {
          throw new Error(
            'REDIS_URL is required for the YouTube metadata cache',
          );
        }
        return new RedisYouTubeMetadataCache(config, config.REDIS_URL);
      },
    },
    {
      provide: PAGE_QUESTIONS_REPOSITORY,
      useExisting: PrismaPageQuestionsRepository,
    },
    {
      provide: PAGE_SUBMISSIONS_REPOSITORY,
      useExisting: PrismaPageSubmissionsRepository,
    },
    {
      provide: PAGE_ANALYTICS_REPOSITORY,
      useExisting: PrismaPageAnalyticsRepository,
    },
    {
      provide: PAGE_PASSWORD_REPOSITORY,
      useExisting: PrismaPagePasswordRepository,
    },
    {
      provide: PAGE_REPORTS_REPOSITORY,
      useExisting: PrismaPageReportsRepository,
    },
    {
      provide: PAGE_JOURNEYS_REPOSITORY,
      useExisting: PrismaPageJourneysRepository,
    },
    {
      provide: PAGE_JOURNEY_SUBMISSIONS_REPOSITORY,
      useExisting: PrismaPageJourneySubmissionRepository,
    },
    {
      provide: PAGE_JOURNEY_METRICS,
      useExisting: StructuredPageJourneyMetrics,
    },
    {
      provide: UNLOCK_PROOF_STORE,
      useFactory: () => createConfiguredUnlockProofStore(),
    },
    {
      provide: PAGE_PASSWORD_ENCRYPTION_KEY,
      useFactory: () => loadConfig().PAGE_PASSWORD_ENCRYPTION_KEY,
    },
    {
      provide: PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
      useFactory: () => loadConfig().PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
    },
    {
      provide: MEDIA_STORAGE,
      useExisting: R2Storage,
    },
    {
      provide: APP_ORIGIN,
      useFactory: () => loadConfig().APP_ORIGIN,
    },
    {
      provide: VISITOR_IDENTITY_SECRET,
      useFactory: () => {
        const config = loadConfig();
        return config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
      },
    },
  ],
  exports: [PageService, PageMediaService],
})
export class PagesModule {}
