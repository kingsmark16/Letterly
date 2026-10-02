import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
  secretLetterTemplate,
} from '@letterly/templates';
import { templateDefinitions } from '@letterly/templates/catalog';
import { resolveDraftPolicy } from './draft-policies';

function policyFor(registryKey: string, version = 1) {
  const policy = resolveDraftPolicy({ registryKey, version });
  if (!policy) throw new Error('Expected registered draft policy');
  return policy;
}

describe('registered template draft policies', () => {
  it('covers trusted definitions and rejects unknown or mismatched versions', () => {
    for (const { definition } of templateDefinitions)
      expect(resolveDraftPolicy(definition)).toBeDefined();
    for (const registryKey of ['unknown', '__proto__', 'toString', ''])
      expect(resolveDraftPolicy({ registryKey, version: 1 })).toBeUndefined();
    expect(
      resolveDraftPolicy({
        registryKey: secretLetterTemplate.registryKey,
        version: 999,
      }),
    ).toBeUndefined();
  });
  it('preserves Secret Letter defaults, overrides, and schema limits', () => {
    const policy = policyFor(secretLetterTemplate.registryKey);
    expect(policy.initialize({})).toEqual({
      content: secretLetterTemplate.defaultContent,
      settings: secretLetterTemplate.defaultSettings,
    });
    expect(
      policy.initialize({
        title: 'Our story',
        recipientName: 'Juliet',
        mainMessage: 'A personal note.',
        creatorName: 'Romeo',
      }).content,
    ).toEqual({
      title: 'Our story',
      recipientName: 'Juliet',
      mainMessage: 'A personal note.',
      creatorName: 'Romeo',
      sections: [],
    });
    expect(() => policy.initialize({ title: 'x'.repeat(121) })).toThrow();
  });
  it('keeps the journey compatibility envelope and validated graph', () => {
    const result = policyFor(chooseYourHeartTemplate.registryKey).initialize({
      title: 'Ignored',
      recipientName: 'Ignored',
      mainMessage: 'Ignored',
    });
    expect(result.content).toEqual({
      recipientName: '',
      mainMessage: '',
      sections: [],
    });
    expect(result.settings.responsesEnabled).toBe(false);
    expect(result.journeyValidation).toMatchObject({
      valid: true,
      graph: chooseYourHeartDefaultGraph,
      maxDepth: 1,
      issues: [],
    });
  });
  it('returns independent drafts so edits cannot mutate trusted defaults', () => {
    for (const { definition } of templateDefinitions) {
      const policy = policyFor(definition.registryKey, definition.version);
      const first = policy.initialize({});
      const second = policy.initialize({});
      first.content.recipientName = 'Changed';
      first.settings.responsesEnabled = true;
      if (first.journeyValidation?.graph)
        first.journeyValidation.graph.rootQuestionKey = 'changed';
      expect(second).toEqual(policy.initialize({}));
      expect(second.content.recipientName).toBe('');
    }
  });
});
