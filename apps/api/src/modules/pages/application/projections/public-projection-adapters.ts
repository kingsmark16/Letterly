import type { templateDefinitions } from '@letterly/templates/catalog';
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

export function resolvePublicProjectionAdapter(identity: {
  registryKey: string;
  version: number;
}): PublicProjectionAdapter | undefined {
  return Object.values(adapters).find(
    (adapter) =>
      adapter.registryKey === identity.registryKey &&
      adapter.version === identity.version,
  );
}
