import { ListOwnerPages } from './list-owner-pages';
import type { PagesRepository } from './pages.repository';
import type { PageSummary } from '../domain/page.types';
import { TemplateDefinitionUnavailableError } from './template-definition-unavailable.error';

const summary: PageSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  recipientLabel: 'Alex',
  status: 'DRAFT',
  contentVersion: 1,
  template: {
    id: '22222222-2222-4222-8222-222222222222',
    key: 'secret-letter',
    name: 'Secret Letter',
    templateVersionId: '33333333-3333-4333-8333-333333333333',
    registryKey: 'confession.secret-letter',
    version: 1,
  },
  createdAt: new Date('2026-08-20T00:00:00.000Z'),
  updatedAt: new Date('2026-08-20T00:00:00.000Z'),
};

describe('ListOwnerPages', () => {
  let repository: jest.Mocked<Pick<PagesRepository, 'listPages'>>;
  let useCase: ListOwnerPages;
  beforeEach(() => {
    repository = { listPages: jest.fn() };
    useCase = new ListOwnerPages(repository);
  });

  it('forwards creator, status and stable cursor without modifying the result', async () => {
    const cursor = { id: summary.id, updatedAt: summary.updatedAt };
    const input = {
      creatorId: 'owner',
      size: 1,
      cursor,
      status: 'ALL' as const,
    };
    const result = { items: [summary], nextCursor: cursor };
    repository.listPages.mockResolvedValue(result);
    await expect(useCase.execute(input)).resolves.toBe(result);
    expect(repository.listPages).toHaveBeenCalledWith(input);
  });

  it('returns an empty creator list', async () => {
    repository.listPages.mockResolvedValue({ items: [], nextCursor: null });
    await expect(
      useCase.execute({ creatorId: 'owner', size: 20, cursor: null }),
    ).resolves.toEqual({ items: [], nextCursor: null });
  });

  it.each([
    { registryKey: 'unknown.template', version: 1 },
    { registryKey: 'confession.secret-letter', version: 999 },
  ])('rejects an untrusted template identity %j', async (template) => {
    repository.listPages.mockResolvedValue({
      items: [{ ...summary, template: { ...summary.template, ...template } }],
      nextCursor: null,
    });
    await expect(
      useCase.execute({ creatorId: 'owner', size: 20, cursor: null }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
  });

  it('accepts the other registered template without name branching', async () => {
    const result = {
      items: [
        {
          ...summary,
          template: {
            ...summary.template,
            registryKey: 'confession.choose-your-heart',
            key: 'choose-your-heart',
          },
        },
      ],
      nextCursor: null,
    };
    repository.listPages.mockResolvedValue(result);
    await expect(
      useCase.execute({ creatorId: 'owner', size: 20, cursor: null }),
    ).resolves.toBe(result);
  });

  it('preserves repository failure identity', async () => {
    const failure = new Error('Repository unavailable');
    repository.listPages.mockRejectedValue(failure);
    await expect(
      useCase.execute({ creatorId: 'owner', size: 20, cursor: null }),
    ).rejects.toBe(failure);
  });
});
