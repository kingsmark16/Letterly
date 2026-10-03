import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartPublicProjectionAdapter } from './choose-your-heart-public-projection';
import { secretLetterPublicProjectionAdapter } from './secret-letter-public-projection';
import type { TemplatePublicProjectionAdapter } from './public-projection';

const adapters = {
  'confession.secret-letter': secretLetterPublicProjectionAdapter,
  'confession.choose-your-heart': chooseYourHeartPublicProjectionAdapter,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplatePublicProjectionAdapter
>;

const resolveImplementation = createTemplateImplementationRegistry(
  templateDefinitions.map((entry) => entry.definition),
  adapters,
);

export function resolvePublicProjectionAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplatePublicProjectionAdapter | undefined {
  return resolveImplementation(identity);
}
