import {
  chooseYourHeartTemplate,
  secretLetterContentSchema,
  secretLetterTemplate,
  validatePageJourneyGraph,
} from '@letterly/templates';
import type { TemplateDraftPolicy } from './draft-policy';
export const chooseYourHeartDraftPolicy: TemplateDraftPolicy = {
  registryKey: chooseYourHeartTemplate.registryKey,
  version: chooseYourHeartTemplate.version,
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
