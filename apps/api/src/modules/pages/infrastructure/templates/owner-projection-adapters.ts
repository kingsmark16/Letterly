import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { templateDefinitions } from '@letterly/templates/catalog';
import { birthdayWishOwnerProjectionAdapter } from './birthday-wish-owner-projection';
import { chooseYourHeartOwnerProjectionAdapter } from './choose-your-heart-owner-projection';
import type { TemplateOwnerProjectionAdapter } from './owner-projection';
import { secretLetterOwnerProjectionAdapter } from './secret-letter-owner-projection';

const adapters = {
  'confession.secret-letter': secretLetterOwnerProjectionAdapter,
  'confession.choose-your-heart': chooseYourHeartOwnerProjectionAdapter,
  'birthday.birthday-wish': birthdayWishOwnerProjectionAdapter,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplateOwnerProjectionAdapter
>;

const resolveImplementation = createTemplateImplementationRegistry(
  templateDefinitions.map((entry) => entry.definition),
  adapters,
);

export function resolveOwnerProjectionAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplateOwnerProjectionAdapter | undefined {
  return resolveImplementation(identity);
}
