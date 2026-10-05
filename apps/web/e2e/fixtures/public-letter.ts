import { publicSecretLetterResponseSchema } from "@letterly/contracts/pages";

type FixtureMemory = {
  imageId: string;
  caption: string;
};

const paginatedMessage = Array.from(
  { length: 60 },
  (_, index) =>
    `Memory ${index + 1} stays close whenever I remember how ordinary days became a story worth keeping.`,
).join(" ");

function createPublicLetterFixture(
  displaySlug: string,
  memories: readonly FixtureMemory[] = [],
  mainMessage = "These words belong to the published letter.",
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
    mainMessage,
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
  "fixture-letter-youtube": publicSecretLetterResponseSchema.parse({
    ...createPublicLetterFixture("fixture-letter-youtube"),
    audioLink: {
      id: "50000000-0000-4000-8000-000000000001",
      provider: "YOUTUBE",
      videoId: "dQw4w9WgXcQ",
      displayTitle: "Fixture YouTube song",
      durationSeconds: 180,
      metadataExpiresAt: null,
    },
  }),
  "fixture-letter-paginated": createPublicLetterFixture(
    "fixture-letter-paginated",
    [],
    paginatedMessage,
  ),
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
