import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PagesModule } from './modules/pages/pages.module';
import { AdminModule } from './modules/admin/admin.module';
import { MonitoringModule } from './infrastructure/monitoring/monitoring.module';
import { HealthModule } from './infrastructure/health/health.module';

@Module({
  imports: [
    PrismaModule,
    MonitoringModule,
    AuthModule,
    CatalogModule,
    PagesModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
