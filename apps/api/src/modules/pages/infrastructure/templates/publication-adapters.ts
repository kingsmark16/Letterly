import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartPublicationAdapter } from './choose-your-heart-publication';
import { secretLetterPublicationAdapter } from './secret-letter-publication';
import type { TemplatePublicationAdapter } from './publication-adapter';

const adapters = {
  'confession.secret-letter': secretLetterPublicationAdapter,
  'confession.choose-your-heart': chooseYourHeartPublicationAdapter,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplatePublicationAdapter
>;

const resolveImplementation = createTemplateImplementationRegistry(
  templateDefinitions.map((entry) => entry.definition),
  adapters,
);

export function resolvePublicationAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplatePublicationAdapter | undefined {
  return resolveImplementation(identity);
}
