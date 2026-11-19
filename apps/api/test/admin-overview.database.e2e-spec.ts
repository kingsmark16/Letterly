import { createHmac, randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { loadConfig } from '@letterly/config';
import { adminOverviewResponseSchema } from '@letterly/contracts';
import {
  getPrismaClient,
  disconnectPrisma,
  type PrismaClient,
} from '@letterly/database';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { isAnalyticsSourceRejection } from '../src/infrastructure/database/prisma-recovery';
import { AdminModule } from '../src/modules/admin/admin.module';
import { DeletionScheduler } from '../src/modules/admin/infrastructure/deletion.scheduler';
import { activateAdminAnalytics } from '../src/modules/admin/infrastructure/admin-analytics-activation';
import { PrismaAdminOverviewRepository } from '../src/modules/admin/infrastructure/prisma-admin-overview.repository';
import { PrismaPageAnalyticsRepository } from '../src/modules/pages/infrastructure/prisma-page-analytics.repository';

function barrier() {
  let open!: () => void;
  const ready = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { ready, open };
}

const database =
  process.env.RUN_ADMIN_ANALYTICS_DB_TESTS === '1' ? describe : describe.skip;
database('Admin overview and activation', () => {
  jest.setTimeout(60_000);
  let prisma: PrismaClient;
  let app: INestApplication<App> | undefined;
  let ownsAnalyticsFixture = false;
  let failRead = false;
  let versionId: string;
  let day: Date;
  let legacyPageId: string;
  const userIds: string[] = [];
  const prefix = `overview-${randomUUID()}`;
  let adminCookie: string;
  let creatorCookie: string;
  const bookmark = { admin: `${prefix}-admin`, owner: `${prefix}-owner` };
  const person = (id: string) => ({
    id,
    name: 'Synthetic analytics fixture',
    email: `${id}@example.test`,
  });
  async function cookie(userId: string) {
    const token = randomUUID();
    await prisma.session.create({
      data: {
        id: randomUUID(),
        token,
        userId,
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    return `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', loadConfig().BETTER_AUTH_SECRET).update(token).digest('base64')}`)}`;
  }
  async function createPage(creatorId = bookmark.owner) {
    const slug = `${prefix}-${randomUUID()}`;
    return prisma.page.create({
      data: {
        creatorId,
        templateVersionId: versionId,
        slug,
        displaySlug: slug,
        content: { private: 'OVERVIEW_PRIVATE_CONTENT' },
        settings: {},
      },
    });
  }
  const get = (query = '', credential = adminCookie) => {
    if (!app) throw new Error('Fixture not initialized');
    return request(app.getHttpServer())
      .get(`/api/v1/admin/overview${query}`)
      .set('Cookie', credential);
  };
  async function awaitActivationLock() {
    for (let attempt = 0; attempt < 150; attempt++) {
      const [lock] = await prisma.$queryRaw<{ waiting: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM pg_locks WHERE relation='"user"'::regclass
          AND mode='ShareRowExclusiveLock' AND NOT granted) AS waiting`;
      if (lock?.waiting) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Activation did not reach the source lock');
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? 'invalid:');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error(
        'Analytics fixtures require isolated loopback PostgreSQL',
      );
    prisma = getPrismaClient();
    if (
      (await prisma.analyticsCoverage.count()) ||
      (await prisma.dailyAdminMetrics.count())
    )
      throw new Error('Analytics fixtures require empty coverage and counters');
    ownsAnalyticsFixture = true;
    versionId = (
      await prisma.templateVersion.findFirstOrThrow({
        where: { template: { key: 'secret-letter' } },
        select: { id: true },
      })
    ).id;
    const [clock] = await prisma.$queryRaw<
      { day: Date }[]
    >`SELECT (clock_timestamp() AT TIME ZONE 'UTC')::date AS day`;
    day = clock!.day;
    userIds.push(bookmark.admin, bookmark.owner);
    await prisma.user.createMany({
      data: [
        { ...person(bookmark.admin), role: 'ADMIN' },
        person(bookmark.owner),
      ],
    });
    adminCookie = await cookie(bookmark.admin);
    creatorCookie = await cookie(bookmark.owner);
    const real = new PrismaAdminOverviewRepository(prisma);
    const module = await Test.createTestingModule({
      imports: [PrismaModule, AdminModule],
    })
      .overrideProvider(DeletionScheduler)
      .useValue({})
      .overrideProvider(PrismaAdminOverviewRepository)
      .useValue({
        read: (period: 7 | 30 | 90) =>
          failRead
            ? Promise.reject(new Error('PRIVATE_FAILURE_SENTINEL'))
            : real.read(period),
      })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });
  afterAll(async () => {
    try {
      if (ownsAnalyticsFixture) {
        await prisma.analyticsCoverage.deleteMany();
        await prisma.dailyAdminMetrics.deleteMany();
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } finally {
      await app?.close();
      await disconnectPrisma();
    }
  });

  it('serves real current totals without inventing history and protects the endpoint', async () => {
    const target = await createPage();
    legacyPageId = target.id;
    await prisma.pageVisit.create({
      data: {
        pageId: target.id,
        browserTokenHash: 'legacy-fixture-browser',
        visitedOn: day,
        viewCount: 4,
      },
    });
    await prisma.pageReport.create({
      data: { pageId: target.id, reason: 'OTHER' },
    });
    const response = await get().expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    const overview = adminOverviewResponseSchema.parse(response.body);
    expect(overview.period).toBe(30);
    expect(overview.coverageStartedAt).toBeNull();
    expect(overview.buckets).toHaveLength(30);
    expect(
      overview.buckets.every(
        (bucket) => !bucket.available && bucket.pageViews === null,
      ),
    ).toBe(true);
    expect(BigInt(overview.workload.openReports)).toBeGreaterThan(0n);
    expect(BigInt(overview.pages.byPublication.DRAFT.active)).toBeGreaterThan(
      0n,
    );
    expect(JSON.stringify(overview)).not.toContain('OVERVIEW_PRIVATE_CONTENT');
    await get('', '').expect(401);
    await get('', creatorCookie).expect(403);
    await get('?period=9').expect(422);
    failRead = true;
    try {
      const unavailable = await get().expect(503);
      expect(unavailable.body).toMatchObject({ code: 'ANALYTICS_UNAVAILABLE' });
      expect(JSON.stringify(unavailable.body)).not.toContain(
        'PRIVATE_FAILURE_SENTINEL',
      );
    } finally {
      failRead = false;
    }
  });

  it('rolls activation back on a visit table lock timeout', async () => {
    const locked = barrier(),
      release = barrier();
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`LOCK TABLE "PageVisit" IN ROW EXCLUSIVE MODE`;
        locked.open();
        await release.ready;
      },
      { timeout: 20_000 },
    );
    try {
      await locked.ready;
      await expect(activateAdminAnalytics(prisma)).rejects.toThrow(
        /lock timeout/,
      );
      expect(await prisma.analyticsCoverage.count()).toBe(0);
      expect(await prisma.dailyAdminMetrics.count()).toBe(0);
    } finally {
      release.open();
      await holder;
    }
  });

  it('drains an open writer, counts a later write in an earlier transaction, and rejects stale isolation', async () => {
    const priorId = `${prefix}-prior`,
      delayedId = `${prefix}-delayed`,
      deniedId = `${prefix}-denied`;
    userIds.push(priorId, delayedId, deniedId);
    const written = barrier(),
      releaseWrite = barrier(),
      begun = barrier(),
      releaseDelayed = barrier();
    const prior = prisma.$transaction(
      async (tx) => {
        await tx.user.create({ data: person(priorId) });
        written.open();
        await releaseWrite.ready;
      },
      { timeout: 15_000 },
    );
    const delayed = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1`;
        begun.open();
        await releaseDelayed.ready;
        await tx.user.create({ data: person(delayedId) });
      },
      { isolationLevel: 'ReadCommitted', timeout: 15_000 },
    );
    await Promise.all([written.ready, begun.ready]);
    const activation = activateAdminAnalytics(prisma);
    try {
      await awaitActivationLock();
      expect(await prisma.analyticsCoverage.count()).toBe(0);
      releaseWrite.open();
      await prior;
      const startedAt = await activation;
      releaseDelayed.open();
      await delayed;
      expect(await activateAdminAnalytics(prisma)).toEqual(startedAt);
      const bucket = await prisma.dailyAdminMetrics.findUniqueOrThrow({
        where: { day },
      });
      expect(bucket.creatorSignups).toBe(1n);
      const rejection: unknown = await prisma
        .$transaction((tx) => tx.user.create({ data: person(deniedId) }), {
          isolationLevel: 'RepeatableRead',
        })
        .catch((error: unknown) => error);
      expect(isAnalyticsSourceRejection(rejection)).toBe(true);
      expect(await prisma.user.count({ where: { id: deniedId } })).toBe(0);
    } finally {
      releaseWrite.open();
      releaseDelayed.open();
      await Promise.allSettled([prior, delayed, activation]);
    }
  });

  it('counts real transitions, idempotent visit updates, and rollbacks without subtracting deletions', async () => {
    const before = await prisma.dailyAdminMetrics.findUniqueOrThrow({
      where: { day },
    });
    await prisma.pageVisit.update({
      where: {
        pageId_browserTokenHash_visitedOn: {
          pageId: legacyPageId,
          browserTokenHash: 'legacy-fixture-browser',
          visitedOn: day,
        },
      },
      data: { viewCount: { increment: 1 } },
    });
    const target = await createPage();
    await prisma.page.update({
      where: { id: target.id },
      data: { status: 'PUBLISHED' },
    });
    await prisma.page.update({
      where: { id: target.id },
      data: { status: 'PUBLISHED' },
    });
    await prisma.page.update({
      where: { id: target.id },
      data: { status: 'UNPUBLISHED' },
    });
    await prisma.page.update({
      where: { id: target.id },
      data: { status: 'PUBLISHED' },
    });
    const visits = new PrismaPageAnalyticsRepository(prisma);
    await Promise.all([
      visits.recordVisit(target.id, 'same-fixture-browser'),
      visits.recordVisit(target.id, 'same-fixture-browser'),
    ]);
    expect(await prisma.pageVisit.count({ where: { pageId: target.id } })).toBe(
      1,
    );
    const oldDay = new Date(day.getTime() - 86_400_000);
    const rejection: unknown = await prisma.pageVisit
      .create({
        data: {
          pageId: target.id,
          browserTokenHash: 'backdated',
          visitedOn: oldDay,
        },
      })
      .catch((error: unknown) => error);
    expect(isAnalyticsSourceRejection(rejection)).toBe(true);
    const rolledBack = `${prefix}-rollback`;
    userIds.push(rolledBack);
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.create({ data: person(rolledBack) });
        throw new Error('Rollback fixture');
      }),
    ).rejects.toThrow('Rollback fixture');
    const counted = await prisma.dailyAdminMetrics.findUniqueOrThrow({
      where: { day },
    });
    expect(counted).toMatchObject({
      creatorSignups: before.creatorSignups,
      pagesCreated: before.pagesCreated + 1n,
      publishActions: before.publishActions + 2n,
      pageViews: before.pageViews + 3n,
      dailyPageVisits: before.dailyPageVisits + 1n,
    });
    const current = adminOverviewResponseSchema.parse(
      (await get('?period=7').expect(200)).body,
    );
    await prisma.page.update({
      where: { id: target.id },
      data: { deletionRequestedAt: new Date() },
    });
    const blocked = adminOverviewResponseSchema.parse(
      (await get('?period=7').expect(200)).body,
    );
    expect(BigInt(blocked.pages.total)).toBe(BigInt(current.pages.total) - 1n);
    await prisma.page.delete({ where: { id: target.id } });
    expect(
      await prisma.dailyAdminMetrics.findUniqueOrThrow({ where: { day } }),
    ).toEqual(counted);
  });

  it('labels UTC boundary days, reports real zeros, and preserves exact large counts', async () => {
    const start = new Date(day.getTime() - 3 * 86_400_000 + 12 * 3_600_000);
    await prisma.analyticsCoverage.update({
      where: { id: 'platform' },
      data: { startedAt: start },
    });
    await prisma.dailyAdminMetrics.update({
      where: { day },
      data: { pageViews: 9_007_199_254_740_993n },
    });
    const overview = adminOverviewResponseSchema.parse(
      (await get('?period=90').expect(200)).body,
    );
    expect(overview.buckets).toHaveLength(90);
    expect(overview.buckets[85]).toMatchObject({
      available: false,
      partial: false,
      pageViews: null,
    });
    expect(overview.buckets[86]).toMatchObject({
      date: start.toISOString().slice(0, 10),
      available: true,
      partial: true,
      pageViews: '0',
    });
    expect(overview.buckets[87]).toMatchObject({
      available: true,
      partial: false,
      pageViews: '0',
    });
    expect(overview.buckets.at(-1)).toMatchObject({
      date: day.toISOString().slice(0, 10),
      available: true,
      partial: true,
      pageViews: '9007199254740993',
    });
    expect(
      new Date(overview.periodEndExclusive).getTime() -
        new Date(overview.periodStart).getTime(),
    ).toBe(90 * 86_400_000);
  });
});
