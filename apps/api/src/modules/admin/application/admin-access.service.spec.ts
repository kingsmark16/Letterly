import { AdminAccessService } from './admin-access.service';
import type { AdminAccessRepository } from './admin-access.repository';

describe('AdminAccessService', () => {
  it.each<
    [
      Awaited<ReturnType<AdminAccessRepository['findUser']>>,
      Awaited<ReturnType<AdminAccessService['check']>>,
    ]
  >([
    [{ role: 'ADMIN', moderationStatus: 'ACTIVE' }, 'allowed'],
    [{ role: 'ADMIN', moderationStatus: 'DISABLED' }, 'disabled'],
    [{ role: 'CREATOR', moderationStatus: 'DISABLED' }, 'disabled'],
    [{ role: 'CREATOR', moderationStatus: 'ACTIVE' }, 'admin_required'],
    [null, 'admin_required'],
  ])('maps %p to %s without framework dependencies', async (user, result) => {
    const findUser = jest.fn().mockResolvedValue(user);
    await expect(
      new AdminAccessService({ findUser }).check('user-1'),
    ).resolves.toBe(result);
    expect(findUser).toHaveBeenCalledWith('user-1');
  });

  it('propagates provider failures instead of granting or reclassifying access', async () => {
    const failure = new Error('database unavailable');
    const service = new AdminAccessService({
      findUser: jest.fn().mockRejectedValue(failure),
    });
    await expect(service.check('admin-1')).rejects.toBe(failure);
  });
});
