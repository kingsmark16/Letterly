import { birthdayWishTemplate } from '@letterly/templates';
import type { TemplatePublicationAdapter } from './publication-adapter';

export const birthdayWishPublicationAdapter: TemplatePublicationAdapter = {
  registryKey: birthdayWishTemplate.registryKey,
  version: birthdayWishTemplate.version,
  prepare: () =>
    Promise.resolve({
      incrementsContentVersion: false,
      commit: () => Promise.resolve(),
    }),
};
