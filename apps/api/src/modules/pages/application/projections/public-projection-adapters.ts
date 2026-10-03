import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartPublicProjection } from './choose-your-heart-public-projection';
import type { PublicProjectionAdapter } from './public-projection';
import { secretLetterPublicProjection } from './secret-letter-public-projection';

const adapters = {
  'confession.secret-letter': secretLetterPublicProjection,
  'confession.choose-your-heart': chooseYourHeartPublicProjection,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  PublicProjectionAdapter
>;

const resolveImplementation = createTemplateImplementationRegistry(
  templateDefinitions.map((entry) => entry.definition),
  adapters,
);

export function resolvePublicProjectionAdapter(identity: {
  registryKey: string;
  version: number;
}): PublicProjectionAdapter | undefined {
  return resolveImplementation(identity);
}
