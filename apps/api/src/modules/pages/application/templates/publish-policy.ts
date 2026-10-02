import type { SecretLetterContent } from '@letterly/templates';

export interface TemplatePublishPolicy {
  registryKey: string;
  version: number;
  requiresOwnedJourney: boolean;
  acceptsContent: (content: SecretLetterContent) => boolean;
}
