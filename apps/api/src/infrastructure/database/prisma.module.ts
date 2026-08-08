import { Global, Module } from '@nestjs/common';
import {
  PRISMA_CLIENT,
  PrismaLifeCycle,
  prismaProvider,
} from './prisma.provider';

@Global()
@Module({
  providers: [prismaProvider, PrismaLifeCycle],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule {}
