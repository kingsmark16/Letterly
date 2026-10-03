import type { AdminAccessRepository } from './admin-access.repository';

export class AdminAccessService {
  constructor(private readonly repository: AdminAccessRepository) {}

  async check(
    userId: string,
  ): Promise<'allowed' | 'disabled' | 'admin_required'> {
    const user = await this.repository.findUser(userId);
    if (user?.moderationStatus === 'DISABLED') return 'disabled';
    if (user?.role !== 'ADMIN') return 'admin_required';
    return 'allowed';
  }
}
