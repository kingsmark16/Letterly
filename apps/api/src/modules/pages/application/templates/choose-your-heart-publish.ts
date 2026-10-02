import { chooseYourHeartTemplate } from '@letterly/templates';
import type { TemplatePublishPolicy } from './publish-policy';

export const chooseYourHeartPublishPolicy: TemplatePublishPolicy = {
  registryKey: chooseYourHeartTemplate.registryKey,
  version: chooseYourHeartTemplate.version,
  requiresOwnedJourney: true,
  acceptsContent: () => true,
};
