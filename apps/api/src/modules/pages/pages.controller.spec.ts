import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { CreatePageRequest } from '@letterly/contracts/pages';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import {
  PageService,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './application/page.service';
import { PagesController } from './pages.controller';
import type { OwnerPage } from './domain/page.types';

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
  let pageService: jest.Mocked<Pick<PageService, 'createDraft'>>;
  let controller: PagesController;

  beforeEach(() => {
    pageService = {
      createDraft: jest.fn(),
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
      NotFoundException,
    );
  });

  it('AC-10 maps a missing trusted template definition to a safe 503 response', async () => {
    pageService.createDraft.mockRejectedValue(
      new TemplateDefinitionUnavailableError(),
    );

    await expect(controller.create(request, body)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
