import { createHash, randomBytes } from 'node:crypto';

export type UnlockTokenReader = (pageId: string) => string | null;

export function createUnlockToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashUnlockToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
