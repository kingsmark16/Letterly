import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates';
import type { TemplateOwnerProjectionAdapter } from './owner-projection';

export const secretLetterOwnerProjectionAdapter: TemplateOwnerProjectionAdapter =
  {
    registryKey: 'confession.secret-letter',
    version: 1,
    project: ({ content, privateSettings }) => ({
      content: secretLetterContentSchema.parse(content),
      settings: secretLetterSettingsSchema.parse(privateSettings),
    }),
    summarize({ content }) {
      const parsed = secretLetterContentSchema.parse(content);
      const title = parsed.title?.trim();
      return {
        recipientLabel: parsed.recipientName.trim() || 'Untitled letter',
        preview: title ? { title } : {},
      };
    },
  };
