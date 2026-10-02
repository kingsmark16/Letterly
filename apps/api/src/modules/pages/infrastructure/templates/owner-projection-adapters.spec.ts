import {
  secretLetterPrivateSettingsSchema,
  templateRegistry,
} from '@letterly/templates';
import { resolveOwnerProjectionAdapter } from './owner-projection-adapters';

const content = {
  title: '  For Juliet  ',
  recipientName: '  Juliet  ',
  mainMessage: 'Private body',
  sections: [],
};
const privateSettings = secretLetterPrivateSettingsSchema.parse({
  theme: 'romantic',
  fontStyle: 'handwritten',
  autoPlayMusic: false,
  music: null,
  responsesEnabled: true,
  passwordProtection: {
    ciphertext: 'private-ciphertext',
    iv: 'private-iv',
    authTag: 'private-tag',
    keyVersion: 'private-key',
    passwordVersion: 'private-version',
  },
});

function adapterFor(registryKey: string) {
  const adapter = resolveOwnerProjectionAdapter({ registryKey, version: 1 });
  if (!adapter) throw new Error('Missing test adapter');
  return adapter;
}

describe('owner persistence projection adapters', () => {
  it.each(Object.values(templateRegistry))(
    'covers trusted template $registryKey',
    (template) => {
      expect(resolveOwnerProjectionAdapter(template)).toBeDefined();
    },
  );

  it.each([
    { registryKey: 'unknown', version: 1 },
    { registryKey: 'confession.secret-letter', version: 2 },
    { registryKey: 'confession.choose-your-heart', version: 0 },
  ])('rejects unsupported $registryKey/$version', (identity) => {
    expect(resolveOwnerProjectionAdapter(identity)).toBeUndefined();
  });

  it.each(['confession.secret-letter', 'confession.choose-your-heart'])(
    'strips encrypted settings and content extras for %s',
    (registryKey) => {
      const projection = adapterFor(registryKey).project({
        content: { ...content, storageKey: 'private-source' },
        privateSettings,
      });
      expect(projection.content.mainMessage).toBe('Private body');
      expect(projection.content).not.toHaveProperty('storageKey');
      expect(projection.settings).not.toHaveProperty('passwordProtection');
      expect(JSON.stringify(projection.settings)).not.toContain('private-');
      if (registryKey === 'confession.choose-your-heart') {
        expect(projection.settings.responsesEnabled).toBe(true);
      } else {
        expect(projection.settings).not.toHaveProperty('responsesEnabled');
      }
    },
  );

  it('keeps trimmed letter previews and omits message content', () => {
    expect(
      adapterFor('confession.secret-letter').summarize({ content }),
    ).toEqual({
      recipientLabel: 'Juliet',
      preview: { title: 'For Juliet' },
    });
    expect(
      adapterFor('confession.secret-letter').summarize({
        content: { ...content, recipientName: '', title: '' },
      }),
    ).toEqual({ recipientLabel: 'Untitled letter', preview: {} });
  });

  it('copies only draft question preview fields in their supplied order', () => {
    const choices = [
      {
        key: 'second',
        label: 'First selected choice',
        privateAnswer: 'secret',
      },
      {
        key: 'first',
        label: 'Second selected choice',
        privateAnswer: 'secret',
      },
    ];
    const summary = adapterFor('confession.choose-your-heart').summarize({
      content,
      firstQuestion: {
        prompt: 'Draft question',
        choices,
      },
    });
    expect(summary).toEqual({
      recipientLabel: 'Juliet',
      preview: {
        firstQuestion: {
          prompt: 'Draft question',
          choices: [
            { key: 'second', label: 'First selected choice' },
            { key: 'first', label: 'Second selected choice' },
          ],
        },
      },
    });
    expect(JSON.stringify(summary)).not.toContain('Private body');
    expect(JSON.stringify(summary)).not.toContain('privateAnswer');
  });

  it('omits the journey preview when no draft root question was selected', () => {
    expect(
      adapterFor('confession.choose-your-heart').summarize({
        content: { ...content, recipientName: '' },
      }),
    ).toEqual({ recipientLabel: 'Untitled letter' });
  });

  it.each(['confession.secret-letter', 'confession.choose-your-heart'])(
    'rejects malformed compatibility content for %s',
    (registryKey) => {
      expect(() =>
        adapterFor(registryKey).project({
          content: { recipientName: 42 },
          privateSettings,
        }),
      ).toThrow();
    },
  );
});
