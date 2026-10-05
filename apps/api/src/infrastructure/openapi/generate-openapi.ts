import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { createOpenApiDocument } from './openapi-document';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });

  try {
    const document = createOpenApiDocument(app);
    const outputPath = resolve(process.cwd(), 'openapi.json');
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, {
      encoding: 'utf8',
    });
  } finally {
    await app.close();
  }
}

void generateOpenApi();
