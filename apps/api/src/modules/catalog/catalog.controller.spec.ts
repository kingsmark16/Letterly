jest.mock('../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
} from '@letterly/contracts/catalog';
import { configureHttpApplication } from '../../infrastructure/http/configure-http-application';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma.provider';

type PrismaMock = {
  category: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  template: {
    findMany: jest.Mock;
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

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      template: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        CatalogService,
        {
          provide: PRISMA_CLIENT,
          useValue: prisma,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
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
    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', categoryId: 'category-id' },
      }),
    );
  });

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
