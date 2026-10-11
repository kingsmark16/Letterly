export const ADMIN_ACCESS_REPOSITORY = Symbol('ADMIN_ACCESS_REPOSITORY');

export interface AdminAccessRepository {
  findUser(userId: string): Promise<{
    role: 'ADMIN' | 'CREATOR';
    moderationStatus: 'ACTIVE' | 'DISABLED';
  } | null>;
}
