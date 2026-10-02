import { publicSecretLetterResponseSchema } from "@letterly/contracts/pages";

export const publicLetterFixtures = {
  "fixture-letter": publicSecretLetterResponseSchema.parse({
    displaySlug: "fixture-letter",
    canonicalUrl: "http://127.0.0.1:3100/p/fixture-letter",
    template: { key: "secret-letter", version: 1 },
    recipientName: "Fixture Reader",
    mainMessage: "These words belong to the published letter.",
    sections: [],
    images: [],
    response: { enabled: false },
  }),
  "fixture-letter-locked": publicSecretLetterResponseSchema.parse({
    state: "LOCKED",
    displaySlug: "fixture-letter-locked",
    canonicalUrl: "http://127.0.0.1:3100/p/fixture-letter-locked",
    template: { key: "secret-letter", version: 1 },
    recipientName: "Fixture Reader",
  }),
};
