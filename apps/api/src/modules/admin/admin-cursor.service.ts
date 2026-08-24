import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';

export const ADMIN_CURSOR_SIGNING_SECRET = Symbol(
  'ADMIN_CURSOR_SIGNING_SECRET',
);

export interface AdminCursorPosition {
  createdAt: Date;
  id: string;
}

interface CursorPayload {
  v: 1;
  createdAt: string;
  id: string;
  filterHash: string;
  size: number;
}

export function adminFilterHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

@Injectable()
export class AdminCursorService {
  constructor(
    @Inject(ADMIN_CURSOR_SIGNING_SECRET)
    private readonly signingSecret: string,
  ) {}

  encode(input: {
    position: AdminCursorPosition;
    filterHash: string;
    size: number;
  }): string {
    const payload: CursorPayload = {
      v: 1,
      createdAt: input.position.createdAt.toISOString(),
      id: input.position.id,
      filterHash: input.filterHash,
      size: input.size,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.signingSecret)
      .update(body)
      .digest('base64url');
    return `${body}.${signature}`;
  }

  decode(input: {
    cursor: string;
    filterHash: string;
    size: number;
  }): AdminCursorPosition {
    const [body, signature] = input.cursor.split('.');
    if (!body || !signature || !this.validSignature(body, signature)) {
      throw new InvalidAdminCursorError();
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as Partial<CursorPayload>;
      const createdAt = new Date(parsed.createdAt ?? '');
      if (
        parsed.v !== 1 ||
        typeof parsed.id !== 'string' ||
        parsed.id.length === 0 ||
        typeof parsed.filterHash !== 'string' ||
        parsed.filterHash !== input.filterHash ||
        parsed.size !== input.size ||
        Number.isNaN(createdAt.getTime())
      ) {
        throw new InvalidAdminCursorError();
      }
      return { createdAt, id: parsed.id };
    } catch (error: unknown) {
      if (error instanceof InvalidAdminCursorError) throw error;
      throw new InvalidAdminCursorError();
    }
  }

  private validSignature(body: string, received: string): boolean {
    const expected = createHmac('sha256', this.signingSecret)
      .update(body)
      .digest('base64url');
    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);
    return (
      expectedBytes.length === receivedBytes.length &&
      timingSafeEqual(expectedBytes, receivedBytes)
    );
  }
}

export class InvalidAdminCursorError extends Error {
  constructor() {
    super('Invalid administrator cursor');
    this.name = 'InvalidAdminCursorError';
  }
}
