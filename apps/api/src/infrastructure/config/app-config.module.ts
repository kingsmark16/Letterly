import { Module } from '@nestjs/common';
import { loadConfig } from '@letterly/config';

export const APP_ORIGIN = Symbol('APP_ORIGIN');

@Module({
  providers: [
    {
      provide: APP_ORIGIN,
      useFactory: () => loadConfig().APP_ORIGIN,
    },
  ],
  exports: [APP_ORIGIN],
})
export class AppConfigModule {}
