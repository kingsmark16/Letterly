import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@letterly/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = loadConfig();
  await app.listen(config.PORT);
}
void bootstrap();
