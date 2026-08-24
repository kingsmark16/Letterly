import { Inject, Injectable } from '@nestjs/common';
import { secretLetterPrivateSettingsSchema } from '@letterly/templates';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import { resetPrismaAfterTransientError } from '../../../infrastructure/database/prisma-recovery';
import type {
  PagePasswordRepository,
  PublicPagePassword,
} from '../application/page-password.repository';
import { publicPageAvailabilityWhere } from '../application/public-availability';

@Injectable()
export class PrismaPagePasswordRepository implements PagePasswordRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async setOwnedPassword(input: {
    creatorId: string;
    pageId: string;
    password: Parameters<
      PagePasswordRepository['setOwnedPassword']
    >[0]['password'];
  }): Promise<'updated' | 'not_found'> {
    const page = await this.prisma.page.findFirst({
      where: { id: input.pageId, creatorId: input.creatorId },
      select: { settings: true },
    });
    if (!page) {
      return 'not_found';
    }

    const settings = secretLetterPrivateSettingsSchema.parse(page.settings);
    const result = await this.prisma.page.updateMany({
      where: { id: input.pageId, creatorId: input.creatorId },
      data: {
        settings: {
          ...settings,
          passwordProtection: input.password,
        },
      },
    });

    return result.count === 1 ? 'updated' : 'not_found';
  }

  async findPublishedPassword(
    slug: string,
  ): Promise<PublicPagePassword | null> {
    try {
      const page = await this.prisma.page.findFirst({
        where: publicPageAvailabilityWhere(slug),
        select: { id: true, settings: true },
      });
      if (!page) {
        return null;
      }

      const settings = secretLetterPrivateSettingsSchema.parse(page.settings);
      return settings.passwordProtection
        ? { pageId: page.id, password: settings.passwordProtection }
        : null;
    } catch (error: unknown) {
      await resetPrismaAfterTransientError(this.prisma, error);
      throw error;
    }
  }
}
