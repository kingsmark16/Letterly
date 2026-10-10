import type { templateDefinitions } from '@letterly/templates/catalog';
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

export function resolveDraftPolicy(identity: {
  registryKey: string;
  version: number;
}): TemplateDraftPolicy | undefined {
  return Object.values(policies).find(
    (policy) =>
      policy.registryKey === identity.registryKey &&
      policy.version === identity.version,
  );
}
