import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import { chooseYourHeartDefaultGraph } from '@letterly/templates';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { PagesModule } from '../src/modules/pages/pages.module';
import { PageService } from '../src/modules/pages/application/page.service';
import { PrismaPageJourneysRepository } from '../src/modules/pages/infrastructure/prisma-page-journeys.repository';

const runRealDatabaseTests = process.env.RUN_REAL_DB_TESTS === '1';
const describeReal = runRealDatabaseTests ? describe : describe.skip;

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

describeReal('Choose Your Heart journeys with a writable database', () => {
  jest.setTimeout(90_000);

  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let templateVersionId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const templateVersion = await withRetry(() =>
      prisma.templateVersion.findUnique({
        where: { registryKey: 'confession.choose-your-heart' },
        select: { id: true },
      }),
    );
    expect(templateVersion).toBeTruthy();
    if (!templateVersion) return;
    templateVersionId = templateVersion.id;

    const moduleFixture = await Test.createTestingModule({
      imports: [PrismaModule, PagesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await disconnectPrisma();
  });

  it('creates an immutable starter revision and saves a newer draft revision', async () => {
    const creatorId = `real-choose-heart-${randomUUID()}`;

    await withRetry(() =>
      prisma.user.create({
        data: {
          id: creatorId,
          name: 'Choose Your Heart database test',
          email: `${creatorId}@example.test`,
        },
      }),
    );

    let pageId: string | null = null;
    try {
      const pageService = app.get(PageService);
      const page = await withRetry(() =>
        pageService.createDraft({
          creatorId,
          templateVersionId,
        }),
      );
      pageId = page.id;

      const journeyBefore = await withRetry(() =>
        prisma.pageJourney.findUnique({
          where: { pageId: page.id },
          select: {
            id: true,
            draftRevision: { select: { id: true, revisionNumber: true } },
            nextRevisionNumber: true,
          },
        }),
      );
      expect(journeyBefore?.draftRevision.revisionNumber).toBe(1);
      expect(journeyBefore?.nextRevisionNumber).toBe(2);

      const repository = new PrismaPageJourneysRepository(prisma);
      const result = await withRetry(() =>
        repository.save({
          creatorId,
          pageId: page.id,
          expectedContentVersion: page.contentVersion,
          graph: chooseYourHeartDefaultGraph,
          maxDepth: 1,
        }),
      );

      expect(result.type).toBe('updated');
      if (result.type !== 'updated' || !journeyBefore) return;

      expect(result.state.draft.revisionNumber).toBe(2);
      expect(result.state.contentVersion).toBe(page.contentVersion + 1);

      const journeyAfter = await withRetry(() =>
        prisma.pageJourney.findUnique({
          where: { pageId: page.id },
          select: {
            draftRevisionId: true,
            nextRevisionNumber: true,
            revisions: {
              select: { id: true, revisionNumber: true },
              orderBy: { revisionNumber: 'asc' },
            },
          },
        }),
      );
      expect(journeyAfter?.draftRevisionId).not.toBe(
        journeyBefore.draftRevision.id,
      );
      expect(journeyAfter?.nextRevisionNumber).toBe(3);
      expect(journeyAfter?.revisions).toHaveLength(2);
      expect(
        journeyAfter?.revisions.map((revision) => revision.revisionNumber),
      ).toEqual([1, 2]);
    } finally {
      if (pageId) {
        await prisma.page
          .delete({ where: { id: pageId } })
          .catch(() => undefined);
      }
      await prisma.user
        .delete({ where: { id: creatorId } })
        .catch(() => undefined);
    }
  });

  it('publishes a journey and keeps its private submission snapshot idempotent', async () => {
    const creatorId = `real-choose-heart-public-${randomUUID()}`;

    await withRetry(() =>
      prisma.user.create({
        data: {
          id: creatorId,
          name: 'Choose Your Heart public database test',
          email: `${creatorId}@example.test`,
        },
      }),
    );

    let pageId: string | null = null;
    let submissionId: string | null = null;
    try {
      const pageService = app.get(PageService);
      const page = await withRetry(() =>
        pageService.createDraft({
          creatorId,
          templateVersionId,
        }),
      );
      pageId = page.id;

      const published = await withRetry(() =>
        pageService.publishPage({
          creatorId,
          pageId: page.id,
          customSlug: null,
          confirmReady: true,
        }),
      );
      expect(published.page.status).toBe('PUBLISHED');

      const projection = await withRetry(() =>
        pageService.getPublicPage(published.page.slug),
      );
      expect('publishedGraphVersion' in projection).toBe(true);
      if (!('publishedGraphVersion' in projection)) return;
      expect(projection.publishedGraphVersion).toBe(1);
      expect(projection.response?.enabled).toBe(true);
      expect(projection.questions[0]?.choices[0]?.outcomeKey).toBe(
        'happy-result',
      );

      const idempotencyKey = `journey-public-${randomUUID()}`;
      const browserCookie = `letterly_browser=${randomUUID()}`;
      const body = {
        publishedGraphVersion: projection.publishedGraphVersion,
        answers: [{ questionKey: 'root', choiceKey: 'happy' }],
        outcomeKey: 'happy-result',
        visitorMessage: 'A private journey note.',
      };

      const first = await withRetry(async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/public/pages/${published.page.slug}/submissions`)
          .set('Cookie', browserCookie)
          .set('Idempotency-Key', idempotencyKey)
          .send(body);
        if (response.status !== 201) {
          throw new Error(
            `Journey submission failed: ${response.status} ${JSON.stringify(
              response.body,
            )}`,
          );
        }
        return response;
      });
      expect(first.body).toEqual({ accepted: true });

      const row = await withRetry(() =>
        prisma.visitorSubmission.findUnique({
          where: {
            pageId_idempotencyKey: {
              pageId: published.page.id,
              idempotencyKey,
            },
          },
          select: {
            id: true,
            journeySnapshot: true,
            visitorMessage: { select: { message: true } },
          },
        }),
      );
      expect(row).toBeTruthy();
      if (!row) return;
      submissionId = row.id;
      expect(row.journeySnapshot).toMatchObject({
        revisionNumber: 1,
        answers: [
          {
            questionKey: 'root',
            choiceKey: 'happy',
            prompt: 'What do you remember?',
            choiceLabel: 'The happy moments',
          },
        ],
        outcomeKey: 'happy-result',
        outcomeTitle: 'A heart full of warmth',
      });
      expect(row.visitorMessage?.message).toBe('A private journey note.');

      await request(app.getHttpServer())
        .post(`/api/v1/public/pages/${published.page.slug}/submissions`)
        .set('Cookie', browserCookie)
        .set('Idempotency-Key', idempotencyKey)
        .send(body)
        .expect(201, { accepted: true });

      await request(app.getHttpServer())
        .post(`/api/v1/public/pages/${published.page.slug}/submissions`)
        .set('Cookie', browserCookie)
        .set('Idempotency-Key', idempotencyKey)
        .send({ ...body, outcomeKey: 'quiet-result' })
        .expect(409);

      const concurrent = await Promise.all(
        Array.from({ length: 3 }, async () =>
          request(app.getHttpServer())
            .post(`/api/v1/public/pages/${published.page.slug}/submissions`)
            .set('Cookie', `letterly_browser=${randomUUID()}`)
            .set('Idempotency-Key', `journey-concurrent-${randomUUID()}`)
            .send(body),
        ),
      );
      expect(concurrent.map((response) => response.status)).toEqual([
        201, 201, 201,
      ]);
    } finally {
      if (submissionId) {
        await prisma.visitorSubmission
          .delete({ where: { id: submissionId } })
          .catch(() => undefined);
      }
      if (pageId) {
        await prisma.page
          .delete({ where: { id: pageId } })
          .catch(() => undefined);
      }
      await prisma.user
        .delete({ where: { id: creatorId } })
        .catch(() => undefined);
    }
  });
});
