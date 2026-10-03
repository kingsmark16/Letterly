import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { templateDefinitions } from '@letterly/templates/catalog';
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

const resolveImplementation = createTemplateImplementationRegistry(
  templateDefinitions.map((entry) => entry.definition),
  policies,
);

export function resolvePublishPolicy(identity: {
  registryKey: string;
  version: number;
}): TemplatePublishPolicy | undefined {
  return resolveImplementation(identity);
}
