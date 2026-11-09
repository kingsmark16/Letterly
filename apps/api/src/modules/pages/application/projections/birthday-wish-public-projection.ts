import {
  publicSecretLetterProjectionSchema,
  type PublicSecretLetterProjection,
} from '@letterly/contracts/pages';
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
    const projection = publicSecretLetterProjectionSchema.parse({
      ...publicProjectionBase(context),
      recipientName: page.recipientName,
      mainMessage: page.mainMessage,
      ...(page.title !== undefined ? { title: page.title } : {}),
      ...(page.creatorName !== undefined
        ? { creatorName: page.creatorName }
        : {}),
      sections: [],
    });
    if (!page.response) {
      const legacyProjection: Exclude<
        PublicSecretLetterProjection,
        { state: 'LOCKED' }
      > = { ...projection };
      delete legacyProjection.response;
      return legacyProjection;
    }
    return projection;
  },
};
