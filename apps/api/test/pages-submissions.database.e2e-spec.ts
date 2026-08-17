import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { PagesModule } from '../src/modules/pages/pages.module';
import { PageSubmissionsService } from '../src/modules/pages/application/page-submissions.service';
import { PrismaPageSubmissionsRepository } from '../src/modules/pages/infrastructure/prisma-page-submissions.repository';

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

describeReal('Public visitor submissions with a writable database', () => {
  jest.setTimeout(30_000);

  let app: INestApplication<App>;
  let prisma: PrismaClient;
  const slug = process.env.REAL_RESPONSE_TEST_SLUG ?? 'wkj67c48';
  let pageFixture: {
    id: string;
    creatorId: string;
    questions: Array<{
      id: string;
      choices: Array<{ id: string }>;
    }>;
  } | null = null;

  beforeAll(async () => {
    prisma = getPrismaClient();
    pageFixture = await withRetry(() =>
      prisma.page.findFirst({
        where: { slug, status: 'PUBLISHED' },
        select: {
          id: true,
          creatorId: true,
          questions: {
            select: {
              id: true,
              choices: {
                select: { id: true },
                orderBy: { displayOrder: 'asc' },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
      }),
    );

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

  it('persists one public response and completes its owner lifecycle', async () => {
    const page = pageFixture;
    const question = page?.questions[0];
    const choice = question?.choices[0];
    expect(page).toBeTruthy();
    expect(question).toBeTruthy();
    expect(choice).toBeTruthy();
    if (!page || !question || !choice) return;

    const idempotencyKey = `real-e2e-${randomUUID()}`;
    const browserCookie = `letterly_browser=${randomUUID()}`;
    const body = {
      answers: [
        {
          questionId: question.id,
          choiceId: choice.id,
          textAnswer: null,
        },
      ],
      visitorMessage: `Real response ${idempotencyKey}`,
      idempotencyKey,
    };
    const repository = new PrismaPageSubmissionsRepository(prisma);
    const submissions = new PageSubmissionsService(repository);

    let submissionId: string | null = null;
    try {
      const submitResponse = await withRetry(async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/public/pages/${slug}/submissions`)
          .set('Cookie', browserCookie)
          .send(body);
        if (response.status !== 201) {
          throw new Error(
            `Public submission failed: ${response.status} ${JSON.stringify(
              response.body,
            )}`,
          );
        }
        return response;
      });
      expect(submitResponse.body).toEqual({ accepted: true });

      const row = await prisma.visitorSubmission.findUnique({
        where: {
          pageId_idempotencyKey: {
            pageId: page.id,
            idempotencyKey,
          },
        },
        select: {
          id: true,
          answers: { select: { id: true } },
          visitorMessage: { select: { message: true } },
        },
      });
      expect(row).toBeTruthy();
      if (!row) return;
      submissionId = row.id;
      expect(row.answers).toHaveLength(1);
      expect(row.visitorMessage?.message).toBe(body.visitorMessage);

      await request(app.getHttpServer())
        .post(`/api/v1/public/pages/${slug}/submissions`)
        .set('Cookie', browserCookie)
        .send(body)
        .expect(201, { accepted: true });

      const listed = await submissions.list({
        creatorId: page.creatorId,
        pageId: page.id,
        filter: 'all',
        size: 50,
        cursor: null,
      });
      expect(listed.items.some((item) => item.id === submissionId)).toBe(true);

      const detail = await submissions.find({
        creatorId: page.creatorId,
        pageId: page.id,
        submissionId,
      });
      expect(detail.visitorMessage?.message).toBe(body.visitorMessage);

      await expect(
        submissions.markRead({
          creatorId: page.creatorId,
          pageId: page.id,
          submissionId,
        }),
      ).resolves.toEqual({ submissionId, readState: 'READ' });

      await expect(
        submissions.delete({
          creatorId: page.creatorId,
          pageId: page.id,
          submissionId,
          confirm: true,
        }),
      ).resolves.toEqual({ deleted: true });

      const tombstone = await prisma.visitorSubmission.findUnique({
        where: { id: submissionId },
        select: {
          deletedAt: true,
          answers: { select: { id: true } },
          visitorMessage: { select: { id: true } },
        },
      });
      expect(tombstone?.deletedAt).toBeInstanceOf(Date);
      expect(tombstone?.answers).toHaveLength(0);
      expect(tombstone?.visitorMessage).toBeNull();
    } finally {
      if (submissionId) {
        await prisma.visitorSubmission
          .delete({ where: { id: submissionId } })
          .catch(() => undefined);
      }
    }
  });
});
