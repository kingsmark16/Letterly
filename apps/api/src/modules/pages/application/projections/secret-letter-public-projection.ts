import {
  publicSecretLetterProjectionSchema,
  type PublicSecretLetterProjection,
} from '@letterly/contracts/pages';
import {
  publicProjectionBase,
  type PublicProjectionAdapter,
} from './public-projection';

export const secretLetterPublicProjection: PublicProjectionAdapter = {
  registryKey: 'confession.secret-letter',
  version: 1,
  project(context) {
    const { page } = context;
    if (!('recipientName' in page) || 'publishedGraphVersion' in page) {
      throw new Error('Invalid Secret Letter public projection');
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
