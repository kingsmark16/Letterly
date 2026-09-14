import 'dotenv/config';
import { loadConfig } from '@letterly/config';
import { NestFactory } from '@nestjs/core';
import type { Application } from 'express';
import { AppModule } from './app.module';
import { configureHttpApplication } from './infrastructure/http/configure-http-application';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const expressApplication = app.getHttpAdapter().getInstance() as Application;
  expressApplication.set('trust proxy', config.TRUSTED_PROXY_IPS);
  app.enableShutdownHooks();
  configureHttpApplication(app);

  await app.listen(config.PORT);
}
void bootstrap();
