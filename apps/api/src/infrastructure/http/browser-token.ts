import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { Request } from 'express';

export const BROWSER_COOKIE_NAME = 'letterly_browser';
export const BROWSER_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export function createBrowserToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readBrowserToken(
  request: Pick<Request, 'headers'>,
): string | null {
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader !== 'string') {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    if (name !== BROWSER_COOKIE_NAME) {
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

export function hashBrowserToken(
  pageId: string,
  browserToken: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`browser:${pageId}:${browserToken}`)
    .digest('hex');
}

export function rateLimitBrowserKey(
  pageId: string,
  browserTokenHash: string,
): string {
  return createHash('sha256')
    .update(`submission:${pageId}:${browserTokenHash}`)
    .digest('hex');
}

export function browserCookieOptions(isProduction: boolean): {
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
    maxAge: BROWSER_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}
