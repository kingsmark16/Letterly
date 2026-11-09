import {
  birthdayWishContentSchema,
  birthdayWishSettingsSchema,
  birthdayWishTemplate,
} from '@letterly/templates';
import type { TemplateOwnerProjectionAdapter } from './owner-projection';

export const birthdayWishOwnerProjectionAdapter: TemplateOwnerProjectionAdapter =
  {
    registryKey: birthdayWishTemplate.registryKey,
    version: birthdayWishTemplate.version,
    project: ({ content, privateSettings }) => ({
      content: birthdayWishContentSchema.parse(content),
      settings: birthdayWishSettingsSchema.parse(privateSettings),
    }),
    summarize({ content }) {
      const parsed = birthdayWishContentSchema.parse(content);
      const title = parsed.title?.trim();
      return {
        recipientLabel: parsed.recipientName.trim() || 'Untitled letter',
        preview: title ? { title } : {},
      };
    },
  };
