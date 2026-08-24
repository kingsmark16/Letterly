import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_BOOTSTRAP_REPOSITORY,
  type AdminBootstrapRepository,
} from './admin-bootstrap.repository';

export class AdminBootstrapUserNotFoundError extends Error {
  constructor() {
    super('Administrator bootstrap user not found');
  }
}

export class AdminBootstrapUserDisabledError extends Error {
  constructor() {
    super('Administrator bootstrap user is disabled');
  }
}

@Injectable()
export class AdminBootstrapService {
  constructor(
    @Inject(ADMIN_BOOTSTRAP_REPOSITORY)
    private readonly repository: AdminBootstrapRepository,
  ) {}

  async promote(input: { userId: string; requestId: string }): Promise<{
    userId: string;
    alreadyAdmin: boolean;
  }> {
    const result = await this.repository.promoteUser(input);
    if (result.type === 'not_found') {
      throw new AdminBootstrapUserNotFoundError();
    }
    if (result.type === 'disabled') {
      throw new AdminBootstrapUserDisabledError();
    }
    return {
      userId: result.userId,
      alreadyAdmin: result.type === 'already_admin',
    };
  }
}
