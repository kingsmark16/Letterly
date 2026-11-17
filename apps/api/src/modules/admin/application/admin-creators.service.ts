import {
  AdminCreatorNotFoundError,
  type AdminCreatorsRepository,
} from './admin-creators.repository';

export class AdminCreatorsService {
  constructor(private readonly repository: AdminCreatorsRepository) {}

  async detail(creatorId: string) {
    const creator = await this.repository.findCreator(creatorId);
    if (!creator) throw new AdminCreatorNotFoundError();
    return creator;
  }
}
