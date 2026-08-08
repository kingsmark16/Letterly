import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@letterly/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableShutdownHooks();

  const config = loadConfig();
  await app.listen(config.PORT);
}
void bootstrap();
