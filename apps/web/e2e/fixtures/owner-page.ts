export const pageId = "11111111-1111-4111-8111-111111111111";
export const templateVersionId = "22222222-2222-4222-8222-222222222222";

export const session = {
  session: {
    id: "draft-session",
    userId: "draft-creator",
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
  user: {
    id: "draft-creator",
    name: "Draft Creator",
    email: "draft@example.com",
    emailVerified: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
};

export function ownerPage(
  contentVersion: number,
  recipientName: string,
  mainMessage: string,
  updatedAt: string,
) {
  return {
    id: pageId,
    slug: "draft-test",
    canonicalUrl: null,
    passwordProtected: false,
    recipientLabel: recipientName.trim() || "Untitled letter",
    status: "DRAFT",
    contentVersion,
    content: {
      recipientName,
      mainMessage,
      sections: [],
    },
    settings: {
      theme: "romantic",
      fontStyle: "handwritten",
      autoPlayMusic: false,
      music: null,
      responsesEnabled: false,
    },
    template: {
      id: "33333333-3333-4333-8333-333333333333",
      key: "secret-letter",
      name: "Secret Letter",
      templateVersionId,
      version: 1,
      registryKey: "confession.secret-letter",
    },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt,
    images: [],
  };
}
