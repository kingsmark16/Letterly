import type { AdminCreatorDetail } from '@letterly/contracts';

export const ADMIN_CREATORS_REPOSITORY = Symbol('ADMIN_CREATORS_REPOSITORY');

export interface AdminCreatorsRepository {
  findCreator(creatorId: string): Promise<AdminCreatorDetail | null>;
}

export class AdminCreatorNotFoundError extends Error {
  constructor() {
    super('Administrator target not found');
  }
}
