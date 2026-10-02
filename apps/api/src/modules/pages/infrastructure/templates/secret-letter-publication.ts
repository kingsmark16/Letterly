import { secretLetterTemplate } from '@letterly/templates';
import type { TemplatePublicationAdapter } from './publication-adapter';

export const secretLetterPublicationAdapter: TemplatePublicationAdapter = {
  registryKey: secretLetterTemplate.registryKey,
  version: secretLetterTemplate.version,
  prepare: () =>
    Promise.resolve({
      incrementsContentVersion: false,
      commit: () => Promise.resolve(),
    }),
};
