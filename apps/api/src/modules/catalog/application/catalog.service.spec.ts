import { requiredTestValue } from '../../../../test/support/required-test-value';
import { ZodError } from 'zod';
import {
  CatalogCategoryNotFoundError,
  CatalogService,
  CatalogUnavailableError,
} from './catalog.service';
import type {
  CatalogRepository,
  CatalogTemplateRecord,
} from './catalog.repository';

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
  let service: CatalogService;

  beforeEach(() => {
    repository = {
      listCategories: jest.fn<
        ReturnType<CatalogRepository['listCategories']>,
        Parameters<CatalogRepository['listCategories']>
      >(),
      findCategory: jest.fn<
        ReturnType<CatalogRepository['findCategory']>,
        Parameters<CatalogRepository['findCategory']>
      >(),
      listTemplates: jest.fn<
        ReturnType<CatalogRepository['listTemplates']>,
        Parameters<CatalogRepository['listTemplates']>
      >(),
    };
    service = new CatalogService(repository);
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
