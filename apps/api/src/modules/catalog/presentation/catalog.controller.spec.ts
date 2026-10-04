jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import { Global, Module, type INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import {
  categoryCatalogResponseSchema,
  templateCatalogPageResponseSchema,
  templateCatalogOverviewResponseSchema,
  templateCatalogResponseSchema,
} from '@letterly/contracts/catalog';
import { configureHttpApplication } from '../../../infrastructure/http/configure-http-application';
import { CatalogController } from './catalog.controller';
import { CatalogService } from '../application/catalog.service';
import { CatalogModule } from '../catalog.module';
import { CATALOG_REPOSITORY } from '../application/catalog.repository';
import { PrismaCatalogRepository } from '../infrastructure/prisma-catalog.repository';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';

type PrismaMock = {
  category: {
    findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
    findUnique: jest.Mock;
  };
  template: {
    findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
  };
};

const category = {
  key: 'confession',
  name: 'Confession',
  description: 'Personal letters and heartfelt messages.',
  displayOrder: 1,
};

const templateId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

describe('CatalogController', () => {
  let app: INestApplication<App>;
  let prisma: PrismaMock;
  let testingModule: TestingModule;

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
        findUnique: jest.fn(),
      },
      template: {
        findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
      },
    };

    @Global()
    @Module({
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }],
      exports: [PRISMA_CLIENT],
    })
    class FixtureDatabaseModule {}

    testingModule = await Test.createTestingModule({
      imports: [FixtureDatabaseModule, CatalogModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('AC-8 composes singleton service, controller, and repository alias in the production module', () => {
    expect(testingModule.get(CatalogController)).toBeDefined();
    expect(testingModule.get(CatalogService)).toBe(
      testingModule.get(CatalogService),
    );
    expect(testingModule.get(CATALOG_REPOSITORY)).toBe(
      testingModule.get(PrismaCatalogRepository),
    );
  });

  it('returns active categories by default', async () => {
    prisma.category.findMany.mockResolvedValue([category]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);

    expect(categoryCatalogResponseSchema.parse(response.body)).toEqual([
      category,
    ]);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' },
      select: {
        key: true,
        name: true,
        description: true,
        displayOrder: true,
      },
    });
  });

  it('AC-2 and AC-8 returns one grouped landing overview query with bounded family previews', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        key: 'confession',
        name: 'Confession',
        description: null,
        displayOrder: 1,
        templates: [
          {
            id: templateId,
            key: 'secret-letter',
            name: 'Secret Letter',
            description: null,
            displayOrder: 1,
            category: { key: 'confession' },
            versions: [
              {
                id: templateVersionId,
                version: 1,
                registryKey: 'confession.secret-letter',
              },
            ],
          },
        ],
      },
      {
        key: 'fixture-growth',
        name: 'Growth fixtures',
        description: null,
        displayOrder: 2,
        templates: [],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/catalog/overview')
      .expect(200);
    const body = templateCatalogOverviewResponseSchema.parse(response.body);

    expect(body.categories[0]?.templates[0]?.currentVersion).toMatchObject({
      id: templateVersionId,
      version: 1,
    });
    expect(body.categories).toHaveLength(2);
    expect(body.categories[1]?.templates).toEqual([]);
    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    const query: unknown = prisma.category.findMany.mock.calls[0]?.[0];
    expect(query).toMatchObject({
      where: { status: 'ACTIVE' },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { templates: { take: 4 } },
    });
  });

  it('returns inactive categories when the active filter is false', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/categories?active=false')
      .expect(200)
      .expect([]);

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { displayOrder: 'asc' },
      select: {
        key: true,
        name: true,
        description: true,
        displayOrder: true,
      },
    });
  });

  it('rejects an invalid active filter with the standard error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/categories?active=maybe')
      .expect(400);

    const body = apiErrorEnvelopeSchema.parse(response.body);

    expect(body).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
    });
    expect(response.headers['x-request-id']).toBe(body.requestId);

    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it('returns a template and its trusted capabilities for a category', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-id',
      status: 'ACTIVE',
    });
    prisma.template.findMany.mockResolvedValue([
      {
        id: templateId,
        key: 'secret-letter',
        name: 'Secret Letter',
        description: 'A romantic letter with optional interactive features.',
        displayOrder: 1,
        category: { key: 'confession' },
        versions: [
          {
            id: templateVersionId,
            version: 1,
            registryKey: 'confession.secret-letter',
          },
        ],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/templates?categoryKey=confession')
      .expect(200);

    const body = templateCatalogResponseSchema.parse(response.body);

    expect(body[0]?.versions[0]?.capabilities).toEqual([
      'images',
      'audio',
      'questions',
      'visitorMessage',
      'passwordProtection',
    ]);
    expect(body[0]?.versions[0]?.audioCapability).toBe('optional');
    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', categoryId: 'category-id' },
      }),
    );
  });

  it('AC-3 and AC-8 returns a bounded catalog page with one trusted current version', async () => {
    prisma.template.findMany.mockResolvedValue([
      {
        id: templateId,
        key: 'secret-letter',
        name: 'Secret Letter',
        description: null,
        displayOrder: 1,
        category: { key: 'confession' },
        versions: [
          {
            id: templateVersionId,
            version: 1,
            registryKey: 'confession.secret-letter',
          },
        ],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/catalog/templates?size=1&q=  love  ')
      .expect(200);
    const body = templateCatalogPageResponseSchema.parse(response.body);

    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.currentVersion).toMatchObject({
      id: templateVersionId,
      version: 1,
      audioCapability: 'optional',
    });
    expect(body.items[0]).not.toHaveProperty('versions');
    expect(body.items[0]).not.toHaveProperty('registryKey');
    const query: unknown = prisma.template.findMany.mock.calls[0]?.[0];
    expect(query).toMatchObject({
      take: 2,
      where: {
        status: 'ACTIVE',
        versions: { some: { status: 'ACTIVE' } },
        AND: [
          {
            OR: [
              { name: { contains: 'love', mode: 'insensitive' } },
              { description: { contains: 'love', mode: 'insensitive' } },
              {
                category: {
                  is: { name: { contains: 'love', mode: 'insensitive' } },
                },
              },
            ],
          },
        ],
      },
    });
  });

  it('AC-5 and AC-8 resolves a focused exact active version through the production module', async () => {
    prisma.template.findMany.mockResolvedValue([
      {
        id: templateId,
        key: 'secret-letter',
        name: 'Secret Letter',
        description: null,
        displayOrder: 1,
        category: { key: 'confession' },
        versions: [
          {
            id: templateVersionId,
            version: 1,
            registryKey: 'confession.secret-letter',
          },
        ],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/catalog/templates/lookup?templateKey=secret-letter&categoryKey=confession&version=1',
      )
      .expect(200);

    expect(response.body).toMatchObject({
      id: templateId,
      categoryKey: 'confession',
      key: 'secret-letter',
      selectedVersion: {
        id: templateVersionId,
        version: 1,
        audioCapability: 'optional',
      },
    });
    expect(response.body).not.toHaveProperty('registryKey');
    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
  });

  it.each([
    '/api/v1/catalog/templates/lookup',
    '/api/v1/catalog/templates/lookup?templateKey=secret-letter&version=0',
  ])('AC-5 rejects invalid focused lookup query %s', async (path) => {
    const response = await request(app.getHttpServer()).get(path).expect(400);
    expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
    });
    expect(prisma.template.findMany).not.toHaveBeenCalled();
  });

  it('AC-5 returns not found when an exact requested active version does not exist', async () => {
    prisma.template.findMany.mockResolvedValue([
      {
        id: templateId,
        key: 'secret-letter',
        name: 'Secret Letter',
        description: null,
        displayOrder: 1,
        category: { key: 'confession' },
        versions: [],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/catalog/templates/lookup?templateKey=secret-letter&version=2',
      )
      .expect(404);
    expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
  });

  it('AC-4 traverses forward and backward while keeping page items in ascending order', async () => {
    const firstId = templateId;
    const secondId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const firstRecord = {
      id: firstId,
      key: 'secret-letter',
      name: 'Secret Letter',
      description: null,
      displayOrder: 1,
      category: { key: 'confession' },
      versions: [
        {
          id: templateVersionId,
          version: 1,
          registryKey: 'confession.secret-letter',
        },
      ],
    };
    const secondRecord = {
      id: secondId,
      key: 'choose-your-heart',
      name: 'Choose Your Heart',
      description: null,
      displayOrder: 2,
      category: { key: 'confession' },
      versions: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          version: 1,
          registryKey: 'confession.choose-your-heart',
        },
      ],
    };
    prisma.template.findMany
      .mockResolvedValueOnce([firstRecord, secondRecord])
      .mockResolvedValueOnce([secondRecord])
      .mockResolvedValueOnce([firstRecord]);

    const firstPage = templateCatalogPageResponseSchema.parse(
      (
        await request(app.getHttpServer())
          .get('/api/v1/catalog/templates?size=1')
          .expect(200)
      ).body,
    );
    expect(firstPage.items.map((item) => item.id)).toEqual([firstId]);
    expect(firstPage.previousCursor).toBeNull();
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = templateCatalogPageResponseSchema.parse(
      (
        await request(app.getHttpServer())
          .get(
            `/api/v1/catalog/templates?size=1&cursor=${firstPage.nextCursor}`,
          )
          .expect(200)
      ).body,
    );
    expect(secondPage.items.map((item) => item.id)).toEqual([secondId]);
    expect(secondPage.previousCursor).toBeTruthy();
    expect(secondPage.nextCursor).toBeNull();

    const previousPage = templateCatalogPageResponseSchema.parse(
      (
        await request(app.getHttpServer())
          .get(
            `/api/v1/catalog/templates?size=1&cursor=${secondPage.previousCursor}&direction=before`,
          )
          .expect(200)
      ).body,
    );
    expect(previousPage.items.map((item) => item.id)).toEqual([firstId]);
    expect(previousPage.previousCursor).toBeNull();
    expect(previousPage.nextCursor).toBeTruthy();
  });

  it.each([
    '/api/v1/catalog/templates?size=51',
    '/api/v1/catalog/templates?direction=before',
    '/api/v1/catalog/templates?cursor=not-a-base64+cursor',
  ])(
    'rejects invalid page query %s with the safe bad-request envelope',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path).expect(400);

      expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Request cannot be processed',
      });
      expect(prisma.template.findMany).not.toHaveBeenCalled();
    },
  );

  it('returns not found for an unknown category', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get('/api/v1/templates?categoryKey=unknown')
      .expect(404);

    expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });

    expect(prisma.template.findMany).not.toHaveBeenCalled();
  });

  it('returns unavailable when a database version has no trusted registry entry', async () => {
    prisma.template.findMany.mockResolvedValue([
      {
        id: templateId,
        key: 'unknown-template',
        name: 'Unknown Template',
        description: null,
        displayOrder: 1,
        category: { key: 'confession' },
        versions: [
          {
            id: templateVersionId,
            version: 1,
            registryKey: 'confession.missing',
          },
        ],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/templates')
      .expect(503);

    expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  });
});
