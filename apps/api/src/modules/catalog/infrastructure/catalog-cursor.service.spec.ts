import {
  InvalidCatalogCursorError,
  type CatalogCursor,
} from '../application/catalog-cursor';
import { CatalogCursorService } from './catalog-cursor.service';

describe('CatalogCursorService', () => {
  let cursor: CatalogCursor;

  beforeEach(() => {
    cursor = new CatalogCursorService();
  });

  it('round trips a stable position bound to normalized filters and page size', () => {
    const filterFingerprint = cursor.filterFingerprint({
      categoryKey: 'confession',
      query: 'letter',
    });
    const position = {
      displayOrder: 12,
      id: '11111111-1111-4111-8111-111111111111',
    };
    const encoded = cursor.encode({ position, filterFingerprint, size: 20 });

    expect(
      cursor.decode({ cursor: encoded, filterFingerprint, size: 20 }),
    ).toEqual(position);
  });

  it.each([
    { categoryKey: 'other', query: 'letter', size: 20 },
    { categoryKey: 'confession', query: 'different', size: 20 },
    { categoryKey: 'confession', query: 'letter', size: 10 },
  ])('rejects a cursor when its filters or page size change: %p', (input) => {
    const filterFingerprint = cursor.filterFingerprint({
      categoryKey: 'confession',
      query: 'letter',
    });
    const encoded = cursor.encode({
      position: {
        displayOrder: 12,
        id: '11111111-1111-4111-8111-111111111111',
      },
      filterFingerprint,
      size: 20,
    });
    const nextFingerprint = cursor.filterFingerprint({
      categoryKey: input.categoryKey,
      query: input.query,
    });

    expect(() =>
      cursor.decode({
        cursor: encoded,
        filterFingerprint: nextFingerprint,
        size: input.size,
      }),
    ).toThrow(InvalidCatalogCursorError);
  });

  it('rejects malformed cursor data', () => {
    expect(() =>
      cursor.decode({
        cursor: 'not-valid-cursor',
        filterFingerprint: cursor.filterFingerprint({}),
        size: 20,
      }),
    ).toThrow(InvalidCatalogCursorError);
  });
});
