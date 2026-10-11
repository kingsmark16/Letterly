import { Module, type FactoryProvider } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../../infrastructure/config/app-config.module';
import { RateLimitModule } from '../../infrastructure/http/rate-limit.module';
import { loadConfig } from '@letterly/config';
import { AdminGuard } from './presentation/admin.guard';
import { AdminOriginGuard } from './presentation/admin-origin.guard';
import { AdminBootstrapService } from './application/admin-bootstrap.service';
import {
  ADMIN_BOOTSTRAP_REPOSITORY,
  type AdminBootstrapRepository,
} from './application/admin-bootstrap.repository';
import { PrismaAdminBootstrapRepository } from './infrastructure/prisma-admin-bootstrap.repository';
import { AdminController } from './presentation/admin.controller';
import {
  AdminCursorService,
  ADMIN_CURSOR_SIGNING_SECRET,
} from './infrastructure/admin-cursor.service';
import { AdminReportsService } from './application/admin-reports.service';
import {
  ADMIN_REPORTS_REPOSITORY,
  type AdminReportsRepository,
} from './application/admin-reports.repository';
import { PrismaAdminReportsRepository } from './infrastructure/prisma-admin-reports.repository';
import { AdminModerationService } from './application/admin-moderation.service';
import {
  ADMIN_MODERATION_REPOSITORY,
  type AdminModerationRepository,
} from './application/admin-moderation.repository';
import { PrismaAdminModerationRepository } from './infrastructure/prisma-admin-moderation.repository';
import { AdminAuditService } from './application/admin-audit.service';
import {
  ADMIN_AUDIT_REPOSITORY,
  type AdminAuditRepository,
} from './application/admin-audit.repository';
import { PrismaAdminAuditRepository } from './infrastructure/prisma-admin-audit.repository';
import { ADMIN_RETENTION_REPOSITORY } from './application/admin-retention.repository';
import { PrismaAdminRetentionRepository } from './infrastructure/prisma-admin-retention.repository';
import { AdminRetentionService } from './infrastructure/admin-retention.service';
import { ADMIN_CURSOR, type AdminCursorPort } from './application/admin-cursor';
import {
  ADMIN_ACCESS_REPOSITORY,
  type AdminAccessRepository,
} from './application/admin-access.repository';
import { AdminAccessService } from './application/admin-access.service';
import { PrismaAdminAccessRepository } from './infrastructure/prisma-admin-access.repository';

export const adminBootstrapServiceProvider = {
  provide: AdminBootstrapService,
  inject: [ADMIN_BOOTSTRAP_REPOSITORY],
  useFactory: (repository: AdminBootstrapRepository) =>
    new AdminBootstrapService(repository),
} satisfies FactoryProvider<AdminBootstrapService>;

export const adminReportsServiceProvider = {
  provide: AdminReportsService,
  inject: [ADMIN_REPORTS_REPOSITORY, ADMIN_CURSOR],
  useFactory: (repository: AdminReportsRepository, cursors: AdminCursorPort) =>
    new AdminReportsService(repository, cursors),
} satisfies FactoryProvider<AdminReportsService>;

export const adminAuditServiceProvider = {
  provide: AdminAuditService,
  inject: [ADMIN_AUDIT_REPOSITORY, ADMIN_CURSOR],
  useFactory: (repository: AdminAuditRepository, cursors: AdminCursorPort) =>
    new AdminAuditService(repository, cursors),
} satisfies FactoryProvider<AdminAuditService>;

export const adminModerationServiceProvider = {
  provide: AdminModerationService,
  inject: [ADMIN_MODERATION_REPOSITORY],
  useFactory: (repository: AdminModerationRepository) =>
    new AdminModerationService(repository),
} satisfies FactoryProvider<AdminModerationService>;

export const adminAccessServiceProvider = {
  provide: AdminAccessService,
  inject: [ADMIN_ACCESS_REPOSITORY],
  useFactory: (repository: AdminAccessRepository) =>
    new AdminAccessService(repository),
} satisfies FactoryProvider<AdminAccessService>;

@Module({
  imports: [AppConfigModule, AuthModule, RateLimitModule],
  controllers: [AdminController],
  providers: [
    AdminGuard,
    AdminOriginGuard,
    adminBootstrapServiceProvider,
    adminReportsServiceProvider,
    adminModerationServiceProvider,
    adminAuditServiceProvider,
    adminAccessServiceProvider,
    AdminRetentionService,
    AdminCursorService,
    { provide: ADMIN_CURSOR, useExisting: AdminCursorService },
    PrismaAdminAccessRepository,
    {
      provide: ADMIN_ACCESS_REPOSITORY,
      useExisting: PrismaAdminAccessRepository,
    },
    PrismaAdminBootstrapRepository,
    PrismaAdminReportsRepository,
    PrismaAdminModerationRepository,
    PrismaAdminAuditRepository,
    PrismaAdminRetentionRepository,
    {
      provide: ADMIN_BOOTSTRAP_REPOSITORY,
      useExisting: PrismaAdminBootstrapRepository,
    },
    {
      provide: ADMIN_CURSOR_SIGNING_SECRET,
      useFactory: () => {
        const config = loadConfig();
        return config.ADMIN_CURSOR_SIGNING_SECRET ?? config.BETTER_AUTH_SECRET;
      },
    },
    {
      provide: ADMIN_REPORTS_REPOSITORY,
      useExisting: PrismaAdminReportsRepository,
    },
    {
      provide: ADMIN_MODERATION_REPOSITORY,
      useExisting: PrismaAdminModerationRepository,
    },
    {
      provide: ADMIN_AUDIT_REPOSITORY,
      useExisting: PrismaAdminAuditRepository,
    },
    {
      provide: ADMIN_RETENTION_REPOSITORY,
      useExisting: PrismaAdminRetentionRepository,
    },
  ],
  exports: [AdminGuard, AdminOriginGuard, AdminBootstrapService],
})
export class AdminModule {}
