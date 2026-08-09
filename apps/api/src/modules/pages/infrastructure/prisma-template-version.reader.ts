import { Inject, Injectable } from '@nestjs/common';
import type {
  ActiveTemplateVersion,
  TemplateVersionReader,
} from '../application/template-version.reader';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type { PrismaClient } from '@letterly/database';

@Injectable()
export class PrismaTemplateVersionReader implements TemplateVersionReader {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findActiveById(id: string): Promise<ActiveTemplateVersion | null> {
    return this.prisma.templateVersion.findFirst({
      where: {
        id,
        status: 'ACTIVE',
        template: {
          is: {
            status: 'ACTIVE',
            category: {
              is: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
      select: {
        id: true,
        version: true,
        registryKey: true,
      },
    });
  }
}
