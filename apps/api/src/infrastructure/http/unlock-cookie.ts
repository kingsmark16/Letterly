import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';

export const UNLOCK_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function unlockCookieName(pageId: string): string {
  return `letterly_unlock_${pageId}`;
}

export function createUnlockToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readUnlockToken(
  request: Pick<Request, 'headers'>,
  pageId: string,
): string | null {
  return readUnlockTokenFromHeader(request.headers.cookie, pageId);
}

export function readUnlockTokenFromHeader(
  cookieHeader: string | undefined,
  pageId: string,
): string | null {
  if (typeof cookieHeader !== 'string') {
    return null;
  }

  const expectedName = unlockCookieName(pageId);
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== expectedName) {
      continue;
    }

    const value = part.slice(separator + 1).trim();
    if (value.length === 0 || value.length > 512) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function hashUnlockToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function unlockCookieOptions(isProduction: boolean): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  maxAge: number;
  path: '/';
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: UNLOCK_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}
