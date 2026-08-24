import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PagesModule } from './modules/pages/pages.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [PrismaModule, AuthModule, CatalogModule, PagesModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
