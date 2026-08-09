import type { PagesRepository } from './pages.repository';
import {
  PageService,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './page.service';
import type { TemplateVersionReader } from './template-version.reader';
import type { OwnerPage } from '../domain/page.types';

const creatorId = 'creator-123';
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

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

describe('PageService', () => {
  let pagesRepository: jest.Mocked<PagesRepository>;
  let templateVersionReader: jest.Mocked<TemplateVersionReader>;
  let service: PageService;

  beforeEach(() => {
    pagesRepository = {
      createDraft: jest.fn(),
      listDrafts: jest.fn(),
      findOwnedPage: jest.fn(),
      updateDraft: jest.fn(),
      deleteOwnedPage: jest.fn(),
    };

    templateVersionReader = {
      findActiveById: jest.fn(),
    };

    service = new PageService(pagesRepository, templateVersionReader);
  });

  it('AC-1 creates a draft with trusted Secret Letter defaults', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.secret-letter',
    });
    pagesRepository.createDraft.mockResolvedValue(ownerPage);

    await expect(
      service.createDraft({
        creatorId,
        templateVersionId,
      }),
    ).resolves.toEqual(ownerPage);

    expect(pagesRepository.createDraft.mock.calls).toEqual([
      [
        {
          creatorId,
          templateVersionId,
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
        },
      ],
    ]);
  });

  it('AC-1 applies optional recipient and message values to the defaults', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.secret-letter',
    });
    pagesRepository.createDraft.mockResolvedValue(ownerPage);

    await service.createDraft({
      creatorId,
      templateVersionId,
      recipientName: 'Juliet',
      mainMessage: 'You make ordinary days feel like poetry.',
    });

    expect(pagesRepository.createDraft.mock.calls).toEqual([
      [
        {
          creatorId,
          templateVersionId,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'You make ordinary days feel like poetry.',
            sections: [],
          },
          settings: {
            theme: 'romantic',
            fontStyle: 'handwritten',
            autoPlayMusic: false,
            music: null,
          },
        },
      ],
    ]);
  });

  it('AC-10 rejects an inactive or missing template before creating a page', async () => {
    templateVersionReader.findActiveById.mockResolvedValue(null);

    await expect(
      service.createDraft({
        creatorId,
        templateVersionId,
      }),
    ).rejects.toBeInstanceOf(TemplateUnavailableError);

    expect(pagesRepository.createDraft.mock.calls).toHaveLength(0);
  });

  it('AC-10 rejects a database template version without a trusted definition', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 999,
      registryKey: 'confession.secret-letter',
    });

    await expect(
      service.createDraft({
        creatorId,
        templateVersionId,
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);

    expect(pagesRepository.createDraft.mock.calls).toHaveLength(0);
  });
});
