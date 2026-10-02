import {
  chooseYourHeartTemplate,
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates';
import type { TemplateOwnerProjectionAdapter } from './owner-projection';

export const chooseYourHeartOwnerProjectionAdapter: TemplateOwnerProjectionAdapter =
  {
    registryKey: 'confession.choose-your-heart',
    version: 1,
    project: ({ content, privateSettings }) => ({
      content: secretLetterContentSchema.parse(content),
      settings: {
        ...secretLetterSettingsSchema.parse(privateSettings),
        ...chooseYourHeartTemplate.settingsSchema.parse(privateSettings),
      },
    }),
    summarize({ content, firstQuestion }) {
      const parsed = secretLetterContentSchema.parse(content);
      return {
        recipientLabel: parsed.recipientName.trim() || 'Untitled letter',
        ...(firstQuestion
          ? {
              preview: {
                firstQuestion: {
                  prompt: firstQuestion.prompt,
                  choices: firstQuestion.choices.map(({ key, label }) => ({
                    key,
                    label,
                  })),
                },
              },
            }
          : {}),
      };
    },
  };
