import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartDraftPolicy } from './choose-your-heart-draft';
import { secretLetterDraftPolicy } from './secret-letter-draft';
import type { TemplateDraftPolicy } from './draft-policy';

const policies = {
  'confession.secret-letter': secretLetterDraftPolicy,
  'confession.choose-your-heart': chooseYourHeartDraftPolicy,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplateDraftPolicy
>;

const resolveImplementation = createTemplateImplementationRegistry(
  templateDefinitions.map((entry) => entry.definition),
  policies,
);

export function resolveDraftPolicy(identity: {
  registryKey: string;
  version: number;
}): TemplateDraftPolicy | undefined {
  return resolveImplementation(identity);
}
