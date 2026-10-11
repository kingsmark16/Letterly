import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  configureOpenApi,
  createOpenApiDocument,
} from '../src/infrastructure/openapi/openapi-document';
import { ApiZodResponse } from '../src/infrastructure/openapi/zod-openapi.decorators';

const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

const expectedOperations = [
  'GET /',
  'GET /health',
  'GET /ready',
  'GET /api/v1/categories',
  'GET /api/v1/catalog/overview',
  'GET /api/v1/templates',
  'GET /api/v1/catalog/templates',
  'GET /api/v1/catalog/templates/lookup',
  'GET /api/v1/admin/reports',
  'GET /api/v1/admin/reports/{reportId}',
  'GET /api/v1/admin/audit-events',
  'POST /api/v1/admin/reports/{reportId}/review',
  'POST /api/v1/admin/reports/{reportId}/dismiss',
  'POST /api/v1/admin/reports/{reportId}/reopen',
  'POST /api/v1/admin/pages/{pageId}/disable',
  'POST /api/v1/admin/pages/{pageId}/restore',
  'POST /api/v1/admin/users/{userId}/disable',
  'POST /api/v1/admin/users/{userId}/restore',
  'POST /api/v1/admin/appeals',
  'POST /api/v1/admin/appeals/{appealId}/accept',
  'POST /api/v1/admin/appeals/{appealId}/reject',
  'GET /api/v1/pages',
  'POST /api/v1/pages',
  'PATCH /api/v1/pages/{pageId}',
  'GET /api/v1/pages/{pageId}',
  'DELETE /api/v1/pages/{pageId}',
  'POST /api/v1/pages/{pageId}/publish',
  'POST /api/v1/pages/{pageId}/unpublish',
  'POST /api/v1/pages/{pageId}/archive',
  'POST /api/v1/pages/{pageId}/restore',
  'PATCH /api/v1/pages/{pageId}/slug',
  'GET /api/v1/pages/{pageId}/analytics',
  'POST /api/v1/pages/{pageId}/audio/uploads',
  'POST /api/v1/pages/{pageId}/audio/links',
  'GET /api/v1/pages/{pageId}/audio/metadata',
  'POST /api/v1/pages/{pageId}/audio/{audioId}/complete',
  'POST /api/v1/pages/{pageId}/audio/{audioId}/retry',
  'DELETE /api/v1/pages/{pageId}/audio',
  'GET /api/v1/pages/{pageId}/audio',
  'POST /api/v1/pages/{pageId}/images/uploads',
  'GET /api/v1/pages/{pageId}/images',
  'POST /api/v1/pages/{pageId}/images/{imageId}/complete',
  'POST /api/v1/pages/{pageId}/images/{imageId}/retry',
  'DELETE /api/v1/pages/{pageId}/images/{imageId}',
  'GET /api/v1/pages/{pageId}/images/{imageId}',
  'GET /api/v1/pages/{pageId}/choose-your-heart',
  'PUT /api/v1/pages/{pageId}/choose-your-heart',
  'PATCH /api/v1/pages/{pageId}/password',
  'POST /api/v1/pages/{pageId}/questions',
  'GET /api/v1/pages/{pageId}/questions',
  'PATCH /api/v1/pages/{pageId}/questions/order',
  'PATCH /api/v1/pages/{pageId}/questions/{questionId}',
  'DELETE /api/v1/pages/{pageId}/questions/{questionId}',
  'GET /api/v1/pages/{pageId}/submissions',
  'GET /api/v1/pages/{pageId}/submissions/{submissionId}',
  'POST /api/v1/pages/{pageId}/submissions/{submissionId}/read',
  'DELETE /api/v1/pages/{pageId}/submissions/{submissionId}',
  'POST /api/v1/public/pages/{slug}/visit',
  'POST /api/v1/public/pages/{slug}/visit/time',
  'POST /api/v1/public/pages/{slug}/metrics',
  'GET /api/v1/public/pages/{slug}/audio',
  'GET /api/v1/public/pages/{slug}/audio/metadata',
  'GET /api/v1/public/pages/{slug}/images/{imageId}',
  'GET /api/v1/public/pages/{slug}',
  'POST /api/v1/public/pages/{slug}/reports',
  'POST /api/v1/public/pages/{slug}/submissions',
  'POST /api/v1/public/pages/{slug}/unlock',
] as const;

function enumerateOperations(document: OpenAPIObject): string[] {
  const operations: string[] = [];

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!pathItem || '$ref' in pathItem) continue;

    for (const method of methods) {
      if (pathItem[method]) {
        operations.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }

  return operations.sort();
}

describe('Letterly OpenAPI contract (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureHttpApplication(app);
    expect(configureOpenApi(app, 'test')).toBe(true);
    await app.init();
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC-1 documents every Letterly route and excludes Better Auth routes', () => {
    expect(enumerateOperations(document)).toEqual(
      [...expectedOperations].sort(),
    );
    expect(
      Object.keys(document.paths).some((path) => path.startsWith('/api/auth')),
    ).toBe(false);

    for (const [path, pathItem] of Object.entries(document.paths)) {
      if (!pathItem || '$ref' in pathItem) continue;
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;
        expect(operation.summary).toEqual(expect.any(String));
        expect(operation.tags?.length).toBeGreaterThan(0);
        expect(
          Object.keys(operation.responses).some((status) =>
            status.startsWith('2'),
          ),
        ).toBe(true);

        const expectedPathParameters = [...path.matchAll(/\{([^}]+)\}/g)]
          .map(([, name]) => name)
          .sort();
        const actualPathParameters = (operation.parameters ?? [])
          .flatMap((parameter) =>
            'in' in parameter && parameter.in === 'path'
              ? [parameter.name]
              : [],
          )
          .sort();
        expect(actualPathParameters).toEqual(expectedPathParameters);

        for (const [status, response] of Object.entries(operation.responses)) {
          if (status.startsWith('2') || !response || !('content' in response)) {
            continue;
          }
          expect(response.content?.['application/json']?.schema).toEqual({
            $ref: '#/components/schemas/ApiErrorEnvelope',
          });
        }
      }
    }
  });

  it('AC-2 and AC-3 document validated schemas, access, and safe errors', () => {
    const createPage = document.paths['/api/v1/pages']?.post;
    expect(createPage).toMatchObject({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['templateVersionId'],
              properties: {
                templateVersionId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { id: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        '422': {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
            },
          },
        },
      },
    });

    const ownerList = document.paths['/api/v1/pages']?.get;
    expect(ownerList?.security).toEqual([
      { betterAuthSession: [] },
      { betterAuthSecureSession: [] },
    ]);
    expect(ownerList?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'size',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 50 },
        }),
      ]),
    );

    expect(document.paths['/api/v1/categories']?.get?.security).toBeUndefined();
    expect(document.components?.schemas?.ApiErrorEnvelope).toMatchObject({
      type: 'object',
      required: ['statusCode', 'code', 'message', 'requestId'],
    });

    const auditResponse =
      document.paths['/api/v1/admin/audit-events']?.get?.responses['200'];
    const auditMetadata =
      auditResponse && 'content' in auditResponse
        ? auditResponse.content?.['application/json']?.schema
        : undefined;
    expect(auditMetadata).toMatchObject({
      properties: {
        items: {
          items: {
            properties: {
              metadata: {
                nullable: true,
                additionalProperties: {
                  $ref: '#/components/schemas/ApiJsonValue',
                },
              },
            },
          },
        },
      },
    });
    expect(document.components?.schemas?.ApiJsonValue).toMatchObject({
      anyOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'string', nullable: true, enum: [null] },
        {
          type: 'array',
          items: {
            allOf: [{ $ref: '#/components/schemas/ApiJsonValue' }],
          },
        },
        {
          type: 'object',
          additionalProperties: {
            allOf: [{ $ref: '#/components/schemas/ApiJsonValue' }],
          },
        },
      ],
    });
    expect(JSON.stringify(document)).not.toContain('#/definitions/');
    expect(() => ApiZodResponse(z.json())).toThrow(
      'Recursive Zod OpenAPI definitions require stable metadata IDs',
    );
  });

  it('AC-4 and AC-5 serve the nonproduction document with stable output', async () => {
    const documentResponse = await request(app.getHttpServer() as Server)
      .get('/docs-json')
      .expect(200);
    const documentBody: unknown = JSON.parse(documentResponse.text);
    expect(documentBody).toMatchObject({
      openapi: '3.0.0',
      info: { title: 'Letterly API' },
    });
    expect(documentBody).toHaveProperty('paths./api/v1/pages');
    await request(app.getHttpServer() as Server)
      .get('/docs/')
      .expect(200)
      .expect('Content-Type', /html/);

    const first = JSON.stringify(createOpenApiDocument(app));
    const second = JSON.stringify(createOpenApiDocument(app));
    expect(second).toBe(first);
  });

  it('AC-4 omits documentation routes in production', async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const productionApp = moduleFixture.createNestApplication({
      bodyParser: false,
    });

    try {
      expect(configureOpenApi(productionApp, 'production')).toBe(false);
      await productionApp.init();
      await request(productionApp.getHttpServer() as Server)
        .get('/docs-json')
        .expect(404);
      await request(productionApp.getHttpServer() as Server)
        .get('/docs')
        .expect(404);
    } finally {
      await productionApp.close();
    }
  });
});
