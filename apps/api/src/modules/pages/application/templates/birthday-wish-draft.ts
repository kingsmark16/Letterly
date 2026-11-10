import {
  birthdayWishContentSchema,
  birthdayWishSettingsSchema,
  birthdayWishTemplate,
} from '@letterly/templates';
import type { TemplateDraftPolicy } from './draft-policy';
import { updateLetterContent } from './letter-content';

export const birthdayWishDraftPolicy: TemplateDraftPolicy = {
  registryKey: birthdayWishTemplate.registryKey,
  version: birthdayWishTemplate.version,
  update: updateLetterContent,
  initialize(command) {
    return {
      content: birthdayWishContentSchema.parse({
        ...birthdayWishTemplate.defaultContent,
        recipientName:
          command.recipientName ??
          birthdayWishTemplate.defaultContent.recipientName,
        mainMessage:
          command.mainMessage ??
          birthdayWishTemplate.defaultContent.mainMessage,
        ...(command.title !== undefined ? { title: command.title } : {}),
        ...(command.creatorName !== undefined
          ? { creatorName: command.creatorName }
          : {}),
      }),
      settings: birthdayWishSettingsSchema.parse(
        birthdayWishTemplate.defaultSettings,
      ),
    };
  },
};
