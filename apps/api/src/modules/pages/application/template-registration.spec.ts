import { templateDefinitions } from '@letterly/templates/catalog';
import type { TemplateImplementationIdentity } from '@letterly/templates/implementation-registry';
import { resolveDraftPolicy } from './templates/draft-policies';
import { resolvePublishPolicy } from './templates/publish-policies';
import { resolvePublicProjectionAdapter as resolvePublicTransport } from './projections/public-projection-adapters';
import { resolveDraftPersistenceAdapter } from '../infrastructure/templates/draft-persistence-adapters';
import { resolvePublicationAdapter } from '../infrastructure/templates/publication-adapters';
import { resolveOwnerProjectionAdapter } from '../infrastructure/templates/owner-projection-adapters';
import { resolvePublicProjectionAdapter as resolvePublicPersistence } from '../infrastructure/templates/public-projection-adapters';

type Resolver = (
  identity: TemplateImplementationIdentity,
) => TemplateImplementationIdentity | undefined;
const registrations: ReadonlyArray<readonly [string, Resolver]> = [
  ['draft policy', resolveDraftPolicy],
  ['publish policy', resolvePublishPolicy],
  ['draft persistence', resolveDraftPersistenceAdapter],
  ['publication', resolvePublicationAdapter],
  ['owner projection', resolveOwnerProjectionAdapter],
  ['public persistence projection', resolvePublicPersistence],
  ['public transport projection', resolvePublicTransport],
];

describe('Production template implementation bindings', () => {
  it.each(registrations)(
    '%s retains every canonical identity and rejects version substitution',
    (_name, resolve) => {
      for (const { definition } of templateDefinitions) {
        const { registryKey, version } = definition;
        const implementation = resolve({ registryKey, version });
        expect(implementation).toMatchObject({ registryKey, version });
        expect(resolve({ registryKey, version })).toBe(implementation);
        expect(resolve({ registryKey, version: version + 1 })).toBeUndefined();
        expect(resolve({ registryKey, version: 0 })).toBeUndefined();
      }
      expect(
        resolve({ registryKey: 'unregistered.version', version: 1 }),
      ).toBeUndefined();
    },
  );
});
