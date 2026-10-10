import { secretLetterTemplate } from '@letterly/templates';
import type { TemplatePublishPolicy } from './publish-policy';

export const secretLetterPublishPolicy: TemplatePublishPolicy = {
  registryKey: secretLetterTemplate.registryKey,
  version: secretLetterTemplate.version,
  requiresOwnedJourney: false,
  acceptsContent: (content) =>
    content.recipientName.trim().length > 0 &&
    content.mainMessage.trim().length > 0,
};
