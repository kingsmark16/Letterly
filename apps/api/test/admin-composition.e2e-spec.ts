import {
  Global,
  Module,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import { PRISMA_CLIENT } from '../src/infrastructure/database/prisma-token';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RATE_LIMIT_STORE,
  RateLimitService,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import { BetterAuthSessionGuard } from '../src/modules/auth/better-auth-session.guard';
import {
  AdminModule,
  adminReportsServiceProvider,
} from '../src/modules/admin/admin.module';
import { AdminAccessService } from '../src/modules/admin/application/admin-access.service';
import { ADMIN_ACCESS_REPOSITORY } from '../src/modules/admin/application/admin-access.repository';
import { AdminBootstrapService } from '../src/modules/admin/application/admin-bootstrap.service';
import { ADMIN_BOOTSTRAP_REPOSITORY } from '../src/modules/admin/application/admin-bootstrap.repository';
import { AdminReportsService } from '../src/modules/admin/application/admin-reports.service';
import { ADMIN_REPORTS_REPOSITORY } from '../src/modules/admin/application/admin-reports.repository';
import { AdminAuditService } from '../src/modules/admin/application/admin-audit.service';
import { ADMIN_AUDIT_REPOSITORY } from '../src/modules/admin/application/admin-audit.repository';
import { AdminModerationService } from '../src/modules/admin/application/admin-moderation.service';
import {
  ADMIN_MODERATION_REPOSITORY,
  AdminModerationNotFoundError,
  AdminModerationStaleVersionError,
  AdminModerationIdempotencyConflictError,
  AdminProtectedTargetError,
  AdminAppealTransitionError,
  AdminModerationTransitionError,
} from '../src/modules/admin/application/admin-moderation.repository';
import { ADMIN_RETENTION_REPOSITORY } from '../src/modules/admin/application/admin-retention.repository';
import { ADMIN_CURSOR } from '../src/modules/admin/application/admin-cursor';
import {
  AdminCursorService,
  ADMIN_CURSOR_SIGNING_SECRET,
} from '../src/modules/admin/infrastructure/admin-cursor.service';
import { PrismaAdminAccessRepository } from '../src/modules/admin/infrastructure/prisma-admin-access.repository';
import { PrismaAdminBootstrapRepository } from '../src/modules/admin/infrastructure/prisma-admin-bootstrap.repository';
import { PrismaAdminReportsRepository } from '../src/modules/admin/infrastructure/prisma-admin-reports.repository';
import { PrismaAdminAuditRepository } from '../src/modules/admin/infrastructure/prisma-admin-audit.repository';
import { PrismaAdminModerationRepository } from '../src/modules/admin/infrastructure/prisma-admin-moderation.repository';
import { PrismaAdminRetentionRepository } from '../src/modules/admin/infrastructure/prisma-admin-retention.repository';
import { APP_ORIGIN } from '../src/modules/pages/application/page.service';

const reportId = '11111111-1111-4111-8111-111111111111';
const pageId = '22222222-2222-4222-8222-222222222222';
const actionId = '33333333-3333-4333-8333-333333333333';
const appealId = '44444444-4444-4444-8444-444444444444';
const mutation = {
  confirm: true,
  expectedModerationVersion: 1,
  reason: 'SPAM',
  idempotencyKey: 'fixture-action-1',
};

const prisma = {
  user: { findUnique: jest.fn<() => Promise<unknown>>() },
  pageReport: {
    findMany: jest.fn<() => Promise<unknown>>(),
    findUnique: jest.fn<() => Promise<unknown>>(),
  },
  auditEvent: { findMany: jest.fn<() => Promise<unknown>>() },
  $transaction: jest.fn<() => Promise<unknown>>(),
};
const consumeAdminRead = jest.fn<RateLimitService['consumeAdminRead']>();
const consumeAdminWrite = jest.fn<RateLimitService['consumeAdminWrite']>();

@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: prisma }],
  exports: [PRISMA_CLIENT],
})
class FixtureDatabaseModule {}

describe('Administration production module and HTTP boundaries', () => {
  let app: INestApplication<App>;
  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique
      .mockReset()
      .mockResolvedValue({ role: 'ADMIN', moderationStatus: 'ACTIVE' });
    prisma.pageReport.findMany.mockReset().mockResolvedValue([]);
    prisma.pageReport.findUnique.mockReset().mockResolvedValue(null);
    prisma.auditEvent.findMany.mockReset().mockResolvedValue([]);
    prisma.$transaction.mockReset();
    consumeAdminRead.mockReset().mockResolvedValue(undefined);
    consumeAdminWrite.mockReset().mockResolvedValue(undefined);
    module = await Test.createTestingModule({
      imports: [FixtureDatabaseModule, AdminModule],
    })
      .overrideGuard(BetterAuthSessionGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            authSession?: { user: { id: string } };
          }>();
          if (req.headers['x-fixture-session'] !== 'authenticated')
            throw new ApiException({
              statusCode: 401,
              code: 'UNAUTHENTICATED',
              message: 'Authentication required',
            });
          req.authSession = { user: { id: 'admin-1' } };
          return true;
        },
      })
      .overrideProvider(APP_ORIGIN)
      .useValue('https://letterly.test')
      .overrideProvider(ADMIN_CURSOR_SIGNING_SECRET)
      .useValue('fixture-signing-secret'.repeat(2))
      .overrideProvider(RATE_LIMIT_STORE)
      .useValue({})
      .overrideProvider(RateLimitService)
      .useValue({ consumeAdminRead, consumeAdminWrite })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  function get(path = '/reports') {
    return request(app.getHttpServer())
      .get('/api/v1/admin' + path)
      .set('x-fixture-session', 'authenticated');
  }
  function post(path = `/reports/${reportId}/review`, body: object = mutation) {
    return request(app.getHttpServer())
      .post('/api/v1/admin' + path)
      .set('x-fixture-session', 'authenticated')
      .send(body);
  }
  function expectError(
    response: request.Response,
    statusCode: number,
    code: string,
  ) {
    const envelope = apiErrorEnvelopeSchema.parse(response.body);
    expect(envelope).toMatchObject({ statusCode, code });
    expect(response.headers['x-request-id']).toBe(envelope.requestId);
  }

  it('binds all repository and cursor ports to singleton production implementations', () => {
    for (const [token, implementation] of [
      [ADMIN_ACCESS_REPOSITORY, PrismaAdminAccessRepository],
      [ADMIN_BOOTSTRAP_REPOSITORY, PrismaAdminBootstrapRepository],
      [ADMIN_REPORTS_REPOSITORY, PrismaAdminReportsRepository],
      [ADMIN_AUDIT_REPOSITORY, PrismaAdminAuditRepository],
      [ADMIN_MODERATION_REPOSITORY, PrismaAdminModerationRepository],
      [ADMIN_RETENTION_REPOSITORY, PrismaAdminRetentionRepository],
      [ADMIN_CURSOR, AdminCursorService],
    ] as const)
      expect(module.get(token)).toBe(module.get(implementation));
    for (const service of [
      AdminAccessService,
      AdminBootstrapService,
      AdminReportsService,
      AdminAuditService,
      AdminModerationService,
    ]) {
      expect(module.get(service)).toBeInstanceOf(service);
    }
  });

  it('fails report service composition when the cursor port is missing', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          adminReportsServiceProvider,
          { provide: ADMIN_REPORTS_REPOSITORY, useValue: {} },
        ],
      }).compile(),
    ).rejects.toThrow();
  });

  it('requires authentication before querying administrator access or reports', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .expect(401);
    expectError(response, 401, 'UNAUTHENTICATED');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.pageReport.findMany).not.toHaveBeenCalled();
  });

  it.each([
    [{ role: 'CREATOR', moderationStatus: 'ACTIVE' }, 'ADMIN_REQUIRED'],
    [null, 'ADMIN_REQUIRED'],
    [{ role: 'ADMIN', moderationStatus: 'DISABLED' }, 'ACCOUNT_DISABLED'],
  ])(
    'rejects access state %p before cataloging reports',
    async (user, code) => {
      prisma.user.findUnique.mockResolvedValue(user);
      const response = await get().expect(403);
      expectError(response, 403, code);
      expect(prisma.pageReport.findMany).not.toHaveBeenCalled();
      expect(consumeAdminRead).not.toHaveBeenCalled();
    },
  );

  it('returns a private report listing with safe selected data and signed continuation', async () => {
    const now = new Date('2026-08-24T00:00:00Z');
    const row = {
      id: reportId,
      pageId,
      reason: 'SPAM',
      message: null,
      status: 'OPEN',
      moderationVersion: 1,
      createdAt: now,
      updatedAt: now,
      page: { creatorId: 'creator-1' },
      _count: { moderationActions: 0 },
    };
    prisma.pageReport.findMany.mockResolvedValue([
      row,
      { ...row, id: actionId },
    ]);
    const response = await get('/reports?size=1&status=OPEN').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toMatchObject({
      items: [{ id: reportId, creatorId: 'creator-1', actionCount: 0 }],
    });
    const body = response.body as { nextCursor: string; items: object[] };
    expect(body.items[0]).not.toHaveProperty('page');
    const cursors = module.get(AdminCursorService);
    expect(
      cursors.decode({
        cursor: body.nextCursor,
        filterHash: cursors.filterHash({
          status: 'OPEN',
          reason: null,
          pageId: null,
          userId: null,
        }),
        size: 1,
      }),
    ).toEqual({ id: reportId, createdAt: now });
    expect(consumeAdminRead).toHaveBeenCalledWith('admin-1');
    expect(prisma.pageReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('returns private audit data through the real adapter and service', async () => {
    const now = new Date('2026-08-24T00:00:00Z');
    prisma.auditEvent.findMany.mockResolvedValue([
      {
        id: actionId,
        actorId: 'admin-1',
        eventType: 'PAGE_DISABLED',
        targetType: 'PAGE',
        targetId: pageId,
        requestId: actionId,
        outcome: 'SUCCESS',
        metadata: { reasonCode: 'SPAM' },
        createdAt: now,
      },
    ]);
    const response = await get('/audit-events').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toEqual({
      items: [
        {
          id: actionId,
          actorId: 'admin-1',
          eventType: 'PAGE_DISABLED',
          targetType: 'PAGE',
          targetId: pageId,
          requestId: actionId,
          outcome: 'SUCCESS',
          metadata: { reasonCode: 'SPAM' },
          createdAt: now.toISOString(),
        },
      ],
      nextCursor: null,
    });
  });

  it.each(['/reports', '/audit-events'])(
    'rejects bad cursors with the stable HTTP error at %s',
    async (path) => {
      expectError(
        await get(path + '?cursor=invalid').expect(422),
        422,
        'INVALID_CURSOR',
      );
      expect(prisma.pageReport.findMany).not.toHaveBeenCalled();
      expect(prisma.auditEvent.findMany).not.toHaveBeenCalled();
    },
  );

  it('maps an absent report to safe not found', async () => {
    expectError(
      await get(`/reports/${reportId}`).expect(404),
      404,
      'NOT_FOUND',
    );
  });

  it.each([
    ['/reports?size=100', false],
    ['/reports/not-a-uuid/review', true],
  ])(
    'rejects malformed boundary input at %s before feature queries',
    async (path, mutationRequest) => {
      const response = mutationRequest
        ? await post(path).expect(422)
        : await get(path).expect(422);
      expectError(response, 422, 'VALIDATION_FAILED');
      expect(prisma.pageReport.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects untrusted cookie mutation origins before the transaction', async () => {
    const response = await post()
      .set('Cookie', 'session=fixture')
      .set('Origin', 'https://untrusted.test')
      .set('x-csrf-token', 'fixture')
      .expect(403);
    expectError(response, 403, 'CSRF_ORIGIN_INVALID');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    new AdminModerationNotFoundError(),
    new AdminModerationStaleVersionError(),
    new AdminModerationIdempotencyConflictError(),
    new AdminProtectedTargetError(),
    new AdminAppealTransitionError(),
    new AdminModerationTransitionError(),
  ])('retains safe mutation errors for %p', async (error) => {
    prisma.$transaction.mockRejectedValue(error);
    const status = error instanceof AdminModerationNotFoundError ? 404 : 409;
    expectError(
      await post().expect(status),
      status,
      status === 404
        ? 'NOT_FOUND'
        : error instanceof AdminModerationStaleVersionError
          ? 'STALE_MODERATION_VERSION'
          : error instanceof AdminModerationIdempotencyConflictError
            ? 'IDEMPOTENCY_CONFLICT'
            : 'CONFLICT',
    );
  });

  it.each([
    [new RateLimitExceededError(17), 429, 'RATE_LIMITED'],
    [new RateLimitUnavailableError(), 503, 'RATE_LIMIT_STORE_UNAVAILABLE'],
  ] as const)(
    'maps read and write rate limit failure %p without feature work',
    async (error, status, code) => {
      consumeAdminRead.mockRejectedValue(error);
      consumeAdminWrite.mockRejectedValue(error);
      expectError(await get().expect(status), status, code);
      expectError(await post().expect(status), status, code);
      expect(prisma.pageReport.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('passes trusted mutation identity, version, and idempotency through the plain service', async () => {
    const mutateReport = jest
      .spyOn(module.get(PrismaAdminModerationRepository), 'mutateReport')
      .mockResolvedValue({
        actionId,
        targetType: 'REPORT',
        targetId: reportId,
        moderationVersion: 2,
        replayed: false,
      });
    const response = await post()
      .set('Cookie', 'session=fixture')
      .set('Origin', 'https://letterly.test')
      .set('x-csrf-token', 'fixture')
      .set('x-request-id', actionId)
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(mutateReport).toHaveBeenCalledWith({
      actorId: 'admin-1',
      reportId,
      operation: 'REPORT_REVIEW',
      request: mutation,
      requestId: response.headers['x-request-id'],
    });
    expect(consumeAdminWrite).toHaveBeenCalledWith('admin-1');
    expect(response.headers['x-request-id']).not.toBe(actionId);
  });

  it.each([
    [`/pages/${pageId}/disable`, 'mutatePage'],
    [`/users/creator-1/disable`, 'mutateUser'],
    [`/appeals/${appealId}/accept`, 'mutateAppeal'],
    ['/appeals', 'createAppeal'],
  ] as const)(
    'routes %s to its registered moderation operation',
    async (path, method) => {
      const error = new AdminModerationNotFoundError();
      const operation = jest
        .spyOn(module.get(PrismaAdminModerationRepository), method)
        .mockRejectedValue(error);
      const body =
        method === 'createAppeal'
          ? {
              targetActionId: actionId,
              externalReference: 'ticket-1',
              reasonCode: 'SPAM',
              idempotencyKey: 'fixture-action-1',
            }
          : method === 'mutateAppeal'
            ? {
                confirm: true,
                expectedModerationVersion: 1,
                idempotencyKey: 'fixture-action-1',
              }
            : mutation;
      expectError(await post(path, body).expect(404), 404, 'NOT_FOUND');
      expect(operation).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', request: body }),
      );
    },
  );
});
