import {
  chooseYourHeartTemplate,
  secretLetterContentSchema,
  secretLetterTemplate,
  validatePageJourneyGraph,
} from '@letterly/templates';
import type { TemplateDraftPolicy } from './draft-policy';
import { updateLetterContent } from './letter-content';
export const chooseYourHeartDraftPolicy: TemplateDraftPolicy = {
  registryKey: chooseYourHeartTemplate.registryKey,
  version: chooseYourHeartTemplate.version,
  update: updateLetterContent,
  initialize() {
    return {
      content: secretLetterContentSchema.parse({
        recipientName: '',
        mainMessage: '',
        sections: [],
      }),
      settings: {
        ...secretLetterTemplate.defaultSettings,
        ...chooseYourHeartTemplate.settingsSchema.parse(
          chooseYourHeartTemplate.defaultSettings,
        ),
      },
      journeyValidation: validatePageJourneyGraph(
        chooseYourHeartTemplate.journey.defaultGraph,
      ),
    };
  },
};
