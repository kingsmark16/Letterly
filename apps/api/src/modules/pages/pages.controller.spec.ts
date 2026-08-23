import type { CreatePageRequest } from '@letterly/contracts/pages';
import type { SavePageRequest } from '@letterly/contracts/pages';
import { createHmac } from 'node:crypto';
import { SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import { ApiException } from '../../infrastructure/http/api-exception';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import {
  PageService,
  InvalidPageStateError,
  PageNotFoundError,
  StalePageVersionError,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './application/page.service';
import { PagesController, PublicPagesController } from './pages.controller';
import { RateLimitService } from '../../infrastructure/http/rate-limit.service';
import type { DraftSummary, OwnerPage } from './domain/page.types';

jest.mock('../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));

const creatorId = 'creator-123';
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

const request = {
  authSession: {
    user: {
      id: creatorId,
    },
  },
} as unknown as AuthenticatedRequest;

const body: CreatePageRequest = {
  templateVersionId,
};

const ownerPage: OwnerPage = {
  id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
  creatorId,
  slug: 'letter42',
  displaySlug: 'letter42',
  status: 'DRAFT',
  contentVersion: 0,
  content: {
    recipientName: '',
    mainMessage: '',
    sections: [],
  },
  settings: {
    theme: 'romantic',
    fontStyle: 'handwritten',
    autoPlayMusic: false,
    music: null,
  },
  template: {
    id: '0cf6b27e-7d7d-40e8-bc18-ef1cdff1cb16',
    key: 'secret-letter',
    name: 'Secret Letter',
    templateVersionId,
    version: 1,
    registryKey: 'confession.secret-letter',
  },
  createdAt: new Date('2026-08-09T00:00:00.000Z'),
  updatedAt: new Date('2026-08-09T00:00:00.000Z'),
};

describe('PagesController', () => {
  it('declares the optional rate limit service for Nest runtime injection', () => {
    const pageControllerDependencies: unknown = Reflect.getMetadata(
      SELF_DECLARED_DEPS_METADATA,
      PagesController,
    );
    const publicControllerDependencies: unknown = Reflect.getMetadata(
      SELF_DECLARED_DEPS_METADATA,
      PublicPagesController,
    );

    expect(pageControllerDependencies).toEqual(
      expect.arrayContaining([{ index: 2, param: RateLimitService }]),
    );
    expect(publicControllerDependencies).toEqual(
      expect.arrayContaining([{ index: 1, param: RateLimitService }]),
    );
  });

  let pageService: jest.Mocked<
    Pick<
      PageService,
      | 'createDraft'
      | 'getOwnedPage'
      | 'updateDraft'
      | 'listDrafts'
      | 'deleteDraft'
      | 'publishPage'
      | 'unpublishPage'
      | 'archivePage'
      | 'restorePage'
      | 'changePublishedSlug'
      | 'getPublicPage'
    >
  >;
  let controller: PagesController;

  beforeEach(() => {
    pageService = {
      createDraft: jest.fn(),
      getOwnedPage: jest.fn(),
      updateDraft: jest.fn(),
      listDrafts: jest.fn(),
      deleteDraft: jest.fn(),
      publishPage: jest.fn(),
      unpublishPage: jest.fn(),
      archivePage: jest.fn(),
      restorePage: jest.fn(),
      changePublishedSlug: jest.fn(),
      getPublicPage: jest.fn(),
    };

    controller = new PagesController(pageService as unknown as PageService);
  });

  it('AC-1 creates a draft for the authenticated creator and returns a safe projection', async () => {
    pageService.createDraft.mockResolvedValue(ownerPage);

    const response = await controller.create(request, body);

    expect(pageService.createDraft.mock.calls).toEqual([
      [
        {
          creatorId,
          templateVersionId,
        },
      ],
    ]);

    expect(response).toEqual({
      id: ownerPage.id,
      slug: ownerPage.slug,
      canonicalUrl: null,
      recipientLabel: 'Untitled letter',
      status: 'DRAFT',
      contentVersion: 0,
      content: ownerPage.content,
      settings: ownerPage.settings,
      template: ownerPage.template,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
      images: [],
    });

    expect(response).not.toHaveProperty('creatorId');
    expect(response).not.toHaveProperty('displaySlug');
  });

  it('AC-10 maps an unavailable template to a safe 404 response', async () => {
    pageService.createDraft.mockRejectedValue(new TemplateUnavailableError());

    await expect(controller.create(request, body)).rejects.toBeInstanceOf(
      ApiException,
    );
  });

  it('AC-10 maps a missing trusted template definition to a safe 503 response', async () => {
    pageService.createDraft.mockRejectedValue(
      new TemplateDefinitionUnavailableError(),
    );

    await expect(controller.create(request, body)).rejects.toBeInstanceOf(
      ApiException,
    );
  });

  it('AC-3 saves the authenticated creator draft and returns its projection', async () => {
    const pageId = ownerPage.id;
    const body: SavePageRequest = {
      recipientName: 'Juliet',
      mainMessage: 'A saved private letter.',
      expectedContentVersion: 0,
    };
    const savedPage = {
      ...ownerPage,
      contentVersion: 1,
      content: {
        ...ownerPage.content,
        recipientName: body.recipientName,
        mainMessage: body.mainMessage,
      },
    };
    pageService.updateDraft.mockResolvedValue(savedPage);

    const response = await controller.update(request, { pageId }, body);

    expect(pageService.updateDraft.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId,
          ...body,
        },
      ],
    ]);
    expect(response).toMatchObject({
      id: pageId,
      contentVersion: 1,
      content: savedPage.content,
    });
    expect(response).not.toHaveProperty('creatorId');
  });

  it('AC-4 maps a stale save to safe version metadata', async () => {
    const currentUpdatedAt = new Date('2026-08-09T03:00:00.000Z');
    pageService.updateDraft.mockRejectedValue(
      new StalePageVersionError(3, currentUpdatedAt),
    );

    let error: unknown;

    try {
      await controller.update(
        request,
        { pageId: ownerPage.id },
        {
          recipientName: 'Juliet',
          mainMessage: 'An older browser attempt.',
          expectedContentVersion: 2,
        },
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);

    if (error instanceof ApiException) {
      expect(error.toApiError()).toEqual({
        statusCode: 409,
        code: 'STALE_VERSION',
        message: 'This draft changed elsewhere',
        details: {
          currentContentVersion: 3,
          currentUpdatedAt: '2026-08-09T03:00:00.000Z',
        },
      });
    }
  });

  it('AC-8 maps a missing or non owned save to the same safe 404', async () => {
    pageService.updateDraft.mockRejectedValue(new PageNotFoundError());

    await expect(
      controller.update(
        request,
        { pageId: ownerPage.id },
        {
          recipientName: '',
          mainMessage: '',
          expectedContentVersion: 0,
        },
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('AC-6 returns the saved owner projection for an authenticated read', async () => {
    pageService.getOwnedPage.mockResolvedValue(ownerPage);

    const response = await controller.get(request, { pageId: ownerPage.id });

    expect(pageService.getOwnedPage.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: ownerPage.id,
        },
      ],
    ]);
    expect(response.id).toBe(ownerPage.id);
    expect(response.content).toEqual(ownerPage.content);
    expect(response).not.toHaveProperty('creatorId');
  });

  it('AC-5 returns a safe paginated draft summary response', async () => {
    const draft: DraftSummary = {
      id: ownerPage.id,
      recipientLabel: 'Juliet',
      status: 'DRAFT',
      contentVersion: 2,
      template: ownerPage.template,
      createdAt: ownerPage.createdAt,
      updatedAt: ownerPage.updatedAt,
    };
    pageService.listDrafts.mockResolvedValue({
      items: [draft],
      nextCursor: {
        id: ownerPage.id,
        updatedAt: ownerPage.updatedAt,
      },
    });

    const response = await controller.list(request, {
      status: 'DRAFT',
      size: 20,
    });

    expect(pageService.listDrafts).toHaveBeenCalledWith({
      creatorId,
      size: 20,
      cursor: null,
    });
    expect(response.items).toEqual([
      {
        id: ownerPage.id,
        recipientLabel: 'Juliet',
        status: 'DRAFT',
        contentVersion: 2,
        template: ownerPage.template,
        createdAt: '2026-08-09T00:00:00.000Z',
        updatedAt: '2026-08-09T00:00:00.000Z',
      },
    ]);
    expect(response.nextCursor).toEqual(expect.any(String));
    expect(response.items[0]).not.toHaveProperty('mainMessage');
  });

  it('AC-5 rejects a malformed cursor with a safe validation error', async () => {
    let error: unknown;

    try {
      await controller.list(request, {
        status: 'DRAFT',
        size: 20,
        cursor: 'not-a-cursor',
      });
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 422,
      code: 'INVALID_CURSOR',
    });

    expect(pageService.listDrafts).not.toHaveBeenCalled();
  });

  it('AC-7 deletes an owned draft and returns no content', async () => {
    pageService.deleteDraft.mockResolvedValue(undefined);

    await expect(
      controller.remove(request, { pageId: ownerPage.id }),
    ).resolves.toBeUndefined();

    expect(pageService.deleteDraft).toHaveBeenCalledWith({
      creatorId,
      pageId: ownerPage.id,
    });
  });

  it('AC-7 maps an absent deletion to a safe page not found error', async () => {
    pageService.deleteDraft.mockRejectedValue(new PageNotFoundError());

    await expect(
      controller.remove(request, { pageId: ownerPage.id }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('AC-8 maps a missing owner read to a safe page not found error', async () => {
    pageService.getOwnedPage.mockRejectedValue(new PageNotFoundError());

    await expect(
      controller.get(request, { pageId: ownerPage.id }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('AC-1 publishes an owned page and returns its canonical public URL', async () => {
    pageService.publishPage.mockResolvedValue({
      page: {
        ...ownerPage,
        status: 'PUBLISHED',
        slug: 'my-letter',
        displaySlug: 'my-letter',
      },
      publishedAt: new Date('2026-08-09T04:00:00.000Z'),
      unpublishedAt: null,
    });

    const response = await controller.publish(
      request,
      { pageId: ownerPage.id },
      { customSlug: 'My-Letter', confirmReady: true },
    );

    expect(pageService.publishPage).toHaveBeenCalledWith({
      creatorId,
      pageId: ownerPage.id,
      customSlug: 'My-Letter',
      confirmReady: true,
    });
    expect(response).toMatchObject({
      pageId: ownerPage.id,
      status: 'PUBLISHED',
      slug: 'my-letter',
      publicUrl: 'http://localhost:3000/p/my-letter',
    });
  });

  it('AC-4 maps an invalid lifecycle transition to a safe conflict', async () => {
    pageService.unpublishPage.mockRejectedValue(new InvalidPageStateError());

    let error: unknown;

    try {
      await controller.unpublish(
        request,
        { pageId: ownerPage.id },
        { confirm: true },
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    if (error instanceof ApiException) {
      expect(error.toApiError()).toMatchObject({
        code: 'INVALID_STATE',
      });
    }
  });

  it('AC-8 maps a published slug change to a safe conflict', async () => {
    pageService.changePublishedSlug.mockRejectedValue(
      new InvalidPageStateError(),
    );

    let error: unknown;

    try {
      await controller.changeSlug(
        request,
        { pageId: ownerPage.id },
        { customSlug: 'new-slug' },
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    if (error instanceof ApiException) {
      expect(error.toApiError()).toMatchObject({
        statusCode: 409,
        code: 'INVALID_STATE',
      });
    }
  });

  it('AC-5 archives and restores through authenticated owner routes', async () => {
    pageService.archivePage.mockResolvedValue({
      page: { ...ownerPage, status: 'ARCHIVED' },
      publishedAt: null,
      unpublishedAt: null,
    });
    pageService.restorePage.mockResolvedValue({
      page: { ...ownerPage, status: 'DRAFT' },
      publishedAt: null,
      unpublishedAt: null,
    });

    await expect(
      controller.archive(request, { pageId: ownerPage.id }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' });
    await expect(
      controller.restore(request, { pageId: ownerPage.id }),
    ).resolves.toMatchObject({ status: 'DRAFT' });

    expect(pageService.archivePage).toHaveBeenCalledWith({
      creatorId,
      pageId: ownerPage.id,
    });
    expect(pageService.restorePage).toHaveBeenCalledWith({
      creatorId,
      pageId: ownerPage.id,
    });
  });

  it('AC-6 returns the exact safe anonymous projection', async () => {
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    const publicController = new PublicPagesController(
      pageService as unknown as PageService,
    );
    const response = await publicController.get(
      { slug: 'my-letter' },
      { ip: '127.0.0.1', headers: {} } as never,
      { setHeader: jest.fn() } as never,
    );

    expect(response).toEqual({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });
    expect(response).not.toHaveProperty('creatorId');
  });

  it('AC-14 rate limits a signed visitor identity instead of the API server IP', async () => {
    const secret = 'a-secure-test-secret-that-is-long-enough';
    const payload = createVisitorIdentityPayload(
      '203.0.113.24',
      Math.floor(Date.now() / 1000),
    );
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    const consumePublic = jest.fn();
    const rateLimitService = {
      consumePublic,
    } as unknown as RateLimitService;
    const publicController = new PublicPagesController(
      pageService as unknown as PageService,
      rateLimitService,
      secret,
    );

    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    await publicController.get(
      {
        slug: 'my-letter',
      },
      {
        ip: '127.0.0.1',
        headers: {
          [visitorIdentityHeader]: `${payload}.${signature}`,
        },
      } as never,
      { setHeader: jest.fn() } as never,
    );

    expect(consumePublic).toHaveBeenCalledWith('203.0.113.24');
  });

  it('records public journey metrics only for a published Choose Your Heart page', async () => {
    const metrics = { record: jest.fn() };
    const publicController = new PublicPagesController(
      pageService as unknown as PageService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      metrics,
    );
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'journey-page',
      canonicalUrl: 'http://localhost:3000/p/journey-page',
      template: { key: 'choose-your-heart', version: 1 },
      publishedGraphVersion: 1,
      rootQuestionKey: 'root',
      maxDepth: 1,
      questions: [],
      outcomes: [],
      images: [],
    } as never);

    await publicController.recordJourneyMetric(
      { slug: 'journey-page' },
      { ip: '127.0.0.1', headers: {} } as never,
      { event: 'journey_start', templateKey: 'choose-your-heart' },
    );

    expect(metrics.record).toHaveBeenCalledWith({
      event: 'journey_start',
      templateKey: 'choose-your-heart',
    });
  });

  it('rejects journey metrics for a different published template', async () => {
    const metrics = { record: jest.fn() };
    const publicController = new PublicPagesController(
      pageService as unknown as PageService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      metrics,
    );
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'secret-page',
      canonicalUrl: 'http://localhost:3000/p/secret-page',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    const promise = publicController.recordJourneyMetric(
      { slug: 'secret-page' },
      { ip: '127.0.0.1', headers: {} } as never,
      { event: 'journey_start', templateKey: 'choose-your-heart' },
    );

    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'UNSUPPORTED_CAPABILITY',
        statusCode: 422,
      }) as jest.AsymmetricMatcher,
    });
    expect(metrics.record).not.toHaveBeenCalled();
  });
});
