import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { AppModule } from '../../app.module';
import { AdminModule } from '../../modules/admin/admin.module';
import { CatalogModule } from '../../modules/catalog/catalog.module';
import { PagesModule } from '../../modules/pages/pages.module';
import { HealthModule } from '../health/health.module';
import {
  apiErrorSchemaForDocument,
  openApiSchemaComponentsForDocument,
} from './zod-openapi.decorators';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Letterly API')
    .setDescription(
      'Letterly owned HTTP routes. Better Auth account routes remain documented by its SDK.',
    )
    .setVersion('1')
    .addServer('/', 'API origin')
    .addCookieAuth(
      'better-auth.session_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
        description:
          'Better Auth session cookie used outside production. The browser sends this cookie automatically.',
      },
      'betterAuthSession',
    )
    .addCookieAuth(
      '__Secure-better-auth.session_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: '__Secure-better-auth.session_token',
        description:
          'Secure Better Auth session cookie used in production. The browser sends this cookie automatically over HTTPS.',
      },
      'betterAuthSecureSession',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [AppModule, HealthModule, CatalogModule, PagesModule, AdminModule],
    deepScanRoutes: false,
    autoTagControllers: false,
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey}_${methodKey}`,
  });

  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ApiErrorEnvelope: apiErrorSchemaForDocument(),
      ...openApiSchemaComponentsForDocument(),
    },
  };

  if (
    Object.keys(document.paths).some((path) => path.startsWith('/api/auth'))
  ) {
    throw new Error(
      'Better Auth routes must remain outside the Letterly API document',
    );
  }

  return document;
}

export function configureOpenApi(
  app: INestApplication,
  nodeEnv: string,
): boolean {
  if (nodeEnv === 'production') {
    return false;
  }

  SwaggerModule.setup('docs', app, createOpenApiDocument(app), {
    jsonDocumentUrl: 'docs-json',
  });
  return true;
}
