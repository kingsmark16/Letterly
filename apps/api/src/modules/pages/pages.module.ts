import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitModule } from '../../infrastructure/http/rate-limit.module';
import { APP_ORIGIN, PageService } from './application/page.service';
import { PAGES_REPOSITORY } from './application/pages.repository';
import { TEMPLATE_VERSION_READER } from './application/template-version.reader';
import { PrismaPagesRepository } from './infrastructure/prisma-pages.repository';
import { PrismaTemplateVersionReader } from './infrastructure/prisma-template-version.reader';
import { PagesController, PublicPagesController } from './pages.controller';
import { loadConfig } from '@letterly/config';
import { VISITOR_IDENTITY_SECRET } from '../../infrastructure/http/visitor-identity';
import { MEDIA_STORAGE } from '../../infrastructure/storage/media-storage';
import { R2Storage } from '../../infrastructure/storage/r2-storage';
import { PAGE_MEDIA_REPOSITORY } from './application/page-media.repository';
import { PageMediaService } from './application/page-media.service';
import { MediaCleanupService } from './application/media-cleanup.service';
import { ImageProcessor } from './infrastructure/image-processor';
import { PrismaPageMediaRepository } from './infrastructure/prisma-page-media.repository';
import { PageQuestionService } from './application/page-questions.service';
import { PAGE_QUESTIONS_REPOSITORY } from './application/page-questions.repository';
import { PrismaPageQuestionsRepository } from './infrastructure/prisma-page-questions.repository';
import { PageSubmissionsService } from './application/page-submissions.service';
import { PAGE_SUBMISSIONS_REPOSITORY } from './application/page-submissions.repository';
import { PrismaPageSubmissionsRepository } from './infrastructure/prisma-page-submissions.repository';
import { PagePasswordService } from './application/page-password.service';
import { PAGE_PASSWORD_REPOSITORY } from './application/page-password.repository';
import { PrismaPagePasswordRepository } from './infrastructure/prisma-page-password.repository';
import { PageReportsService } from './application/page-reports.service';
import { PageJourneyService } from './application/page-journeys.service';
import { PAGE_JOURNEYS_REPOSITORY } from './application/page-journeys.repository';
import { PageJourneySubmissionService } from './application/page-journey-submissions.service';
import { PAGE_JOURNEY_SUBMISSIONS_REPOSITORY } from './application/page-journey-submissions.repository';
import { PAGE_REPORTS_REPOSITORY } from './application/page-reports.repository';
import { PrismaPageReportsRepository } from './infrastructure/prisma-page-reports.repository';
import { PrismaPageJourneysRepository } from './infrastructure/prisma-page-journeys.repository';
import { PrismaPageJourneySubmissionRepository } from './infrastructure/prisma-page-journey-submissions.repository';
import { PAGE_JOURNEY_METRICS } from './application/page-journey-metrics';
import { StructuredPageJourneyMetrics } from './infrastructure/structured-page-journey-metrics';
import { UNLOCK_PROOF_STORE } from './application/unlock-proof.store';
import { createConfiguredUnlockProofStore } from '../../infrastructure/http/unlock-proof.store';
import {
  PAGE_PASSWORD_ENCRYPTION_KEY,
  PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
} from './application/page-password.service';

@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [PagesController, PublicPagesController],
  providers: [
    PageService,
    PageMediaService,
    PageQuestionService,
    PageSubmissionsService,
    PagePasswordService,
    PageReportsService,
    PageJourneyService,
    PageJourneySubmissionService,
    MediaCleanupService,
    PrismaPagesRepository,
    PrismaPageMediaRepository,
    PrismaPageQuestionsRepository,
    PrismaPageSubmissionsRepository,
    PrismaPagePasswordRepository,
    PrismaPageReportsRepository,
    PrismaPageJourneysRepository,
    PrismaPageJourneySubmissionRepository,
    StructuredPageJourneyMetrics,
    PrismaTemplateVersionReader,
    ImageProcessor,
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
      provide: PAGE_QUESTIONS_REPOSITORY,
      useExisting: PrismaPageQuestionsRepository,
    },
    {
      provide: PAGE_SUBMISSIONS_REPOSITORY,
      useExisting: PrismaPageSubmissionsRepository,
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
