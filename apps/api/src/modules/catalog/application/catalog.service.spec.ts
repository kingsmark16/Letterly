import { requiredTestValue } from '../../../../test/support/required-test-value';
import { ZodError } from 'zod';
import {
  CatalogCategoryNotFoundError,
  CatalogService,
  CatalogTemplateNotFoundError,
  CatalogUnavailableError,
} from './catalog.service';
import type {
  CatalogRepository,
  CatalogTemplateLookupRecord,
  CatalogTemplateRecord,
} from './catalog.repository';
import {
  InvalidCatalogCursorError,
  type CatalogCursor,
} from './catalog-cursor';

const template: CatalogTemplateRecord = {
  id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
  key: 'secret-letter',
  name: 'Secret Letter',
  description: null,
  displayOrder: 1,
  category: { key: 'confession' },
  versions: [
    {
      id: 'b7e4b986-2b45-40bb-a13b-51357ac4816e',
      version: 1,
      registryKey: 'confession.secret-letter',
    },
  ],
};

describe('CatalogService', () => {
  let repository: {
    [Key in keyof CatalogRepository]: jest.Mock<
      ReturnType<CatalogRepository[Key]>,
      Parameters<CatalogRepository[Key]>
    >;
  };
  let cursor: {
    [Key in keyof CatalogCursor]: jest.Mock<
      ReturnType<CatalogCursor[Key]>,
      Parameters<CatalogCursor[Key]>
    >;
  };
  let service: CatalogService;

  beforeEach(() => {
    repository = {
      listCategories: jest.fn<
        ReturnType<CatalogRepository['listCategories']>,
        Parameters<CatalogRepository['listCategories']>
      >(),
      listOverview: jest.fn<
        ReturnType<CatalogRepository['listOverview']>,
        Parameters<CatalogRepository['listOverview']>
      >(),
      findCategory: jest.fn<
        ReturnType<CatalogRepository['findCategory']>,
        Parameters<CatalogRepository['findCategory']>
      >(),
      listTemplates: jest.fn<
        ReturnType<CatalogRepository['listTemplates']>,
        Parameters<CatalogRepository['listTemplates']>
      >(),
      listTemplatePage: jest.fn<
        ReturnType<CatalogRepository['listTemplatePage']>,
        Parameters<CatalogRepository['listTemplatePage']>
      >(),
      findTemplateLookup: jest.fn<
        ReturnType<CatalogRepository['findTemplateLookup']>,
        Parameters<CatalogRepository['findTemplateLookup']>
      >(),
    };
    cursor = {
      filterFingerprint: jest.fn<
        ReturnType<CatalogCursor['filterFingerprint']>,
        Parameters<CatalogCursor['filterFingerprint']>
      >(() => 'fingerprint'),
      encode: jest.fn<
        ReturnType<CatalogCursor['encode']>,
        Parameters<CatalogCursor['encode']>
      >(() => 'encoded-cursor'),
      decode: jest.fn<
        ReturnType<CatalogCursor['decode']>,
        Parameters<CatalogCursor['decode']>
      >(() => ({ displayOrder: 1, id: template.id })),
    };
    service = new CatalogService(repository, cursor);
  });

  it.each([true, false])(
    'passes the category active filter %s through and validates nullable descriptions',
    async (activeOnly) => {
      const categories = [
        {
          key: 'confession',
          name: 'Confession',
          description: null,
          displayOrder: 1,
        },
      ];
      repository.listCategories.mockResolvedValue(categories);
      await expect(service.listCategories(activeOnly)).resolves.toEqual(
        categories,
      );
      expect(repository.listCategories).toHaveBeenCalledWith(activeOnly);
    },
  );

  it('AC-2 and AC-6 returns grouped previews with one trusted current version per active family', async () => {
    repository.listOverview.mockResolvedValue([
      {
        key: 'confession',
        name: 'Confession',
        description: null,
        displayOrder: 1,
        templates: [
          {
            id: template.id,
            key: template.key,
            name: template.name,
            description: template.description,
            displayOrder: template.displayOrder,
            category: template.category,
            currentVersion: requiredTestValue(
              template.versions[0],
              'Expected fixture value: template.versions[0]',
            ),
          },
        ],
      },
    ]);

    const result = await service.listOverview();

    expect(repository.listOverview).toHaveBeenCalledWith(4);
    expect(result.categories[0]?.templates[0]?.currentVersion).toMatchObject({
      version: 1,
      audioCapability: 'optional',
    });
    expect(result.categories[0]?.templates[0]).not.toHaveProperty(
      'registryKey',
    );
  });

  it('AC-2 fails the overview closed when a selected version has no trusted registry entry', async () => {
    repository.listOverview.mockResolvedValue([
      {
        key: 'confession',
        name: 'Confession',
        description: null,
        displayOrder: 1,
        templates: [
          {
            id: template.id,
            key: template.key,
            name: template.name,
            description: template.description,
            displayOrder: template.displayOrder,
            category: template.category,
            currentVersion: {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              version: 2,
              registryKey: 'confession.secret-letter.v2-missing',
            },
          },
        ],
      },
    ]);
    await expect(service.listOverview()).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
  });

  it('AC-1 rejects an overview with more than four previews for one category', async () => {
    const trustedVersion = requiredTestValue(
      template.versions[0],
      'Expected fixture value: template.versions[0]',
    );
    repository.listOverview.mockResolvedValue([
      {
        key: 'confession',
        name: 'Confession',
        description: null,
        displayOrder: 1,
        templates: Array.from({ length: 5 }, (_, index) => ({
          id: `90000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          key: `synthetic-${index + 1}`,
          name: `Synthetic ${index + 1}`,
          description: null,
          displayOrder: index + 1,
          category: { key: 'confession' },
          currentVersion: trustedVersion,
        })),
      },
    ]);

    await expect(service.listOverview()).rejects.toBeInstanceOf(ZodError);
  });

  it.each([undefined, ''])(
    'lists the global catalog for category filter %s without a lookup',
    async (key) => {
      repository.listTemplates.mockResolvedValue([template]);
      const result = await service.listTemplates(key);
      expect(repository.findCategory).not.toHaveBeenCalled();
      expect(repository.listTemplates).toHaveBeenCalledWith(undefined);
      expect(result[0]?.versions[0]).toEqual({
        id: requiredTestValue(
          template.versions[0],
          'Expected fixture value: template.versions[0]',
        ).id,
        version: 1,
        capabilities: [
          'images',
          'audio',
          'questions',
          'visitorMessage',
          'passwordProtection',
        ],
        audioCapability: 'optional',
      });
      expect(result[0]?.description).toBeNull();
      expect(result[0]?.versions[0]).not.toHaveProperty('registryKey');
    },
  );

  it('resolves an active category before requesting its templates', async () => {
    repository.findCategory.mockResolvedValue({
      id: 'category-id',
      status: 'ACTIVE',
    });
    repository.listTemplates.mockResolvedValue([]);
    await expect(service.listTemplates('confession')).resolves.toEqual([]);
    expect(repository.findCategory).toHaveBeenCalledWith('confession');
    expect(repository.listTemplates).toHaveBeenCalledWith('category-id');
  });

  it.each([null, { id: 'category-id', status: 'INACTIVE' as const }])(
    'rejects unavailable requested categories before reading templates: %p',
    async (category) => {
      repository.findCategory.mockResolvedValue(category);
      await expect(service.listTemplates('confession')).rejects.toBeInstanceOf(
        CatalogCategoryNotFoundError,
      );
      expect(repository.listTemplates).not.toHaveBeenCalled();
    },
  );

  it.each([
    { registryKey: 'confession.missing', version: 1 },
    { registryKey: 'confession.secret-letter', version: 2 },
  ])('requires an exact trusted registry version: %p', async (identity) => {
    repository.listTemplates.mockResolvedValue([
      {
        ...template,
        versions: [
          {
            ...requiredTestValue(
              template.versions[0],
              'Expected fixture value: template.versions[0]',
            ),
            ...identity,
          },
        ],
      },
    ]);
    await expect(service.listTemplates()).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
  });

  it('rejects malformed category and template records at the response boundary', async () => {
    repository.listCategories.mockResolvedValue([
      { key: '', name: '', description: null, displayOrder: 1 },
    ]);
    repository.listTemplates.mockResolvedValue([
      { ...template, id: 'invalid-id' },
    ]);
    await expect(service.listCategories(true)).rejects.toBeInstanceOf(ZodError);
    await expect(service.listTemplates()).rejects.toBeInstanceOf(ZodError);
  });

  it('AC-3 and AC-6 returns one trusted current version in a bounded category page', async () => {
    repository.findCategory.mockResolvedValue({
      id: 'category-id',
      status: 'ACTIVE',
    });
    repository.listTemplatePage.mockResolvedValue([
      {
        id: template.id,
        key: template.key,
        name: template.name,
        description: template.description,
        displayOrder: template.displayOrder,
        category: template.category,
        currentVersion: requiredTestValue(
          template.versions[0],
          'Expected fixture value: template.versions[0]',
        ),
      },
    ]);

    const result = await service.listTemplatePage({
      categoryKey: 'confession',
      q: 'love',
      size: 20,
      direction: 'after',
    });

    expect(repository.listTemplatePage).toHaveBeenCalledWith({
      categoryId: 'category-id',
      query: 'love',
      size: 20,
      direction: 'after',
    });
    expect(result.items[0]?.currentVersion).toEqual({
      id: template.versions[0]?.id,
      version: 1,
      capabilities: [
        'images',
        'audio',
        'questions',
        'visitorMessage',
        'passwordProtection',
      ],
      audioCapability: 'optional',
    });
    expect(result.items[0]).not.toHaveProperty('registryKey');
    expect(result.nextCursor).toBeNull();
    expect(result.previousCursor).toBeNull();
  });

  it('AC-4 rejects malformed and filter-mismatched cursors before querying the page', async () => {
    cursor.decode.mockImplementation(() => {
      throw new InvalidCatalogCursorError();
    });
    await expect(
      service.listTemplatePage({
        size: 20,
        direction: 'after',
        cursor: 'not-a-valid-cursor',
      }),
    ).rejects.toThrow();
    await expect(
      service.listTemplatePage({
        q: 'changed',
        size: 20,
        direction: 'after',
        cursor: 'encoded-cursor',
      }),
    ).rejects.toThrow();
    expect(repository.listTemplatePage).not.toHaveBeenCalled();
  });

  it('AC-5 looks up one active requested version and returns only trusted capabilities', async () => {
    repository.findTemplateLookup.mockResolvedValue([
      {
        id: template.id,
        key: template.key,
        name: template.name,
        description: template.description,
        displayOrder: template.displayOrder,
        category: template.category,
        selectedVersion: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          version: 1,
          registryKey: 'confession.secret-letter',
        },
      },
    ]);

    const result = await service.lookupTemplate({
      templateKey: 'secret-letter',
      categoryKey: 'confession',
      version: 1,
    });

    expect(repository.findTemplateLookup).toHaveBeenCalledWith({
      key: 'secret-letter',
      categoryKey: 'confession',
      version: 1,
    });
    expect(result.selectedVersion).toMatchObject({ version: 1 });
    expect(result.selectedVersion.capabilities).toContain('images');
    expect(result).not.toHaveProperty('registryKey');
  });

  it.each([
    { name: 'no family', matches: [] as CatalogTemplateLookupRecord[] },
    {
      name: 'family without active version',
      matches: [
        {
          id: template.id,
          key: template.key,
          name: template.name,
          description: template.description,
          displayOrder: template.displayOrder,
          category: template.category,
          selectedVersion: null,
        },
      ],
    },
    {
      name: 'ambiguous bare key',
      matches: [
        {
          id: template.id,
          key: template.key,
          name: template.name,
          description: template.description,
          displayOrder: template.displayOrder,
          category: template.category,
          selectedVersion: requiredTestValue(
            template.versions[0],
            'Expected fixture value: template.versions[0]',
          ),
        },
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          key: template.key,
          name: template.name,
          description: template.description,
          displayOrder: template.displayOrder,
          category: { key: 'another-category' },
          selectedVersion: requiredTestValue(
            template.versions[0],
            'Expected fixture value: template.versions[0]',
          ),
        },
      ],
    },
  ])('AC-5 fails closed for $name', async ({ matches }) => {
    repository.findTemplateLookup.mockResolvedValue(matches);
    await expect(
      service.lookupTemplate({ templateKey: 'secret-letter' }),
    ).rejects.toBeInstanceOf(CatalogTemplateNotFoundError);
  });

  it('AC-5 treats an active version missing its trusted registry entry as unavailable', async () => {
    repository.findTemplateLookup.mockResolvedValue([
      {
        id: template.id,
        key: template.key,
        name: template.name,
        description: template.description,
        displayOrder: template.displayOrder,
        category: template.category,
        selectedVersion: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          version: 2,
          registryKey: 'confession.secret-letter.v2-missing',
        },
      },
    ]);
    await expect(
      service.lookupTemplate({ templateKey: 'secret-letter', version: 2 }),
    ).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it('propagates provider failures without converting them into missing categories', async () => {
    const failure = new Error('provider unavailable');
    repository.listCategories.mockRejectedValue(failure);
    repository.findCategory.mockRejectedValue(failure);
    repository.listTemplates.mockRejectedValue(failure);
    await expect(service.listCategories(true)).rejects.toBe(failure);
    await expect(service.listTemplates('confession')).rejects.toBe(failure);
    expect(repository.listTemplates).not.toHaveBeenCalled();
    await expect(service.listTemplates()).rejects.toBe(failure);
  });
});
