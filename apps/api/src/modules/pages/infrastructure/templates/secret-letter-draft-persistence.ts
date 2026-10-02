import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates';
import type { TemplateDraftPersistenceAdapter } from './draft-persistence-adapter';

export const secretLetterDraftPersistenceAdapter: TemplateDraftPersistenceAdapter =
  {
    registryKey: 'confession.secret-letter',
    version: 1,
    prepare(input) {
      if (input.journey) throw new Error('Unexpected Secret Letter journey');
      return {
        content: secretLetterContentSchema.parse(input.content),
        settings: secretLetterSettingsSchema.parse(input.settings),
        beforePage: () => Promise.resolve(),
        afterPage: () => Promise.resolve(),
      };
    },
  };
