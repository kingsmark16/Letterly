import type { templateDefinitions } from '@letterly/templates/catalog';
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

export function resolvePublicationAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplatePublicationAdapter | undefined {
  return Object.values(adapters).find(
    (adapter) =>
      adapter.registryKey === identity.registryKey &&
      adapter.version === identity.version,
  );
}
