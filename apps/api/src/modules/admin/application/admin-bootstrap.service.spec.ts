import {
  AdminBootstrapService,
  AdminBootstrapUserDisabledError,
  AdminBootstrapUserNotFoundError,
} from './admin-bootstrap.service';
import type { AdminBootstrapRepository } from './admin-bootstrap.repository';

describe('AdminBootstrapService', () => {
  function repository(
    result: Awaited<ReturnType<AdminBootstrapRepository['promoteUser']>>,
  ): jest.Mocked<AdminBootstrapRepository> {
    return {
      promoteUser: jest.fn().mockResolvedValue(result),
    };
  }

  it('returns an idempotent result for an existing administrator', async () => {
    const service = new AdminBootstrapService(
      repository({ type: 'already_admin', userId: 'user-1' }),
    );

    await expect(
      service.promote({ userId: 'user-1', requestId: 'request-1' }),
    ).resolves.toEqual({ userId: 'user-1', alreadyAdmin: true });
  });

  it('maps missing and disabled users to safe errors', async () => {
    await expect(
      new AdminBootstrapService(repository({ type: 'not_found' })).promote({
        userId: 'missing',
        requestId: 'request-1',
      }),
    ).rejects.toBeInstanceOf(AdminBootstrapUserNotFoundError);

    await expect(
      new AdminBootstrapService(repository({ type: 'disabled' })).promote({
        userId: 'disabled',
        requestId: 'request-2',
      }),
    ).rejects.toBeInstanceOf(AdminBootstrapUserDisabledError);
  });
});
