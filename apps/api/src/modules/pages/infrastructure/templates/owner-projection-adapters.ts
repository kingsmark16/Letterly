import type { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartOwnerProjectionAdapter } from './choose-your-heart-owner-projection';
import type { TemplateOwnerProjectionAdapter } from './owner-projection';
import { secretLetterOwnerProjectionAdapter } from './secret-letter-owner-projection';

const adapters = {
  'confession.secret-letter': secretLetterOwnerProjectionAdapter,
  'confession.choose-your-heart': chooseYourHeartOwnerProjectionAdapter,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplateOwnerProjectionAdapter
>;

export function resolveOwnerProjectionAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplateOwnerProjectionAdapter | undefined {
  return Object.values(adapters).find(
    (adapter) =>
      adapter.registryKey === identity.registryKey &&
      adapter.version === identity.version,
  );
}
