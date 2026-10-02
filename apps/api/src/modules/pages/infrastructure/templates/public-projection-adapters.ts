import type { templateDefinitions } from '@letterly/templates/catalog';
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

export function resolvePublicProjectionAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplatePublicProjectionAdapter | undefined {
  return Object.values(adapters).find(
    (adapter) =>
      adapter.registryKey === identity.registryKey &&
      adapter.version === identity.version,
  );
}
