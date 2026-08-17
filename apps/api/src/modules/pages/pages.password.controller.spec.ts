jest.mock('../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));

import type { PageService } from './application/page.service';
import { PagePasswordService } from './application/page-password.service';
import { PagesController, PublicPagesController } from './pages.controller';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import type { RateLimitService } from '../../infrastructure/http/rate-limit.service';

const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const creatorId = 'creator-123';

const ownerRequest = {
  authSession: { user: { id: creatorId } },
} as AuthenticatedRequest;

describe('Pages password controllers', () => {
  it('sets or clears a password only through the owner route', async () => {
    const pageService = {} as PageService;
    const setPassword = jest
      .fn()
      .mockResolvedValue({ passwordProtected: true });
    const passwordService = {
      setPassword,
    } as unknown as PagePasswordService;
    const rateLimitService = {
      consumeCreator: jest.fn(),
    } as unknown as RateLimitService;
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      rateLimitService,
      undefined,
      undefined,
      undefined,
      passwordService,
    );

    await expect(
      controller.setPassword(ownerRequest, { pageId }, { password: 'secret' }),
    ).resolves.toEqual({ passwordProtected: true });
    expect(setPassword.mock.calls).toContainEqual([
      {
        creatorId,
        pageId,
        password: 'secret',
      },
    ]);
  });

  it('sets a page scoped unlock cookie after a successful password check', async () => {
    const pageService = {} as PageService;
    const findPublicProtection = jest.fn().mockResolvedValue({
      pageId,
      passwordVersion: 'version-1',
    });
    const unlock = jest
      .fn()
      .mockResolvedValue({ pageId, token: 'unlock-token' });
    const passwordService = {
      findPublicProtection,
      unlock,
    } as unknown as PagePasswordService;
    const consumeVisitorUnlock = jest.fn();
    const rateLimitService = {
      consumeVisitorUnlock,
    } as unknown as RateLimitService;
    const cookie = jest.fn();
    const response = { cookie };
    const controller = new PublicPagesController(
      pageService,
      rateLimitService,
      'visitor-secret',
      undefined,
      undefined,
      passwordService,
    );

    await expect(
      controller.unlock(
        { slug: 'Letter42' },
        { ip: '127.0.0.1', headers: {} } as never,
        response as never,
        { password: 'secret' },
      ),
    ).resolves.toEqual({ unlocked: true });
    expect(consumeVisitorUnlock.mock.calls).toContainEqual([
      pageId,
      '127.0.0.1',
    ]);
    const cookieCalls = cookie.mock.calls as unknown[][];
    expect(cookieCalls[0]?.slice(0, 2)).toEqual([
      `letterly_unlock_${pageId}`,
      'unlock-token',
    ]);
    expect(cookieCalls[0]?.[2]).toEqual(
      expect.objectContaining({ httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }),
    );
  });
});
