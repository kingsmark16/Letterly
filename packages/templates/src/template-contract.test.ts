import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
} from "@letterly/templates/choose-your-heart";
import {
  templateAudioCapabilitySchema,
  templateCapabilitySchema,
} from "@letterly/templates/capabilities";
import { templateDefinitions } from "@letterly/templates/catalog";
import {
  pageJourneyGraphSchema,
  validatePageJourneyGraph,
} from "@letterly/templates/journey";
import { resolveTemplate } from "@letterly/templates/registry";
import {
  secretLetterContentSchema,
  secretLetterTemplate,
} from "@letterly/templates/secret-letter";

type RegisteredTemplate = (typeof templateDefinitions)[number]["definition"];
type RegisteredTemplateKey = RegisteredTemplate["registryKey"];

type PayloadBoundary = {
  schema: { safeParse: (value: unknown) => { success: boolean } };
  valid: unknown;
  invalid: unknown;
};

type TemplateContractFixture = {
  definition: RegisteredTemplate;
  optionalContent: unknown;
  unsupportedContent: unknown;
  unsupportedSettings: unknown;
  longPayload: PayloadBoundary;
};

const maximumLetterContent = {
  ...secretLetterTemplate.defaultContent,
  recipientName: "Ari",
  mainMessage: "💌".repeat(20_000),
};

const overLimitLetterContent = {
  ...maximumLetterContent,
  mainMessage: "💌".repeat(20_001),
};

const maximumJourney = structuredClone(chooseYourHeartDefaultGraph);
const maximumJourneyRoot = maximumJourney.questions.at(0);
const maximumJourneyOutcome = maximumJourney.outcomes.at(0);
if (!maximumJourneyRoot || !maximumJourneyOutcome) {
  throw new Error(
    "Choose Your Heart contract fixture requires a root and outcome",
  );
}
maximumJourneyRoot.prompt = "q".repeat(200);
maximumJourneyOutcome.resultMessage = "r".repeat(2_000);

const overLimitJourney = structuredClone(maximumJourney);
const overLimitJourneyRoot = overLimitJourney.questions.at(0);
if (!overLimitJourneyRoot) {
  throw new Error(
    "Choose Your Heart contract fixture requires a root question",
  );
}
overLimitJourneyRoot.prompt = "q".repeat(201);

const templateContractFixtures = {
  [secretLetterTemplate.registryKey]: {
    definition: secretLetterTemplate,
    optionalContent: {
      recipientName: "Ari",
      mainMessage: "A note with no optional title or sign off.",
      sections: [],
    },
    unsupportedContent: null,
    unsupportedSettings: {
      ...secretLetterTemplate.defaultSettings,
      autoPlayMusic: "sometimes",
    },
    longPayload: {
      schema: secretLetterContentSchema,
      valid: maximumLetterContent,
      invalid: overLimitLetterContent,
    },
  },
  [chooseYourHeartTemplate.registryKey]: {
    definition: chooseYourHeartTemplate,
    optionalContent: {},
    unsupportedContent: null,
    unsupportedSettings: { responsesEnabled: "sometimes" },
    longPayload: {
      schema: pageJourneyGraphSchema,
      valid: maximumJourney,
      invalid: overLimitJourney,
    },
  },
} satisfies Record<RegisteredTemplateKey, TemplateContractFixture>;

test("the template contract matrix covers every canonical definition", () => {
  assert.deepEqual(
    Object.keys(templateContractFixtures).sort(),
    templateDefinitions.map(({ definition }) => definition.registryKey).sort(),
  );
});

for (const [registryKey, fixture] of Object.entries(templateContractFixtures)) {
  const { definition } = fixture;

  test(`${registryKey} defaults satisfy its registered schemas`, () => {
    assert.deepEqual(
      definition.contentSchema.parse(definition.defaultContent),
      definition.defaultContent,
    );
    assert.deepEqual(
      definition.settingsSchema.parse(definition.defaultSettings),
      definition.defaultSettings,
    );
  });

  test(`${registryKey} accepts omitted optional content and rejects unsupported input`, () => {
    assert.equal(
      definition.contentSchema.safeParse(fixture.optionalContent).success,
      true,
    );
    assert.equal(
      definition.contentSchema.safeParse(fixture.unsupportedContent).success,
      false,
    );
    assert.equal(
      definition.settingsSchema.safeParse(fixture.unsupportedSettings).success,
      false,
    );
  });

  test(`${registryKey} enforces its registered long content boundary`, () => {
    assert.equal(
      fixture.longPayload.schema.safeParse(fixture.longPayload.valid).success,
      true,
    );
    assert.equal(
      fixture.longPayload.schema.safeParse(fixture.longPayload.invalid).success,
      false,
    );

    if ("journey" in definition) {
      assert.equal(
        validatePageJourneyGraph(fixture.longPayload.valid).valid,
        true,
      );
      assert.equal(
        validatePageJourneyGraph(fixture.longPayload.invalid).valid,
        false,
      );
    }
  });

  test(`${registryKey} resolves only its exact registered version`, () => {
    assert.equal(
      resolveTemplate({
        registryKey: definition.registryKey,
        rendererKey: definition.renderer.key,
        version: definition.version,
      }),
      definition,
    );
    assert.equal(
      resolveTemplate({
        registryKey: definition.registryKey,
        rendererKey: definition.renderer.key,
        version: 0,
      }),
      undefined,
    );
  });

  test(`${registryKey} declares valid and internally consistent capabilities`, () => {
    const capabilities = definition.capabilities.map((capability) =>
      templateCapabilitySchema.parse(capability),
    );
    assert.equal(new Set(capabilities).size, capabilities.length);
    assert.equal(
      capabilities.includes("audio"),
      templateAudioCapabilitySchema.parse(definition.audioCapability) !==
        "hidden",
    );
    assert.equal(
      definition.questionRules?.required !== true ||
        capabilities.includes("questions"),
      true,
    );
    assert.ok(definition.response.visitorMessageMaxLength > 0);
    assert.ok(definition.response.textAnswerMaxLength > 0);
  });
}

test("unsupported capability values cannot enter trusted template metadata", () => {
  assert.equal(templateCapabilitySchema.safeParse("fileUpload").success, false);
  assert.equal(
    templateAudioCapabilitySchema.safeParse("automatic").success,
    false,
  );
});
