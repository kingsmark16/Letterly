import {
  birthdayWishContentSchema,
  birthdayWishSettingsSchema,
  birthdayWishTemplate,
} from '@letterly/templates';
import type { TemplateDraftPersistenceAdapter } from './draft-persistence-adapter';

export const birthdayWishDraftPersistenceAdapter: TemplateDraftPersistenceAdapter =
  {
    registryKey: birthdayWishTemplate.registryKey,
    version: birthdayWishTemplate.version,
    prepare(input) {
      if (input.journey) throw new Error('Unexpected Birthday Wish journey');
      return {
        content: birthdayWishContentSchema.parse(input.content),
        settings: birthdayWishSettingsSchema.parse(input.settings),
        beforePage: () => Promise.resolve(),
        afterPage: () => Promise.resolve(),
      };
    },
  };
