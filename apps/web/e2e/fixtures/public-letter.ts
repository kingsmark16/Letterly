import { publicSecretLetterResponseSchema } from "@letterly/contracts/pages";

type FixtureMemory = {
  imageId: string;
  caption: string;
};

function createPublicLetterFixture(
  displaySlug: string,
  memories: readonly FixtureMemory[] = [],
) {
  return publicSecretLetterResponseSchema.parse({
    displaySlug,
    canonicalUrl: `http://127.0.0.1:3100/p/${displaySlug}`,
    template: {
      registryKey: "confession.secret-letter",
      key: "secret-letter",
      version: 1,
    },
    recipientName: "Fixture Reader",
    mainMessage: "These words belong to the published letter.",
    sections: [],
    images: memories.map((memory) => ({
      ...memory,
      mediaUrl: `/p/${displaySlug}/media/${memory.imageId}`,
    })),
    response: { enabled: false },
  });
}

export const publicLetterFixtures = {
  "fixture-letter": createPublicLetterFixture("fixture-letter"),
  "fixture-letter-gallery": createPublicLetterFixture(
    "fixture-letter-gallery",
    [
      {
        imageId: "40000000-0000-4000-8000-000000000001",
        caption: "First saved memory",
      },
      {
        imageId: "40000000-0000-4000-8000-000000000002",
        caption: "Second saved memory",
      },
    ],
  ),
  "fixture-letter-locked": publicSecretLetterResponseSchema.parse({
    state: "LOCKED",
    displaySlug: "fixture-letter-locked",
    canonicalUrl: "http://127.0.0.1:3100/p/fixture-letter-locked",
    template: {
      registryKey: "confession.secret-letter",
      key: "secret-letter",
      version: 1,
    },
    recipientName: "Fixture Reader",
  }),
};
