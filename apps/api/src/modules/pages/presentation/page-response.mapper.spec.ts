import type { OwnerPage } from '../domain/page.types';
import { toOwnerPageProjection } from './page-response.mapper';

const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

function createOwnerPage(recipientName: string): OwnerPage {
  return {
    id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
    creatorId: 'creator-internal-id',
    slug: 'letter42',
    displaySlug: 'Letter 42',
    status: 'DRAFT',
    contentVersion: 0,
    content: {
      recipientName,
      mainMessage: 'A private message for the recipient.',
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
    updatedAt: new Date('2026-08-09T01:30:00.000Z'),
  };
}

describe('toOwnerPageProjection', () => {
  it('AC-1 returns a safe owner projection with UTC timestamps', () => {
    const response = toOwnerPageProjection(createOwnerPage('  Juliet  '));

    expect(response.recipientLabel).toBe('Juliet');
    expect(response.createdAt).toBe('2026-08-09T00:00:00.000Z');
    expect(response.updatedAt).toBe('2026-08-09T01:30:00.000Z');

    expect(response).not.toHaveProperty('creatorId');
    expect(response).not.toHaveProperty('displaySlug');
  });

  it('AC-5 uses the safe fallback label for a blank recipient name', () => {
    const response = toOwnerPageProjection(createOwnerPage('   '));

    expect(response.recipientLabel).toBe('Untitled letter');
  });
});
