export const ADMIN_BOOTSTRAP_REPOSITORY = Symbol('ADMIN_BOOTSTRAP_REPOSITORY');

export type AdminBootstrapResult =
  | { type: 'promoted'; userId: string }
  | { type: 'already_admin'; userId: string }
  | { type: 'not_found' }
  | { type: 'disabled' };

export interface AdminBootstrapRepository {
  promoteUser(input: {
    userId: string;
    requestId: string;
  }): Promise<AdminBootstrapResult>;
}
