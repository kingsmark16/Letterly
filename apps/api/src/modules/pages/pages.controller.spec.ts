import type { CreatePageRequest } from '@letterly/contracts/pages';
import type { SavePageRequest } from '@letterly/contracts/pages';
import { ApiException } from '../../infrastructure/http/api-exception';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import {
  PageService,
  PageNotFoundError,
  StalePageVersionError,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './application/page.service';
import { PagesController } from './pages.controller';
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
  let pageService: jest.Mocked<
    Pick<
      PageService,
      | 'createDraft'
      | 'getOwnedPage'
      | 'updateDraft'
      | 'listDrafts'
      | 'deleteDraft'
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
      recipientLabel: 'Untitled letter',
      status: 'DRAFT',
      contentVersion: 0,
      content: ownerPage.content,
      settings: ownerPage.settings,
      template: ownerPage.template,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
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
});
