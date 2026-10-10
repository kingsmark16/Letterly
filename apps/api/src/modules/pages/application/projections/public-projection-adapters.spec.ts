import {
  chooseYourHeartDefaultGraph,
  templateRegistry,
} from '@letterly/templates';
import { resolvePublicProjectionAdapter } from './public-projection-adapters';
import type { PublicProjectionContext } from './public-projection';

const letter = {
  canonicalUrl: 'https://letterly.example/p/letter',
  template: {
    registryKey: 'confession.secret-letter',
    key: 'secret-letter',
    version: 1,
  },
  page: {
    displaySlug: 'letter',
    canonicalSlug: 'letter',
    template: { key: 'secret-letter', version: 1 },
    recipientName: 'Juliet',
    mainMessage: 'A public message.',
  },
} satisfies PublicProjectionContext;
const journey = {
  ...letter,
  template: {
    registryKey: 'confession.choose-your-heart',
    key: 'choose-your-heart',
    version: 1,
  },
  page: {
    displaySlug: 'letter',
    canonicalSlug: 'letter',
    template: { key: 'choose-your-heart', version: 1 },
    publishedGraphVersion: 3,
    rootQuestionKey: chooseYourHeartDefaultGraph.rootQuestionKey,
    maxDepth: 1,
    questions: chooseYourHeartDefaultGraph.questions.map((question) => ({
      ...question,
      choices: question.choices.map((choice) => ({
        ...choice,
        nextQuestionKey: choice.nextQuestionKey ?? null,
        outcomeKey: choice.outcomeKey ?? null,
      })),
    })),
    outcomes: chooseYourHeartDefaultGraph.outcomes,
  },
} satisfies PublicProjectionContext;

function project(context: PublicProjectionContext) {
  const adapter = resolvePublicProjectionAdapter(context.template);
  if (!adapter) throw new Error('Missing test adapter');
  return adapter.project(context);
}

describe('public transport projection adapters', () => {
  it.each(Object.values(templateRegistry))(
    'covers trusted template $registryKey',
    (template) => {
      expect(resolvePublicProjectionAdapter(template)).toBeDefined();
    },
  );

  it.each([
    { registryKey: 'unknown', version: 1 },
    { registryKey: 'confession.secret-letter', version: 2 },
    { registryKey: 'confession.choose-your-heart', version: 0 },
  ])('rejects unsupported identity $registryKey/$version', (identity) => {
    expect(resolvePublicProjectionAdapter(identity)).toBeUndefined();
  });

  it('validates legacy letters while preserving response omission and defaults', () => {
    expect(project(letter)).toEqual({
      displaySlug: 'letter',
      canonicalUrl: letter.canonicalUrl,
      template: letter.template,
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });
    expect(
      project({
        ...letter,
        page: { ...letter.page, response: { enabled: false } },
      }),
    ).toHaveProperty('response', { enabled: false });
  });

  it('projects the published journey and disabled response default', () => {
    expect(project(journey)).toMatchObject({
      template: journey.template,
      publishedGraphVersion: 3,
      rootQuestionKey: chooseYourHeartDefaultGraph.rootQuestionKey,
      questions: journey.page.questions,
      outcomes: journey.page.outcomes,
      response: { enabled: false },
    });
  });

  it.each([letter, journey])('rejects the other template body', (context) => {
    const other = context === letter ? journey : letter;
    expect(() => project({ ...context, page: other.page })).toThrow();
  });

  it('rejects malformed legacy content instead of bypassing validation', () => {
    expect(() =>
      project({ ...letter, page: { ...letter.page, mainMessage: '' } }),
    ).toThrow();
  });

  it('strips private fields nested in media', () => {
    const audio = {
      mediaUrl: '/api/pages/letter/audio',
      title: 'Song',
      durationMilliseconds: 1000,
      storageKey: 'private-source',
      creatorId: 'private-creator',
    };
    const result = project({ ...letter, page: { ...letter.page, audio } });
    expect(result).toHaveProperty('audio', {
      mediaUrl: audio.mediaUrl,
      title: audio.title,
      durationMilliseconds: 1000,
    });
    expect(JSON.stringify(result)).not.toContain('private-');
  });
});
