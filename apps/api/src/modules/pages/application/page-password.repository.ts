import type { SecretLetterEncryptedPassword } from '@letterly/templates';

export const PAGE_PASSWORD_REPOSITORY = Symbol('PAGE_PASSWORD_REPOSITORY');

export interface PublicPagePassword {
  pageId: string;
  password: SecretLetterEncryptedPassword;
}

export interface PagePasswordRepository {
  setOwnedPassword(input: {
    creatorId: string;
    pageId: string;
    password: SecretLetterEncryptedPassword | null;
  }): Promise<'updated' | 'not_found'>;
  findPublishedPassword(slug: string): Promise<PublicPagePassword | null>;
}
