import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
  secretLetterTemplate,
} from '@letterly/templates';
import { templateDefinitions } from '@letterly/templates/catalog';
import { resolvePublicProjectionAdapter } from './public-projection-adapters';
import type { PublicProjectionContext } from './public-projection';

type RegisteredTemplateKey =
  (typeof templateDefinitions)[number]['definition']['registryKey'];

const longLetter = '💌'.repeat(20_000);
const longQuestion = 'q'.repeat(200);
const longOutcomeMessage = 'r'.repeat(2_000);

const longJourney = structuredClone(chooseYourHeartDefaultGraph);
const longJourneyRoot = longJourney.questions.at(0);
const longJourneyOutcome = longJourney.outcomes.at(0);
if (!longJourneyRoot || !longJourneyOutcome) {
  throw new Error(
    'Choose Your Heart projection fixture requires a root and outcome',
  );
}
longJourneyRoot.prompt = longQuestion;
longJourneyOutcome.resultMessage = longOutcomeMessage;

function publishedJourney() {
  return {
    publishedRevision: {
      revisionNumber: 7,
      maxDepth: 1,
      rootQuestion: { key: longJourney.rootQuestionKey },
      questions: longJourney.questions.map((question) => ({
        key: question.key,
        prompt: question.prompt,
        displayOrder: question.displayOrder,
        choices: question.choices.map((choice) => ({
          key: choice.key,
          label: choice.label,
          displayOrder: choice.displayOrder,
          nextQuestion: choice.nextQuestionKey
            ? { key: choice.nextQuestionKey }
            : null,
          outcome: choice.outcomeKey ? { key: choice.outcomeKey } : null,
        })),
      })),
      outcomes: longJourney.outcomes,
    },
  };
}

const compatibilityContent = {
  recipientName: 'A public reader',
  mainMessage: 'A compatibility body required by the current page envelope.',
  sections: [],
};

const publicProjectionContexts = {
  [secretLetterTemplate.registryKey]: {
    page: {
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'long-letter',
      displaySlug: 'long-letter',
      content: {
        ...compatibilityContent,
        recipientName: 'Juliet',
        mainMessage: longLetter,
      },
      settings: secretLetterTemplate.defaultSettings,
      templateVersion: {
        registryKey: secretLetterTemplate.registryKey,
        version: secretLetterTemplate.version,
        template: { key: secretLetterTemplate.renderer.key },
      },
      pageJourney: null,
    },
    template: secretLetterTemplate,
    media: { images: [] },
  },
  [chooseYourHeartTemplate.registryKey]: {
    page: {
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'long-journey',
      displaySlug: 'long-journey',
      content: compatibilityContent,
      settings: chooseYourHeartTemplate.defaultSettings,
      templateVersion: {
        registryKey: chooseYourHeartTemplate.registryKey,
        version: chooseYourHeartTemplate.version,
        template: { key: chooseYourHeartTemplate.renderer.key },
      },
      pageJourney: publishedJourney(),
    },
    template: chooseYourHeartTemplate,
    media: { images: [] },
  },
} satisfies Record<RegisteredTemplateKey, PublicProjectionContext>;

describe('public persistence projection template contracts', () => {
  for (const [registryKey, context] of Object.entries(
    publicProjectionContexts,
  )) {
    it(`${registryKey} keeps the pinned identity and handles absent optional media`, () => {
      const adapter = resolvePublicProjectionAdapter(
        context.page.templateVersion,
      );
      expect(adapter).toBeDefined();
      if (!adapter)
        throw new Error(`Missing public projection for ${registryKey}`);

      const projection = adapter.project(context);

      expect(projection.template).toMatchObject({
        registryKey,
        version: context.page.templateVersion.version,
      });
      expect(projection.images).toEqual([]);
      expect(projection).not.toHaveProperty('audio');
      expect(projection).not.toHaveProperty('audioLink');
      expect(projection).not.toHaveProperty('settings');

      if ('mainMessage' in projection) {
        expect(projection.mainMessage).toBe(longLetter);
      } else {
        expect(projection.questions[0]?.prompt).toBe(longQuestion);
        expect(projection.outcomes[0]?.resultMessage).toBe(longOutcomeMessage);
      }
    });

    it(`${registryKey} removes private stored fields from its public body`, () => {
      const privateMarker = 'creator-only-private-marker';
      const content = context.page.content;
      const settings = context.page.settings;
      if (
        typeof content !== 'object' ||
        content === null ||
        Array.isArray(content) ||
        typeof settings !== 'object' ||
        settings === null ||
        Array.isArray(settings)
      ) {
        throw new Error(
          'Projection fixture content and settings must be objects',
        );
      }
      const privateContext: PublicProjectionContext = {
        ...context,
        page: {
          ...context.page,
          content: { ...content, creatorId: privateMarker },
          settings: {
            ...settings,
            passwordProtection: { ciphertext: privateMarker },
          },
        },
      };
      const adapter = resolvePublicProjectionAdapter(
        privateContext.page.templateVersion,
      );
      expect(adapter).toBeDefined();
      if (!adapter)
        throw new Error(`Missing public projection for ${registryKey}`);

      expect(JSON.stringify(adapter.project(privateContext))).not.toContain(
        privateMarker,
      );
    });

    it(`${registryKey} rejects malformed stored content`, () => {
      const adapter = resolvePublicProjectionAdapter(
        context.page.templateVersion,
      );
      expect(adapter).toBeDefined();
      if (!adapter)
        throw new Error(`Missing public projection for ${registryKey}`);

      expect(() =>
        adapter.project({
          ...context,
          page: { ...context.page, content: null },
        }),
      ).toThrow();
    });
  }

  it.each([
    { registryKey: 'unknown', version: 1 },
    { registryKey: secretLetterTemplate.registryKey, version: 0 },
    { registryKey: chooseYourHeartTemplate.registryKey, version: 0 },
  ])(
    'does not resolve unsupported identity $registryKey/$version',
    (identity) => {
      expect(resolvePublicProjectionAdapter(identity)).toBeUndefined();
    },
  );
});
