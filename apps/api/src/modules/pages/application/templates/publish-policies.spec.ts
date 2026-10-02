import { templateDefinitions } from '@letterly/templates/catalog';
import {
  chooseYourHeartTemplate,
  secretLetterTemplate,
} from '@letterly/templates';
import { resolvePublishPolicy } from './publish-policies';

function policyFor(registryKey: string, version = 1) {
  const policy = resolvePublishPolicy({ registryKey, version });
  if (!policy) throw new Error('Expected registered publishing policy');
  return policy;
}

describe('registered publishing requirements', () => {
  it('covers trusted versions and rejects unsupported identities without a fallback', () => {
    for (const { definition } of templateDefinitions)
      expect(resolvePublishPolicy(definition)).toBeDefined();
    for (const registryKey of ['unknown', '__proto__', 'toString', ''])
      expect(resolvePublishPolicy({ registryKey, version: 1 })).toBeUndefined();
    for (const { definition } of templateDefinitions)
      expect(
        resolvePublishPolicy({
          registryKey: definition.registryKey,
          version: 999,
        }),
      ).toBeUndefined();
  });
  it.each([
    ['', 'A message', false],
    ['Juliet', '', false],
    [' \t\n', 'A message', false],
    ['Juliet', ' \t\n', false],
    [' Juliet ', ' A message ', true],
  ])(
    'checks recipient %j and message %j without modifying content',
    (recipientName, mainMessage, ready) => {
      const policy = policyFor(secretLetterTemplate.registryKey);
      const content = { recipientName, mainMessage, sections: [] };
      const original = structuredClone(content);
      expect(policy.acceptsContent(content)).toBe(ready);
      expect(policy.requiresOwnedJourney).toBe(false);
      expect(content).toEqual(original);
    },
  );
  it('requires journey lookup without treating compatibility letter fields as required content', () => {
    const policy = policyFor(chooseYourHeartTemplate.registryKey);
    expect(policy.requiresOwnedJourney).toBe(true);
    expect(
      policy.acceptsContent({
        recipientName: '',
        mainMessage: '',
        sections: [],
      }),
    ).toBe(true);
  });
});
