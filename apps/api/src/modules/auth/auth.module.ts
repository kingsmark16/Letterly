import { Module } from '@nestjs/common';
import { BetterAuthSessionGuard } from './better-auth-session.guard';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [BetterAuthSessionGuard],
  exports: [BetterAuthSessionGuard],
})
export class AuthModule {}
