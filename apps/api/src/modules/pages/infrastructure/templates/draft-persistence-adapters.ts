import type { templateDefinitions } from '@letterly/templates/catalog';
import { chooseYourHeartDraftPersistenceAdapter } from './choose-your-heart-draft-persistence';
import type { TemplateDraftPersistenceAdapter } from './draft-persistence-adapter';
import { secretLetterDraftPersistenceAdapter } from './secret-letter-draft-persistence';

const adapters = {
  'confession.secret-letter': secretLetterDraftPersistenceAdapter,
  'confession.choose-your-heart': chooseYourHeartDraftPersistenceAdapter,
} satisfies Record<
  (typeof templateDefinitions)[number]['definition']['registryKey'],
  TemplateDraftPersistenceAdapter
>;

export function resolveDraftPersistenceAdapter(identity: {
  registryKey: string;
  version: number;
}): TemplateDraftPersistenceAdapter | undefined {
  return Object.values(adapters).find(
    (adapter) =>
      adapter.registryKey === identity.registryKey &&
      adapter.version === identity.version,
  );
}
