import { createHmac, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { loadConfig } from '@letterly/config';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { PagesModule } from '../src/modules/pages/pages.module';

const runRealDatabaseTests = process.env.RUN_REAL_DB_TESTS === '1';
const describeReal = runRealDatabaseTests ? describe : describe.skip;

function signedSessionCookie(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64');
  return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      if (attempt === 3) break;
      await new Promise((resolve) =>
        setTimeout(resolve, 1_000 * (attempt + 1)),
      );
    }
  }

  throw lastError;
}

describeReal('Authenticated drafts with a writable database', () => {
  jest.setTimeout(45_000);

  let app: INestApplication<App> | undefined;
  let prisma!: PrismaClient;
  let ownerId: string;
  let otherOwnerId: string;
  let ownerCookie: string;
  let otherOwnerCookie: string;
  let pageId: string | undefined;
  let pageSlug: string | undefined;
  let templateVersionId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const config = loadConfig();

    const templateVersion = await withRetry(() =>
      prisma.templateVersion.findFirst({
        where: {
          registryKey: 'confession.secret-letter',
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
    );

    if (!templateVersion) {
      throw new Error('The active Secret Letter template is not seeded');
    }
    templateVersionId = templateVersion.id;

    ownerId = `real-draft-owner-${randomUUID()}`;
    otherOwnerId = `real-draft-other-${randomUUID()}`;
    const ownerSessionToken = randomUUID();
    const otherSessionToken = randomUUID();

    await withRetry(() =>
      prisma.$transaction([
        prisma.user.create({
          data: {
            id: ownerId,
            name: 'Real draft owner',
            email: `${ownerId}@letterly.test`,
            emailVerified: true,
          },
        }),
        prisma.user.create({
          data: {
            id: otherOwnerId,
            name: 'Other draft owner',
            email: `${otherOwnerId}@letterly.test`,
            emailVerified: true,
          },
        }),
      ]),
    );

    await withRetry(() =>
      prisma.$transaction([
        prisma.session.create({
          data: {
            id: randomUUID(),
            token: ownerSessionToken,
            userId: ownerId,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        }),
        prisma.session.create({
          data: {
            id: randomUUID(),
            token: otherSessionToken,
            userId: otherOwnerId,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        }),
      ]),
    );

    ownerCookie = signedSessionCookie(
      ownerSessionToken,
      config.BETTER_AUTH_SECRET,
    );
    otherOwnerCookie = signedSessionCookie(
      otherSessionToken,
      config.BETTER_AUTH_SECRET,
    );

    const moduleFixture = await Test.createTestingModule({
      imports: [PrismaModule, PagesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterAll(async () => {
    if (!prisma) {
      await app?.close();
      return;
    }
    const ownedPages = ownerId
      ? await prisma.page.findMany({
          where: { creatorId: ownerId },
          select: { id: true, slug: true },
        })
      : [];
    const pageIds = new Set(
      [pageId, ...ownedPages.map((page) => page.id)].filter(
        (id): id is string => Boolean(id),
      ),
    );
    const slugs = new Set(
      [pageSlug, ...ownedPages.map((page) => page.slug)].filter(
        (slug): slug is string => Boolean(slug),
      ),
    );
    if (pageIds.size > 0) {
      await prisma.page.deleteMany({ where: { id: { in: [...pageIds] } } });
    }
    if (slugs.size > 0) {
      await prisma.pageSlugReservation.deleteMany({
        where: { normalizedSlug: { in: [...slugs] } },
      });
    }
    if (ownerId && otherOwnerId) {
      await prisma.session.deleteMany({
        where: { userId: { in: [ownerId, otherOwnerId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, otherOwnerId] } },
      });
    }
    await app?.close();
    await disconnectPrisma();
  });

  it('proves create, owner isolation, save conflict, and permanent delete', async () => {
    const server = app?.getHttpServer();
    expect(server).toBeDefined();
    if (!server) return;

    const created = await request(server)
      .post('/api/v1/pages')
      .set('Cookie', ownerCookie)
      .send({ templateVersionId })
      .expect(201);

    const createdBody = created.body as {
      id: string;
      slug: string;
      status: string;
      contentVersion: number;
      recipientLabel: string;
    };
    pageId = createdBody.id;
    pageSlug = createdBody.slug;
    expect(createdBody).toMatchObject({
      id: pageId,
      status: 'DRAFT',
      contentVersion: 0,
      recipientLabel: 'Untitled letter',
    });
    expect(createdBody).not.toHaveProperty('creatorId');

    const listed = await request(server)
      .get('/api/v1/pages?status=DRAFT&size=20')
      .set('Cookie', ownerCookie)
      .expect(200);
    const listedBody = listed.body as {
      items: Array<Record<string, unknown>>;
    };
    expect(listedBody.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: pageId })]),
    );
    expect(listedBody.items[0]).not.toHaveProperty('mainMessage');
    expect(listed.headers['cache-control']).toBe('private, no-store');

    const otherList = await request(server)
      .get('/api/v1/pages?status=DRAFT&size=20')
      .set('Cookie', otherOwnerCookie)
      .expect(200);
    const otherListBody = otherList.body as {
      items: Array<Record<string, unknown>>;
    };
    expect(otherListBody.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: pageId })]),
    );

    await request(server)
      .get(`/api/v1/pages/${pageId}`)
      .set('Cookie', otherOwnerCookie)
      .expect(404);

    const saved = await request(server)
      .patch(`/api/v1/pages/${pageId}`)
      .set('Cookie', ownerCookie)
      .send({
        recipientName: 'Alex',
        mainMessage: 'A real private draft.',
        expectedContentVersion: 0,
      })
      .expect(200);
    expect(saved.body).toMatchObject({
      id: pageId,
      contentVersion: 1,
      content: {
        recipientName: 'Alex',
        mainMessage: 'A real private draft.',
      },
    });

    const stale = await request(server)
      .patch(`/api/v1/pages/${pageId}`)
      .set('Cookie', ownerCookie)
      .send({
        recipientName: 'Stale',
        mainMessage: 'Must not overwrite.',
        expectedContentVersion: 0,
      })
      .expect(409);
    expect(stale.body).toMatchObject({
      code: 'STALE_VERSION',
      details: { currentContentVersion: 1 },
    });

    const unchanged = await request(server)
      .get(`/api/v1/pages/${pageId}`)
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(unchanged.body).toMatchObject({
      id: pageId,
      contentVersion: 1,
      content: {
        recipientName: 'Alex',
        mainMessage: 'A real private draft.',
      },
    });

    await request(server)
      .delete(`/api/v1/pages/${pageId}`)
      .set('Cookie', otherOwnerCookie)
      .expect(404);

    await request(server)
      .delete(`/api/v1/pages/${pageId}`)
      .set('Cookie', ownerCookie)
      .expect(204);

    expect(await prisma.page.findUnique({ where: { id: pageId } })).toBeNull();
    const reservation = await prisma.pageSlugReservation.findUnique({
      where: { normalizedSlug: pageSlug },
      select: { pageId: true, isCurrent: true },
    });
    expect(reservation).toMatchObject({ pageId: null, isCurrent: false });
  });
});
