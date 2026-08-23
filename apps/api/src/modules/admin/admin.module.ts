import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { APP_ORIGIN } from '../pages/application/page.service';
import { loadConfig } from '@letterly/config';
import { AdminGuard } from './admin.guard';
import { AdminOriginGuard } from './admin-origin.guard';
import { AdminBootstrapService } from './admin-bootstrap.service';
import {
  ADMIN_BOOTSTRAP_REPOSITORY,
  PrismaAdminBootstrapRepository,
} from './admin-bootstrap.repository';
import { AdminController } from './admin.controller';
import {
  AdminCursorService,
  ADMIN_CURSOR_SIGNING_SECRET,
} from './admin-cursor.service';
import { AdminReportsService } from './admin-reports.service';
import {
  ADMIN_REPORTS_REPOSITORY,
  PrismaAdminReportsRepository,
} from './admin-reports.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    AdminGuard,
    AdminOriginGuard,
    AdminBootstrapService,
    AdminReportsService,
    AdminCursorService,
    PrismaAdminBootstrapRepository,
    PrismaAdminReportsRepository,
    {
      provide: ADMIN_BOOTSTRAP_REPOSITORY,
      useExisting: PrismaAdminBootstrapRepository,
    },
    {
      provide: APP_ORIGIN,
      useFactory: () => loadConfig().APP_ORIGIN,
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
  ],
  exports: [AdminGuard, AdminOriginGuard, AdminBootstrapService],
})
export class AdminModule {}
