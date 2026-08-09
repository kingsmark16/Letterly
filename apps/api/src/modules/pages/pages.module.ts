import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PageService } from './application/page.service';
import { PAGES_REPOSITORY } from './application/pages.repository';
import { TEMPLATE_VERSION_READER } from './application/template-version.reader';
import { PrismaPagesRepository } from './infrastructure/prisma-pages.repository';
import { PrismaTemplateVersionReader } from './infrastructure/prisma-template-version.reader';
import { PagesController } from './pages.controller';

@Module({
  imports: [AuthModule],
  controllers: [PagesController],
  providers: [
    PageService,
    PrismaPagesRepository,
    PrismaTemplateVersionReader,
    {
      provide: PAGES_REPOSITORY,
      useExisting: PrismaPagesRepository,
    },
    {
      provide: TEMPLATE_VERSION_READER,
      useExisting: PrismaTemplateVersionReader,
    },
  ],
  exports: [PageService],
})
export class PagesModule {}
