import { disconnectPrisma, getPrismaClient } from '@letterly/database';
import { Injectable, type Provider } from '@nestjs/common';

export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

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
