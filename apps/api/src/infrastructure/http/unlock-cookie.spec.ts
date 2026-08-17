import {
  createUnlockToken,
  hashUnlockToken,
  readUnlockToken,
  unlockCookieName,
  unlockCookieOptions,
} from './unlock-cookie';

describe('unlock cookie helpers', () => {
  it('uses a page scoped cookie and parses encoded values', () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const token = createUnlockToken();

    expect(
      readUnlockToken(
        {
          headers: {
            cookie: `${unlockCookieName(pageId)}=${encodeURIComponent(token)}`,
          },
        },
        pageId,
      ),
    ).toBe(token);
    expect(hashUnlockToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(
      readUnlockToken(
        { headers: { cookie: 'letterly_unlock_other=value' } },
        pageId,
      ),
    ).toBeNull();
  });

  it('uses a one day HTTP only cookie policy', () => {
    expect(unlockCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  });
});
