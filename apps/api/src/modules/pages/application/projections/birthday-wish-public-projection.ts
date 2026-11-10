import { publicSecretLetterProjectionSchema } from '@letterly/contracts/pages';
import { birthdayWishTemplate } from '@letterly/templates';
import {
  publicProjectionBase,
  type PublicProjectionAdapter,
} from './public-projection';

export const birthdayWishPublicProjection: PublicProjectionAdapter = {
  registryKey: birthdayWishTemplate.registryKey,
  version: birthdayWishTemplate.version,
  project(context) {
    const { page } = context;
    if (!('recipientName' in page) || 'publishedGraphVersion' in page) {
      throw new Error('Invalid Birthday Wish public projection');
    }
    return publicSecretLetterProjectionSchema.parse({
      ...publicProjectionBase(context),
      recipientName: page.recipientName,
      mainMessage: page.mainMessage,
      ...(page.title !== undefined ? { title: page.title } : {}),
      ...(page.creatorName !== undefined
        ? { creatorName: page.creatorName }
        : {}),
      sections: [],
    });
  },
};
