import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { templateCatalogCursorPayloadSchema } from '@letterly/contracts/catalog';
import type { CatalogCursor } from '../application/catalog-cursor';
import { InvalidCatalogCursorError } from '../application/catalog-cursor';
import type { CatalogTemplatePagePosition } from '../application/catalog.repository';

@Injectable()
export class CatalogCursorService implements CatalogCursor {
  filterFingerprint(input: { categoryKey?: string; query?: string }): string {
    return createHash('sha256')
      .update(JSON.stringify([input.categoryKey ?? null, input.query ?? null]))
      .digest('hex');
  }

  encode(input: {
    position: CatalogTemplatePagePosition;
    filterFingerprint: string;
    size: number;
  }): string {
    return Buffer.from(
      JSON.stringify({
        version: 1,
        displayOrder: input.position.displayOrder,
        id: input.position.id,
        filterFingerprint: input.filterFingerprint,
        size: input.size,
      }),
      'utf8',
    ).toString('base64url');
  }

  decode(input: {
    cursor: string;
    filterFingerprint: string;
    size: number;
  }): CatalogTemplatePagePosition {
    try {
      const payload: unknown = JSON.parse(
        Buffer.from(input.cursor, 'base64url').toString('utf8'),
      );
      const parsed = templateCatalogCursorPayloadSchema.parse(payload);

      if (
        parsed.filterFingerprint !== input.filterFingerprint ||
        parsed.size !== input.size
      ) {
        throw new InvalidCatalogCursorError();
      }

      return { displayOrder: parsed.displayOrder, id: parsed.id };
    } catch {
      throw new InvalidCatalogCursorError();
    }
  }
}
