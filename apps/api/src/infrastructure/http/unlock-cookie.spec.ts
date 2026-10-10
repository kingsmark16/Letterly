import {
  createUnlockToken,
  hashUnlockToken,
} from '../../modules/pages/application/unlock-token';
import {
  readUnlockToken,
  readUnlockTokenFromHeader,
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

  it.each([
    undefined,
    'letterly_unlock_page=',
    'letterly_unlock_page=%broken',
    `letterly_unlock_page=${'a'.repeat(513)}`,
    'letterly_unlock_other=value',
    'letterly_unlock_page=; letterly_unlock_page=later-valid',
  ])('fails closed for an absent or invalid page cookie: %s', (header) => {
    expect(readUnlockTokenFromHeader(header, 'page')).toBeNull();
  });

  it('keeps page selection, first match, decoding, and embedded equals intact', () => {
    expect(
      readUnlockTokenFromHeader(
        'other=ignored; letterly_unlock_other=wrong; letterly_unlock_page = a%2Fb=c; letterly_unlock_page=later',
        'page',
      ),
    ).toBe('a/b=c');
    expect(
      readUnlockTokenFromHeader(
        `letterly_unlock_page=${'a'.repeat(512)}`,
        'page',
      ),
    ).toHaveLength(512);
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
