import {
  chooseYourHeartTemplate,
  chooseYourHeartDefaultGraph,
  secretLetterTemplate,
  templateRegistry,
} from '@letterly/templates';
import { templateDefinitions } from '@letterly/templates/catalog';
import { resolvePublicProjectionAdapter } from './public-projection-adapters';
import type {
  PublicProjectionAdapter,
  PublicProjectionContext,
} from './public-projection';

type RegisteredTemplateKey =
  (typeof templateDefinitions)[number]['definition']['registryKey'];

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

const publicTransportContexts = {
  [secretLetterTemplate.registryKey]: letter,
  [chooseYourHeartTemplate.registryKey]: journey,
} satisfies Record<RegisteredTemplateKey, PublicProjectionContext>;

type PublicProjectionResult = ReturnType<PublicProjectionAdapter['project']>;
type UnlockedPublicProjection = Extract<
  PublicProjectionResult,
  { images: unknown[] }
>;

function isUnlockedPublicProjection(
  result: PublicProjectionResult,
): result is UnlockedPublicProjection {
  return 'images' in result;
}

function project(context: PublicProjectionContext): UnlockedPublicProjection {
  const adapter = resolvePublicProjectionAdapter(context.template);
  if (!adapter) throw new Error('Missing test adapter');
  const result = adapter.project(context);
  if (!isUnlockedPublicProjection(result)) {
    throw new Error('Expected an unlocked public projection fixture');
  }
  return result;
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
    { registryKey: secretLetterTemplate.registryKey, version: 0 },
    { registryKey: 'confession.choose-your-heart', version: 0 },
  ])('rejects unsupported identity $registryKey/$version', (identity) => {
    expect(resolvePublicProjectionAdapter(identity)).toBeUndefined();
  });

  for (const [registryKey, context] of Object.entries(
    publicTransportContexts,
  )) {
    it(`${registryKey} keeps optional media absent and preserves its exact identity`, () => {
      const result = project(context);

      expect(result.template).toMatchObject({
        registryKey,
        version: context.template.version,
      });
      expect(result.images).toEqual([]);
      expect(result).not.toHaveProperty('audio');
      expect(result).not.toHaveProperty('audioLink');
    });

    it(`${registryKey} strips private fields from its public media projection`, () => {
      const privateMarker = 'private-media-storage-key';
      const definition = templateDefinitions.find(
        ({ definition: candidate }) => candidate.registryKey === registryKey,
      )?.definition;
      if (!definition) throw new Error(`Missing definition for ${registryKey}`);
      const image = {
        imageId: '11111111-1111-4111-8111-111111111111',
        mediaUrl:
          '/api/pages/letter/images/11111111-1111-4111-8111-111111111111',
        caption: null,
        storageKey: privateMarker,
        creatorId: privateMarker,
      };
      const audio = {
        mediaUrl: '/api/pages/letter/audio',
        title: 'Song',
        durationMilliseconds: 1000,
        storageKey: privateMarker,
        creatorId: privateMarker,
      };
      const result = project({
        ...context,
        page: { ...context.page, images: [image], audio },
      });

      expect(result.images).toEqual([
        {
          imageId: image.imageId,
          mediaUrl: image.mediaUrl,
          caption: null,
        },
      ]);
      if (definition.audioCapability === 'hidden') {
        expect(result.audio).toEqual({ mediaUrl: audio.mediaUrl });
      } else {
        expect(result.audio).toEqual({
          mediaUrl: audio.mediaUrl,
          title: audio.title,
          durationMilliseconds: audio.durationMilliseconds,
        });
      }
      expect(JSON.stringify(result)).not.toContain(privateMarker);
    });
  }

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
});
