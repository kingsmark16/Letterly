import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@letterly/config';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableShutdownHooks();

  const jsonBodyParser = json({ limit: '128kb' });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isAuthRequest =
      request.path === '/api/auth' || request.path.startsWith('/api/auth/');

    if (isAuthRequest) {
      next();
      return;
    }

    jsonBodyParser(request, response, next);
  });

  const config = loadConfig();
  await app.listen(config.PORT);
}
void bootstrap();
