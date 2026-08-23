import { disconnectPrisma, getPrismaClient } from '@letterly/database';
import { Injectable, type Provider } from '@nestjs/common';
import { PRISMA_CLIENT } from './prisma-token';

export { PRISMA_CLIENT } from './prisma-token';

export const prismaProvider: Provider = {
  provide: PRISMA_CLIENT,
  useFactory: getPrismaClient,
};

@Injectable()
export class PrismaLifeCycle {
  async onApplicationShutdown(): Promise<void> {
    await disconnectPrisma();
  }
}
