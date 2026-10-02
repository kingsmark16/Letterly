import { pageJourneyPublicPageProjectionSchema } from "@letterly/contracts/page-journeys";
import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
} from "@letterly/templates";

const graph = structuredClone(chooseYourHeartDefaultGraph);
const root = graph.questions[0];
if (!root) throw new Error("Journey fixture requires a root question");
root.choices[0]!.nextQuestionKey = "follow-up";
root.choices[0]!.outcomeKey = null;
graph.questions.push({
  key: "follow-up",
  prompt: "Which result would you like to share?",
  displayOrder: 1,
  choices: [
    {
      key: "warm",
      label: "Share the warm result",
      displayOrder: 0,
      nextQuestionKey: null,
      outcomeKey: "happy-result",
    },
    {
      key: "quiet",
      label: "Share the quiet result",
      displayOrder: 1,
      nextQuestionKey: null,
      outcomeKey: "quiet-result",
    },
  ],
});

function createFixture(slug: string, enabled: boolean) {
  return pageJourneyPublicPageProjectionSchema.parse({
    displaySlug: slug,
    canonicalUrl: `http://127.0.0.1:3100/p/${slug}`,
    template: {
      key: chooseYourHeartTemplate.renderer.key,
      version: chooseYourHeartTemplate.version,
    },
    publishedGraphVersion: 1,
    rootQuestionKey: graph.rootQuestionKey,
    maxDepth: 2,
    questions: graph.questions,
    outcomes: graph.outcomes,
    images: [],
    response: enabled
      ? {
          enabled: true,
          requiredAnswers: true,
          visitorMessageEnabled: true,
          ...chooseYourHeartTemplate.response,
        }
      : { enabled: false },
  });
}

export const publicJourneyFixtures = {
  "fixture-heart": createFixture("fixture-heart", true),
  "fixture-heart-disabled": createFixture("fixture-heart-disabled", false),
};
