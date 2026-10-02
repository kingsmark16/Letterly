import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
  secretLetterTemplate,
} from '@letterly/templates';
import type { TemplateDraftPolicy } from './draft-policy';
export const secretLetterDraftPolicy: TemplateDraftPolicy = {
  registryKey: secretLetterTemplate.registryKey,
  version: secretLetterTemplate.version,
  initialize(command) {
    return {
      content: secretLetterContentSchema.parse({
        ...secretLetterTemplate.defaultContent,
        recipientName:
          command.recipientName ??
          secretLetterTemplate.defaultContent.recipientName,
        mainMessage:
          command.mainMessage ??
          secretLetterTemplate.defaultContent.mainMessage,
        ...(command.title !== undefined ? { title: command.title } : {}),
        ...(command.creatorName !== undefined
          ? { creatorName: command.creatorName }
          : {}),
      }),
      settings: secretLetterSettingsSchema.parse(
        secretLetterTemplate.defaultSettings,
      ),
    };
  },
};
