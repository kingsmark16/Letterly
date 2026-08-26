import { Global, Module } from '@nestjs/common';
import { SAFE_MONITORING, SafeMonitoring } from './safe-monitoring';

@Global()
@Module({
  providers: [
    SafeMonitoring,
    { provide: SAFE_MONITORING, useExisting: SafeMonitoring },
  ],
  exports: [SafeMonitoring, SAFE_MONITORING],
})
export class MonitoringModule {}
