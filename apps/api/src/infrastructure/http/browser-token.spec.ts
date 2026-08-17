import {
  BROWSER_COOKIE_MAX_AGE_MS,
  BROWSER_COOKIE_NAME,
  browserCookieOptions,
  createBrowserToken,
  hashBrowserToken,
  readBrowserToken,
  rateLimitBrowserKey,
} from './browser-token';

describe('browser token helpers', () => {
  it('creates an opaque token and reads the matching cookie', () => {
    const token = createBrowserToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(
      readBrowserToken({
        headers: {
          cookie: `other=value; ${BROWSER_COOKIE_NAME}=${encodeURIComponent(token)}`,
        },
      }),
    ).toBe(token);
  });

  it('rejects missing, empty, oversized, and malformed cookies', () => {
    expect(readBrowserToken({ headers: {} })).toBeNull();
    expect(
      readBrowserToken({ headers: { cookie: `${BROWSER_COOKIE_NAME}=` } }),
    ).toBeNull();
    expect(
      readBrowserToken({
        headers: { cookie: `${BROWSER_COOKIE_NAME}=${'x'.repeat(513)}` },
      }),
    ).toBeNull();
    expect(
      readBrowserToken({
        headers: { cookie: `${BROWSER_COOKIE_NAME}=%E0%A4%A` },
      }),
    ).toBeNull();
  });

  it('scopes hashes to the page and secret without exposing the token', () => {
    const first = hashBrowserToken('page-a', 'browser-token', 'secret');

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(hashBrowserToken('page-b', 'browser-token', 'secret')).not.toBe(
      first,
    );
    expect(
      hashBrowserToken('page-a', 'browser-token', 'other-secret'),
    ).not.toBe(first);
    expect(first).not.toContain('browser-token');
    expect(rateLimitBrowserKey('page-a', first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('uses the required one year secure cookie policy in production', () => {
    expect(browserCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: BROWSER_COOKIE_MAX_AGE_MS,
      path: '/',
    });
    expect(browserCookieOptions(false).secure).toBe(false);
  });
});
