import 'dotenv/config';
import { loadConfig } from '@letterly/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpApplication } from './infrastructure/http/configure-http-application';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableShutdownHooks();
  configureHttpApplication(app);

  const config = loadConfig();
  await app.listen(config.PORT);
}
void bootstrap();
