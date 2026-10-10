import type { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartPublishPolicy } from './choose-your-heart-publish';
import { secretLetterPublishPolicy } from './secret-letter-publish';
import type { TemplatePublishPolicy } from './publish-policy';

const policies = {
  'confession.secret-letter': secretLetterPublishPolicy,
  'confession.choose-your-heart': chooseYourHeartPublishPolicy,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplatePublishPolicy
>;

export function resolvePublishPolicy(identity: {
  registryKey: string;
  version: number;
}): TemplatePublishPolicy | undefined {
  return Object.values(policies).find(
    (policy) =>
      policy.registryKey === identity.registryKey &&
      policy.version === identity.version,
  );
}
