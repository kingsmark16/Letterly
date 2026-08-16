import { createHmac } from 'node:crypto';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import {
  resolveVisitorIdentity,
  verifyVisitorIdentity,
} from './visitor-identity';

const secret = 'a-secure-test-secret-that-is-long-enough';
const now = Date.parse('2026-08-11T00:00:00.000Z');

function sign(address: string, issuedAt = now): string {
  const payload = createVisitorIdentityPayload(
    address,
    Math.floor(issuedAt / 1000),
  );
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

describe('visitor identity', () => {
  it('accepts a valid signed identity within the time window', () => {
    expect(
      verifyVisitorIdentity(sign('203.0.113.24'), secret, now + 30_000),
    ).toBe('203.0.113.24');
  });

  it('rejects a tampered, expired, or future identity', () => {
    const valid = sign('203.0.113.24');
    const tampered = `${valid.slice(0, -1)}x`;

    expect(verifyVisitorIdentity(tampered, secret, now)).toBeNull();
    expect(verifyVisitorIdentity(valid, secret, now + 301_000)).toBeNull();
    expect(
      verifyVisitorIdentity(sign('203.0.113.24', now + 11_000), secret, now),
    ).toBeNull();
  });

  it('uses request.ip for direct or unsigned API requests', () => {
    expect(
      resolveVisitorIdentity({ ip: '127.0.0.1', headers: {} }, secret, now),
    ).toBe('127.0.0.1');

    expect(
      resolveVisitorIdentity(
        {
          ip: '127.0.0.1',
          headers: { [visitorIdentityHeader]: sign('203.0.113.24') },
        },
        secret,
        now,
      ),
    ).toBe('203.0.113.24');
  });
});
