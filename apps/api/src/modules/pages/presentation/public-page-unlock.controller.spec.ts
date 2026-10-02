import { ApiException } from '../../../infrastructure/http/api-exception';
import { RateLimitExceededError } from '../../../infrastructure/http/rate-limit.service';
import {
  InvalidPagePasswordError,
  PagePasswordService,
} from '../application/page-password.service';
import { PublicPageUnlockController } from './public-page-unlock.controller';
import type { RateLimitService } from '../../../infrastructure/http/rate-limit.service';

const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
describe('Public password unlock controller', () => {
  it('sets a page scoped unlock cookie after a successful password check', async () => {
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
    const controller = new PublicPageUnlockController(
      rateLimitService,
      'visitor-secret',
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

  it('AC-7 maps an incorrect password without setting an unlock cookie', async () => {
    const findPublicProtection = jest.fn().mockResolvedValue({
      pageId,
      passwordVersion: 'version-1',
    });
    const unlock = jest.fn().mockRejectedValue(new InvalidPagePasswordError());
    const passwordService = {
      findPublicProtection,
      unlock,
    } as unknown as PagePasswordService;
    const rateLimitService = {
      consumeVisitorUnlock: jest.fn(),
    } as unknown as RateLimitService;
    const cookie = jest.fn();
    const controller = new PublicPageUnlockController(
      rateLimitService,
      'visitor-secret',
      passwordService,
    );

    const error = await controller
      .unlock(
        { slug: 'Letter42' },
        { ip: '127.0.0.1', headers: {} } as never,
        { cookie } as never,
        { password: 'wrong' },
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 401,
      code: 'INVALID_PASSWORD',
      message: 'The password is incorrect',
    });
    expect(cookie).not.toHaveBeenCalled();
  });

  it('AC-7 maps unlock rate limits with a retry duration and no cookie', async () => {
    const findPublicProtection = jest.fn().mockResolvedValue({
      pageId,
      passwordVersion: 'version-1',
    });
    const unlock = jest.fn();
    const consumeVisitorUnlock = jest
      .fn()
      .mockRejectedValue(new RateLimitExceededError(37));
    const passwordService = {
      findPublicProtection,
      unlock,
    } as unknown as PagePasswordService;
    const controller = new PublicPageUnlockController(
      { consumeVisitorUnlock } as unknown as RateLimitService,
      'visitor-secret',
      passwordService,
    );

    const error = await controller
      .unlock(
        { slug: 'letter42' },
        { ip: '127.0.0.1', headers: {} } as never,
        { cookie: jest.fn() } as never,
        { password: 'secret' },
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: 37 },
    });
    expect(unlock).not.toHaveBeenCalled();
  });
});
