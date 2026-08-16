import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { PRISMA_CLIENT } from '../src/infrastructure/database/prisma.provider';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import {
  RATE_LIMIT_STORE,
  RateLimitService,
} from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import { PageService } from '../src/modules/pages/application/page.service';
import { PagePasswordService } from '../src/modules/pages/application/page-password.service';
import {
  PageSubmissionsService,
  SubmissionPageNotFoundError,
} from '../src/modules/pages/application/page-submissions.service';
import { PAGES_REPOSITORY } from '../src/modules/pages/application/pages.repository';
import { TEMPLATE_VERSION_READER } from '../src/modules/pages/application/template-version.reader';
import type { AuthenticatedRequest } from '../src/modules/auth/better-auth-session.guard';
import { BetterAuthSessionGuard } from '../src/modules/auth/better-auth-session.guard';
import { PagesModule } from '../src/modules/pages/pages.module';
import { PrismaPageMediaRepository } from '../src/modules/pages/infrastructure/prisma-page-media.repository';
import { PrismaPageSubmissionsRepository } from '../src/modules/pages/infrastructure/prisma-page-submissions.repository';
import { PrismaPagesRepository } from '../src/modules/pages/infrastructure/prisma-pages.repository';
import { PrismaTemplateVersionReader } from '../src/modules/pages/infrastructure/prisma-template-version.reader';

const pageId = '11111111-1111-4111-8111-111111111111';

type SubmittedInput = {
  slug: string;
  browserTokenHash: string;
  idempotencyKey: string;
  visitorMessage?: { message: string };
  observedPasswordVersion?: string | null;
};

class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.authSession = {
      user: { id: 'creator-123' },
    } as AuthenticatedRequest['authSession'];
    return true;
  }
}

describe('Public visitor submissions HTTP boundary (e2e)', () => {
  let app: INestApplication<App>;
  const submissionsService = {
    findPublicPageScope: jest.fn<(slug: string) => Promise<string | null>>(),
    submit: jest.fn<(input: SubmittedInput) => Promise<{ accepted: true }>>(),
  };
  const passwordService = {
    findPublicProtection:
      jest.fn<
        (
          slug: string,
        ) => Promise<{ pageId: string; passwordVersion: string } | null>
      >(),
    verifyRequestCookie:
      jest.fn<
        (
          pageId: string,
          passwordVersion: string,
          cookieHeader: string | undefined,
        ) => Promise<boolean>
      >(),
  };
  const rateLimitService = {
    consumeVisitorSubmission:
      jest.fn<(pageId: string, browserTokenHash: string) => Promise<void>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    submissionsService.findPublicPageScope.mockResolvedValue(pageId);
    submissionsService.submit.mockResolvedValue({ accepted: true });
    passwordService.findPublicProtection.mockResolvedValue(null);
    passwordService.verifyRequestCookie.mockResolvedValue(true);
    rateLimitService.consumeVisitorSubmission.mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PagesModule],
    })
      .overrideProvider(PageService)
      .useValue({})
      .overrideProvider(PageSubmissionsService)
      .useValue(submissionsService)
      .overrideProvider(PagePasswordService)
      .useValue(passwordService)
      .overrideProvider(RateLimitService)
      .useValue(rateLimitService)
      .overrideProvider(RATE_LIMIT_STORE)
      .useValue({ consume: jest.fn() })
      .overrideProvider(VISITOR_IDENTITY_SECRET)
      .useValue('test-secret-test-secret-test-secret')
      .overrideProvider(PRISMA_CLIENT)
      .useValue({})
      .overrideProvider(PAGES_REPOSITORY)
      .useValue({})
      .overrideProvider(TEMPLATE_VERSION_READER)
      .useValue({})
      .overrideProvider(PrismaPagesRepository)
      .useValue({})
      .overrideProvider(PrismaPageMediaRepository)
      .useValue({})
      .overrideProvider(PrismaPageSubmissionsRepository)
      .useValue({})
      .overrideProvider(PrismaTemplateVersionReader)
      .useValue({})
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(TestSessionGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('AC-2 and AC-4 accepts a browser submission through the real HTTP boundary', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/Letter42/submissions')
      .set('Cookie', 'letterly_browser=browser-token')
      .send({
        answers: [],
        visitorMessage: 'A private message',
        idempotencyKey: 'request-1',
      })
      .expect(201);

    expect(response.body).toEqual({ accepted: true });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(submissionsService.findPublicPageScope).toHaveBeenCalledWith(
      'letter42',
    );
    expect(rateLimitService.consumeVisitorSubmission).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    const submittedCalls = submissionsService.submit.mock
      .calls as unknown as Array<
      [
        SubmittedInput & {
          answers: unknown[];
          observedPasswordVersion?: string | null;
        },
      ]
    >;
    const submittedInput = submittedCalls[0]?.[0];
    expect(submittedInput?.slug).toBe('letter42');
    expect(submittedInput?.browserTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(submittedInput?.idempotencyKey).toBe('request-1');
    expect(submittedInput?.answers).toEqual([]);
    expect(submittedInput?.visitorMessage).toEqual({
      message: 'A private message',
    });
    expect(submittedInput?.observedPasswordVersion).toBeNull();
  });

  it('AC-4 rejects a submission without a browser identity and never calls the service', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/submissions')
      .send({
        answers: [],
        visitorMessage: 'A private message',
        idempotencyKey: 'request-1',
      })
      .expect(422);

    expect(response.body).toMatchObject({
      statusCode: 422,
      code: 'COOKIE_REQUIRED',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(submissionsService.findPublicPageScope).not.toHaveBeenCalled();
    expect(submissionsService.submit).not.toHaveBeenCalled();
  });

  it('AC-7 rejects a locked page before rate limiting or persisting a response', async () => {
    passwordService.findPublicProtection.mockResolvedValue({
      pageId,
      passwordVersion: '1',
    });
    passwordService.verifyRequestCookie.mockResolvedValue(false);

    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/submissions')
      .set('Cookie', 'letterly_browser=browser-token')
      .send({
        answers: [],
        visitorMessage: 'A private message',
        idempotencyKey: 'request-1',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      code: 'PAGE_LOCKED',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(rateLimitService.consumeVisitorSubmission).not.toHaveBeenCalled();
    expect(submissionsService.submit).not.toHaveBeenCalled();
  });

  it('AC-12 returns unavailable before checking a disabled page password', async () => {
    submissionsService.findPublicPageScope.mockRejectedValueOnce(
      new SubmissionPageNotFoundError(),
    );
    passwordService.findPublicProtection.mockResolvedValue({
      pageId,
      passwordVersion: '1',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/submissions')
      .set('Cookie', 'letterly_browser=browser-token')
      .send({
        answers: [],
        visitorMessage: 'A private message',
        idempotencyKey: 'request-disabled',
      })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'PAGE_NOT_FOUND',
    });
    expect(passwordService.findPublicProtection).not.toHaveBeenCalled();
    expect(passwordService.verifyRequestCookie).not.toHaveBeenCalled();
    expect(submissionsService.submit).not.toHaveBeenCalled();
  });

  it('AC-4 rejects invalid submission input with a safe no-store error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/submissions')
      .set('Cookie', 'letterly_browser=browser-token')
      .send({ answers: [], idempotencyKey: '' })
      .expect(422);

    expect(response.body).toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_FAILED',
      message: 'Invalid request',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(submissionsService.findPublicPageScope).not.toHaveBeenCalled();
  });
});
