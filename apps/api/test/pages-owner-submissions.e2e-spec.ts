import { jest } from '@jest/globals';
import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import {
  PAGE_SUBMISSIONS_REPOSITORY,
  type PageSubmissionsRepository,
  type SubmissionDetail,
} from '../src/modules/pages/application/page-submissions.repository';
import { pageSubmissionsServiceProvider } from '../src/modules/pages/pages.module';
import { OwnerPageSubmissionsController } from '../src/modules/pages/presentation/owner-page-submissions.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const submissionId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';
const submittedAt = new Date('2026-10-02T01:00:00.000Z');
const owner = { creatorId, pageId, submissionId };
const baseUrl = `/api/v1/pages/${pageId}/submissions`;
const summary = {
  id: submissionId,
  readState: 'UNREAD' as const,
  submittedAt,
  answerCount: 1,
  hasVisitorMessage: true,
};
const detail: SubmissionDetail = {
  id: submissionId,
  pageId,
  readState: 'UNREAD',
  submittedAt,
  answers: [
    {
      questionId: submissionId,
      promptSnapshot: 'Your memory?',
      choiceLabelSnapshot: null,
      textAnswer: 'A memory',
    },
  ],
  visitorMessage: { promptSnapshot: 'Your note?', message: 'A private note' },
  journeySnapshot: null,
};
const journeySnapshot: NonNullable<SubmissionDetail['journeySnapshot']> = {
  revisionNumber: 3,
  answers: [
    {
      questionKey: 'root',
      prompt: 'Choose a memory',
      choiceKey: 'happy',
      choiceLabel: 'Happy moments',
    },
  ],
  outcomeKey: 'happy-result',
  outcomeTitle: 'Happy memories',
  outcomeMessage: 'A saved outcome',
};
const routes = [
  {
    name: 'list',
    method: 'get',
    path: baseUrl,
    body: {},
    operation: 'listOwned',
  },
  {
    name: 'detail',
    method: 'get',
    path: `${baseUrl}/${submissionId}`,
    body: {},
    operation: 'findOwned',
  },
  {
    name: 'read',
    method: 'post',
    path: `${baseUrl}/${submissionId}/read`,
    body: {},
    operation: 'markRead',
  },
  {
    name: 'delete',
    method: 'delete',
    path: `${baseUrl}/${submissionId}`,
    body: { confirm: true },
    operation: 'deleteOwned',
  },
] as const;
let authenticated = true;

class FixtureSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!authenticated)
      throw new ApiException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    const incoming = context.switchToHttp().getRequest<AuthenticatedRequest>();
    incoming.authSession = {
      user: { id: creatorId },
    } as AuthenticatedRequest['authSession'];
    return true;
  }
}

function createRepository() {
  return {
    listOwned: jest.fn<PageSubmissionsRepository['listOwned']>(),
    findOwned: jest.fn<PageSubmissionsRepository['findOwned']>(),
    markRead: jest.fn<PageSubmissionsRepository['markRead']>(),
    deleteOwned: jest.fn<PageSubmissionsRepository['deleteOwned']>(),
  };
}

describe('Owner submission HTTP boundary', () => {
  let app: INestApplication<App>;
  let repository: ReturnType<typeof createRepository>;

  async function compose(withService = true) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPageSubmissionsController],
      providers: withService
        ? [
            pageSubmissionsServiceProvider,
            { provide: PAGE_SUBMISSIONS_REPOSITORY, useValue: repository },
          ]
        : [],
    })
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(FixtureSessionGuard)
      .compile();
    const result: INestApplication<App> = module.createNestApplication();
    configureHttpApplication(result);
    await result.init();
    return result;
  }

  beforeEach(async () => {
    authenticated = true;
    repository = createRepository();
    repository.listOwned.mockResolvedValue({
      items: [summary],
      unreadCount: 1,
      nextCursor: null,
    });
    repository.findOwned.mockResolvedValue(detail);
    repository.markRead.mockResolvedValue('updated');
    repository.deleteOwned.mockResolvedValue('deleted');
    app = await compose();
  });
  afterEach(async () => {
    await app.close();
  });

  it('lists safe summaries with defaults, session ownership, unread count, and no-store', async () => {
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}?creatorId=untrusted`)
      .expect(200);
    expect(repository.listOwned.mock.calls).toEqual([
      [{ creatorId, pageId, filter: 'all', size: 20, cursor: null }],
    ]);
    expect(response.body).toEqual({
      items: [{ ...summary, submittedAt: submittedAt.toISOString() }],
      unreadCount: 1,
      nextCursor: null,
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('round trips the versioned cursor and forwards validated filters and page size', async () => {
    const cursor = { submittedAt, id: submissionId };
    const encoded = Buffer.from(
      JSON.stringify({
        version: 1,
        submittedAt: submittedAt.toISOString(),
        id: submissionId,
      }),
      'utf8',
    ).toString('base64url');
    repository.listOwned.mockResolvedValue({
      items: [summary],
      unreadCount: 1,
      nextCursor: cursor,
    });
    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .query({ filter: 'unread', size: 10, cursor: encoded })
      .expect(200);
    expect(repository.listOwned.mock.calls).toEqual([
      [{ creatorId, pageId, filter: 'unread', size: 10, cursor }],
    ]);
    expect(response.body).toMatchObject({ nextCursor: encoded });
  });

  it.each([
    'not-json',
    Buffer.from(
      JSON.stringify({
        version: 2,
        submittedAt: submittedAt.toISOString(),
        id: submissionId,
      }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({ version: 1, submittedAt: 'invalid', id: submissionId }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        version: 1,
        submittedAt: submittedAt.toISOString(),
        id: 'invalid',
      }),
    ).toString('base64url'),
  ])(
    'rejects an invalid opaque cursor before persistence: %s',
    async (cursor) => {
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({ cursor })
        .expect(422);
      expect(response.body).toMatchObject({
        code: 'INVALID_CURSOR',
        message: 'Invalid submission cursor',
      });
      expect(repository.listOwned).not.toHaveBeenCalled();
      expect(response.headers['cache-control']).toBe('no-store');
    },
  );

  it.each([{ size: 51 }, { filter: 'invalid' }])(
    'rejects invalid query bounds: %s',
    async (query) => {
      await request(app.getHttpServer()).get(baseUrl).query(query).expect(422);
      expect(repository.listOwned).not.toHaveBeenCalled();
    },
  );

  it.each([null, journeySnapshot])(
    'preserves owner detail for both template snapshot shapes: %s',
    async (snapshot) => {
      repository.findOwned.mockResolvedValue({
        ...detail,
        journeySnapshot: snapshot,
      });
      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${submissionId}?creatorId=untrusted`)
        .expect(200);
      expect(repository.findOwned.mock.calls).toEqual([[owner]]);
      expect(response.body).toEqual({
        ...detail,
        submittedAt: submittedAt.toISOString(),
        journeySnapshot: snapshot,
      });
      expect(response.headers['cache-control']).toBe('no-store');
    },
  );

  it('marks a response read using only session supplied ownership', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/${submissionId}/read`)
      .send({ creatorId: 'untrusted' })
      .expect(200);
    expect(repository.markRead.mock.calls).toEqual([[owner]]);
    expect(response.body).toEqual({ submissionId, readState: 'READ' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('deletes only after explicit confirmation and retains no-store', async () => {
    const response = await request(app.getHttpServer())
      .delete(`${baseUrl}/${submissionId}`)
      .send({ confirm: true, creatorId: 'untrusted' })
      .expect(200);
    expect(repository.deleteOwned.mock.calls).toEqual([
      [{ ...owner, confirm: true }],
    ]);
    expect(response.body).toEqual({ deleted: true });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([{}, { confirm: false }])(
    'requires deletion confirmation before persistence: %s',
    async (body) => {
      const response = await request(app.getHttpServer())
        .delete(`${baseUrl}/${submissionId}`)
        .send(body)
        .expect(409);
      expect(response.body).toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
      expect(repository.deleteOwned).not.toHaveBeenCalled();
    },
  );

  it.each(routes)('requires authentication before $name', async (route) => {
    authenticated = false;
    const response = await request(app.getHttpServer())
      [route.method](route.path)
      .send(route.body)
      .expect(401);
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(repository[route.operation]).not.toHaveBeenCalled();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(routes)(
    'retains absent optional service handling for $name',
    async (route) => {
      await app.close();
      app = await compose(false);
      const response = await request(app.getHttpServer())
        [route.method](route.path)
        .send(route.body)
        .expect(503);
      expect(response.body).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Submission service unavailable',
      });
      expect(repository[route.operation]).not.toHaveBeenCalled();
      expect(response.headers['cache-control']).toBe('no-store');
    },
  );

  it.each(routes)(
    'retains safe not found handling for $name',
    async (route) => {
      repository.listOwned.mockResolvedValue({ type: 'not_found' });
      repository.findOwned.mockResolvedValue(null);
      repository.markRead.mockResolvedValue('not_found');
      repository.deleteOwned.mockResolvedValue('not_found');
      const response = await request(app.getHttpServer())
        [route.method](route.path)
        .send(route.body)
        .expect(404);
      expect(response.body).toMatchObject({
        code: 'PAGE_NOT_FOUND',
        message: 'This letter is not available',
      });
      expect(response.headers['cache-control']).toBe('no-store');
    },
  );

  it.each([
    { method: 'get', path: '/api/v1/pages/invalid/submissions', body: {} },
    { method: 'post', path: `${baseUrl}/invalid/read`, body: {} },
    {
      method: 'delete',
      path: `${baseUrl}/${submissionId}`,
      body: { confirm: 'yes' },
    },
  ] as const)(
    'rejects malformed route/body inputs: $method $path',
    async ({ method, path, body }) => {
      await request(app.getHttpServer())[method](path).send(body).expect(422);
      expect(repository.listOwned).not.toHaveBeenCalled();
      expect(repository.markRead).not.toHaveBeenCalled();
      expect(repository.deleteOwned).not.toHaveBeenCalled();
    },
  );

  it('redacts unexpected repository failures and retains no-store', async () => {
    repository.findOwned.mockRejectedValue(
      new Error('private persistence failure'),
    );
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}/${submissionId}`)
      .expect(500);
    expect(response.body).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(JSON.stringify(response.body)).not.toContain(
      'private persistence failure',
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
