import { createHmac, randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { loadConfig } from '@letterly/config';
import {
  adminCreatorListResponseSchema,
  adminPageListResponseSchema,
  adminPageRecordSchema,
  adminAppealListResponseSchema,
  adminAppealDetailSchema,
} from '@letterly/contracts';
import {
  getPrismaClient,
  disconnectPrisma,
  type PrismaClient,
} from '@letterly/database';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { AdminModule } from '../src/modules/admin/admin.module';

const describeDatabase =
  process.env.RUN_REAL_DB_TESTS === '1' ? describe : describe.skip;
const longEmail = `a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(56)}.com`;
describeDatabase('Admin operations with real database and sessions', () => {
  jest.setTimeout(60_000);
  let prisma: PrismaClient;
  let app: INestApplication<App> | undefined;
  const prefix = `ops-${randomUUID()}`;
  const adminId = `${prefix}-admin`;
  const otherAdminId = `${prefix}-other-admin`;
  const ownerId = `${prefix}-owner`;
  const secondId = `${prefix}-second`;
  const longId = `${prefix}-long`;
  const mixedId = `${prefix}-mixed`;
  const legacyId = `${prefix}-legacy`;
  const cookies: Record<string, string> = {};
  let pageId: string;
  let adminPageId: string;
  let actionId: string;
  let appealId: string;
  const origin = 'http://localhost:3000';
  beforeAll(async () => {
    prisma = getPrismaClient();
    const config = loadConfig();
    const createdAt = new Date('2026-11-01T00:00:00Z');
    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          name: 'Operations administrator',
          email: `${adminId}@example.test`,
          role: 'ADMIN',
          createdAt,
        },
        {
          id: otherAdminId,
          name: 'Other administrator',
          email: `${otherAdminId}@example.test`,
          role: 'ADMIN',
          createdAt,
        },
        {
          id: ownerId,
          name: '%_literal owner',
          email: `INFO_tag+${prefix}@example.test`,
          createdAt,
        },
        {
          id: secondId,
          name: 'XXliteral owner',
          email: `INFOXtag+${prefix}@example.test`,
          createdAt,
        },
        { id: longId, name: 'Long address owner', email: longEmail, createdAt },
        {
          id: mixedId,
          name: 'Case variant owner',
          email: `info_tag+${prefix}@example.test`,
          createdAt,
        },
        {
          id: legacyId,
          name: 'Legacy address owner',
          email: `a${longEmail}`,
          createdAt,
        },
        ...Array.from({ length: 1500 }, (_, index) => ({
          id: `${prefix}-bulk-${index}`,
          name: `Fixture owner ${index}`,
          email: `${prefix}-bulk-${index}@example.test`,
          createdAt,
        })),
      ],
    });
    for (const [key, userId] of [
      ['admin', adminId],
      ['creator', ownerId],
      ['other', otherAdminId],
    ] as const) {
      const token = randomUUID();
      await prisma.session.create({
        data: {
          id: randomUUID(),
          userId,
          token,
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      const signature = createHmac('sha256', config.BETTER_AUTH_SECRET)
        .update(token)
        .digest('base64');
      cookies[key] =
        `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
    }
    const version = await prisma.templateVersion.findFirstOrThrow({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    const page = await prisma.page.create({
      data: {
        creatorId: ownerId,
        templateVersionId: version.id,
        slug: `ops-${randomUUID()}`,
        displaySlug: 'operations fixture',
        content: { secret: 'PRIVATE_CONTENT_SENTINEL' },
        settings: {},
        createdAt,
      },
    });
    pageId = page.id;
    adminPageId = (
      await prisma.page.create({
        data: {
          creatorId: otherAdminId,
          templateVersionId: version.id,
          slug: `ops-${randomUUID()}`,
          displaySlug: 'Admin owned fixture',
          content: {},
          settings: {},
        },
      })
    ).id;
    const action = await prisma.moderationAction.create({
      data: {
        targetType: 'PAGE',
        targetId: pageId,
        pageId,
        actorId: adminId,
        actionType: 'PAGE_DISABLE',
        reasonCode: 'SPAM',
        previousState: 'ACTIVE',
        resultingState: 'DISABLED',
        requestId: randomUUID(),
      },
    });
    actionId = action.id;
    const appeal = await prisma.appeal.create({
      data: {
        originalActionId: actionId,
        externalReference: 'SUPPORT-42',
        reasonCode: 'SPAM',
      },
    });
    appealId = appeal.id;
    const module = await Test.createTestingModule({
      imports: [PrismaModule, AdminModule],
    }).compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.auditEvent.deleteMany({
        where: { actorId: { in: [adminId, otherAdminId] } },
      });
      await prisma.page.deleteMany({
        where: { creatorId: { startsWith: prefix } },
      });
      await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    }
    await app?.close();
    await disconnectPrisma();
  });
  function server() {
    if (!app) throw new Error('Test application not initialized');
    return app.getHttpServer();
  }
  function get(path: string) {
    return request(server())
      .get(`/api/v1/admin${path}`)
      .set('Cookie', cookies.admin ?? '');
  }
  function post(path: string, body: object) {
    return request(server())
      .post(`/api/v1/admin${path}`)
      .set('Cookie', cookies.admin ?? '')
      .set('Origin', origin)
      .set('X-CSRF-Token', 'operations-fixture')
      .send(body);
  }

  it('uses literal C collated email matching, trims input, and does not treat underscores as wildcards', async () => {
    const response = await post('/creators/search', {
      field: 'email',
      value: `  info_tag+${prefix}@EXAMPLE.TEST  `,
    }).expect(200);
    const data = adminCreatorListResponseSchema.parse(response.body);
    expect(data.items.map((item) => item.id).sort()).toEqual(
      [ownerId, mixedId].sort(),
    );
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(data.items.find((item) => item.id === ownerId)?.pageCount).toBe(1);
    const first = adminCreatorListResponseSchema.parse(
      (
        await post('/creators/search', {
          field: 'email',
          value: `INFO_tag+${prefix}@example.test`,
          size: 1,
        }).expect(200)
      ).body,
    );
    expect(first.nextCursor).not.toBeNull();
    const next = await post('/creators/search', {
      field: 'email',
      value: `  info_tag+${prefix}@EXAMPLE.TEST  `,
      size: 1,
      cursor: first.nextCursor,
    }).expect(200);
    expect(
      adminCreatorListResponseSchema.parse(next.body).items[0]?.id,
    ).not.toBe(first.items[0]?.id);
    await post('/creators/search', {
      field: 'email',
      value: `infoXtag+${prefix}@example.test`,
      size: 1,
      cursor: first.nextCursor,
    }).expect(422);
  });
  it('accepts a padded 254 character address and rejects a valid 255 character address without echoing identity', async () => {
    expect(longEmail).toHaveLength(254);
    const response = await post('/creators/search', {
      field: 'email',
      value: `  ${longEmail}\t `,
    }).expect(200);
    expect(
      adminCreatorListResponseSchema
        .parse(response.body)
        .items.map((item) => item.id),
    ).toEqual([longId]);
    const rejected = await post('/creators/search', {
      field: 'email',
      value: `a${longEmail}`,
    }).expect(422);
    expect(JSON.stringify(rejected.body)).not.toContain(longEmail);
    expect(
      (await get(`/creators/${legacyId}`).expect(200)).body as object,
    ).toHaveProperty('email', `a${longEmail}`);
    for (const value of ['', 'a b@example.test', 'é@example.test', 23])
      await post('/creators/search', { field: 'email', value }).expect(422);
    await post('/creators/search', {
      field: 'email',
      value: longEmail,
      extra: 'unknown',
    }).expect(422);
  });
  it('escapes literal prefix punctuation, bounds dates, and binds cursor purpose, search and size', async () => {
    const literal = await post('/creators/search', {
      field: 'name',
      value: '%_',
    }).expect(200);
    expect(
      adminCreatorListResponseSchema
        .parse(literal.body)
        .items.map((item) => item.id),
    ).toEqual([ownerId]);
    const first = adminCreatorListResponseSchema.parse(
      (
        await get(
          '/creators?size=1&createdFrom=2026-11-01T00:00:00Z&createdTo=2026-11-02T00:00:00Z',
        ).expect(200)
      ).body,
    );
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();
    const cursor = first.nextCursor ?? '';
    const second = adminCreatorListResponseSchema.parse(
      (
        await get(
          `/creators?size=1&createdFrom=2026-11-01T00:00:00Z&createdTo=2026-11-02T00:00:00Z&cursor=${encodeURIComponent(cursor)}`,
        ).expect(200)
      ).body,
    );
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
    await get(`/creators?size=2&cursor=${encodeURIComponent(cursor)}`).expect(
      422,
    );
    await get(`/pages?size=1&cursor=${encodeURIComponent(cursor)}`).expect(422);
    await post('/creators/search', {
      field: 'name',
      value: 'Fixture',
      cursor,
      size: 1,
    }).expect(422);
    await get(
      '/creators?createdFrom=2020-01-01T00:00:00Z&createdTo=2026-11-02T00:00:00Z',
    ).expect(422);
    await get('/creators?size=101').expect(422);
  });
  it('projects safe page records and supports creator, status, date, template and exact lookup filters', async () => {
    const listed = await get(`/pages?creatorId=${ownerId}&status=DRAFT`).expect(
      200,
    );
    const data = adminPageListResponseSchema.parse(listed.body);
    expect(data.items.map((item) => item.id)).toEqual([pageId]);
    expect(JSON.stringify(data)).not.toMatch(
      /PRIVATE_CONTENT_SENTINEL|content|settings|password|storageKey|email/,
    );
    const page = adminPageRecordSchema.parse(
      (await get(`/pages/${pageId}`).expect(200)).body,
    );
    expect(page.reportCount).toBe(0);
    const bySlug = await post('/pages/search', {
      field: 'slug',
      value: page.slug,
      templateKey: page.templateKey,
    }).expect(200);
    expect(
      adminPageListResponseSchema
        .parse(bySlug.body)
        .items.map((item) => item.id),
    ).toEqual([pageId]);
    await get(`/pages/${randomUUID()}`).expect(404);
    await get(`/pages/${adminPageId}`).expect(404);
  });
  it('returns exact appeal allowlists and derives resolution from the last decision action', async () => {
    const listed = adminAppealListResponseSchema.parse(
      (
        await get(
          `/appeals?status=REQUESTED&targetType=PAGE&targetId=${pageId}`,
        ).expect(200)
      ).body,
    );
    expect(listed.items.map((item) => item.id)).toEqual([appealId]);
    expect(listed.items[0]).not.toHaveProperty('externalReference');
    await get(`/appeals?targetId=${pageId}`).expect(422);
    const before = adminAppealDetailSchema.parse(
      (await get(`/appeals/${appealId}`).expect(200)).body,
    );
    expect(before.resolutionNote).toBeNull();
    expect(before.originalActionId).toBe(actionId);
    await post(`/appeals/${appealId}/accept`, {
      confirm: true,
      expectedModerationVersion: 0,
      note: 'Reviewed support record',
      idempotencyKey: randomUUID(),
    }).expect(200);
    const after = adminAppealDetailSchema.parse(
      (await get(`/appeals/${appealId}`).expect(200)).body,
    );
    expect(after).toMatchObject({
      status: 'ACCEPTED',
      resolutionNote: 'Reviewed support record',
      resolutionReasonCode: 'OTHER',
      resolvedById: adminId,
    });
    expect(JSON.stringify(after)).not.toMatch(
      /PRIVATE_CONTENT_SENTINEL|email|storageKey|content/,
    );
  });
  it('enforces origin and actor policies on read search POSTs', async () => {
    await prisma.user.update({
      where: { id: otherAdminId },
      data: { moderationStatus: 'DISABLED' },
    });
    await request(server())
      .get('/api/v1/admin/pages')
      .set('Cookie', cookies.other ?? '')
      .expect(403);
    await prisma.user.update({
      where: { id: otherAdminId },
      data: { moderationStatus: 'ACTIVE' },
    });
    await request(server()).get('/api/v1/admin/pages').expect(401);
    await request(server())
      .get('/api/v1/admin/appeals')
      .set('Cookie', cookies.creator ?? '')
      .expect(403);
    await request(server())
      .post('/api/v1/admin/creators/search')
      .set('Cookie', cookies.admin ?? '')
      .set('Origin', 'https://invalid.example')
      .set('X-CSRF-Token', 'fixture')
      .send({ field: 'email', value: longEmail })
      .expect(403);
    await request(server())
      .post('/api/v1/admin/pages/search')
      .set('Cookie', cookies.creator ?? '')
      .set('Origin', origin)
      .set('X-CSRF-Token', 'fixture')
      .send({ field: 'id', value: pageId })
      .expect(403);
  });
  it('rejects all account actions against another administrator and serializes competing page changes', async () => {
    for (const operation of ['disable', 'restore'])
      await post(`/pages/${adminPageId}/${operation}`, {
        confirm: true,
        reason: 'OTHER',
        expectedModerationVersion: 0,
        idempotencyKey: randomUUID(),
      }).expect(409);
    for (const operation of ['disable', 'restore'])
      await post(`/users/${otherAdminId}/${operation}`, {
        confirm: true,
        reason: 'OTHER',
        expectedModerationVersion: 0,
        idempotencyKey: randomUUID(),
      }).expect(409);
    const body = {
      confirm: true,
      reason: 'SPAM',
      expectedModerationVersion: 0,
    };
    const attempts = await Promise.all([
      post(`/pages/${pageId}/disable`, {
        ...body,
        idempotencyKey: randomUUID(),
      }),
      post(`/pages/${pageId}/disable`, {
        ...body,
        idempotencyKey: randomUUID(),
      }),
    ]);
    expect(attempts.map((item) => item.status).sort()).toEqual([200, 409]);
    const page = adminPageRecordSchema.parse(
      (await get(`/pages/${pageId}`).expect(200)).body,
    );
    const retryKey = randomUUID();
    const restored = await post(`/pages/${pageId}/restore`, {
      confirm: true,
      expectedModerationVersion: page.moderationVersion,
      idempotencyKey: retryKey,
    }).expect(200);
    const replayed = await post(`/pages/${pageId}/restore`, {
      confirm: true,
      expectedModerationVersion: page.moderationVersion,
      idempotencyKey: retryKey,
    }).expect(200);
    expect(replayed.body).toMatchObject({
      actionId: (restored.body as { actionId: string }).actionId,
      replayed: true,
    });
  });
  it('disables and restores a creator while revoking its existing session', async () => {
    await post(`/users/${ownerId}/disable`, {
      confirm: true,
      reason: 'SPAM',
      expectedModerationVersion: 0,
      idempotencyKey: randomUUID(),
    }).expect(200);
    await request(server())
      .get('/api/v1/admin/pages')
      .set('Cookie', cookies.creator ?? '')
      .expect(401);
    await post(`/users/${ownerId}/restore`, {
      confirm: true,
      expectedModerationVersion: 1,
      idempotencyKey: randomUUID(),
    }).expect(200);
    expect(
      (await get(`/creators/${ownerId}`).expect(200)).body as object,
    ).toHaveProperty('moderationStatus', 'ACTIVE');
  });

  it('uses the lookup indexes on representative fixtures', async () => {
    await prisma.$executeRaw`ANALYZE "user"`;
    const emailPlan =
      await prisma.$queryRaw`EXPLAIN (FORMAT JSON) SELECT "id" FROM "user" WHERE lower("email" COLLATE "C") = ${longEmail} COLLATE "C" ORDER BY "createdAt" DESC, "id" DESC LIMIT 26`;
    expect(JSON.stringify(emailPlan)).toContain('user_admin_email_lookup_idx');
    const pattern = '\\%\\_literal%';
    const namePlan =
      await prisma.$queryRaw`EXPLAIN (FORMAT JSON) SELECT "id" FROM "user" WHERE lower("name") LIKE ${pattern} LIMIT 26`;
    expect(JSON.stringify(namePlan)).toContain('user_admin_name_prefix_idx');
    const indexes = await prisma.$queryRaw<
      { indexdef: string }[]
    >`SELECT indexdef FROM pg_indexes WHERE tablename = 'user' AND indexname = 'user_admin_email_lookup_idx'`;
    expect(indexes[0]?.indexdef).toContain('COLLATE "C"');
  });
});
