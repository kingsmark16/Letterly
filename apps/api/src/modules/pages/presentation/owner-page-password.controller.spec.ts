jest.mock('../../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));
import type { PagePasswordService } from '../application/page-password.service';
import type { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import type { AuthenticatedRequest } from '../../auth/better-auth-session.guard';
import { OwnerPagePasswordController } from './owner-page-password.controller';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const creatorId = 'creator-123';
const ownerRequest = {
  authSession: { user: { id: creatorId } },
} as AuthenticatedRequest;
describe('OwnerPagePasswordController', () => {
  it('sets or clears a password only through the owner route', async () => {
    const setPassword = jest
      .fn()
      .mockResolvedValue({ passwordProtected: true });
    const passwordService = {
      setPassword,
    } as unknown as PagePasswordService;
    const rateLimitService = {
      consumeCreator: jest.fn(),
    } as unknown as RateLimitService;
    const controller = new OwnerPagePasswordController(
      passwordService,
      rateLimitService,
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
});
