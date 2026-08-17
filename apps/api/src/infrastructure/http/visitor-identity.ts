import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import {
  parseVisitorIdentityHeader,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';

const maxAgeSeconds = 300;
const futureClockSkewSeconds = 10;

export const VISITOR_IDENTITY_SECRET = Symbol('VISITOR_IDENTITY_SECRET');

export function verifyVisitorIdentity(
  value: string | string[] | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = parseVisitorIdentityHeader(value);

  if (!parsed) {
    return null;
  }

  const nowSeconds = Math.floor(now / 1000);
  const ageSeconds = nowSeconds - parsed.issuedAtSeconds;

  if (ageSeconds < -futureClockSkewSeconds || ageSeconds > maxAgeSeconds) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(parsed.payload)
    .digest('base64url');
  const received = Buffer.from(parsed.signature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  return parsed.address;
}

export function resolveVisitorIdentity(
  request: Pick<Request, 'headers' | 'ip'>,
  secret: string | undefined,
  now = Date.now(),
): string {
  const signedIdentity = secret
    ? verifyVisitorIdentity(request.headers[visitorIdentityHeader], secret, now)
    : null;

  return signedIdentity ?? request.ip ?? 'unknown';
}

export { visitorIdentityHeader };
