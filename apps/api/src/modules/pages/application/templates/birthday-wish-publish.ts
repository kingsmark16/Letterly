import { birthdayWishTemplate } from '@letterly/templates';
import type { TemplatePublishPolicy } from './publish-policy';

export const birthdayWishPublishPolicy: TemplatePublishPolicy = {
  registryKey: birthdayWishTemplate.registryKey,
  version: birthdayWishTemplate.version,
  requiresOwnedJourney: false,
  acceptsContent: (content) =>
    content.recipientName.trim().length > 0 &&
    content.mainMessage.trim().length > 0,
};
