import { expect } from "@playwright/test";

export const editorPageId = "11111111-1111-4111-8111-111111111111";

export const editorImageId = "22222222-2222-4222-8222-222222222222";

export const editorAudioId = "88888888-8888-4888-8888-888888888888";

export const secondEditorImageId = "77777777-7777-4777-8777-777777777777";

export const templateVersionId = "33333333-3333-4333-8333-333333333333";

export const questionId = "44444444-4444-4444-8444-444444444444";

export const choiceOneId = "55555555-5555-4555-8555-555555555555";

export const choiceTwoId = "66666666-6666-4666-8666-666666666666";

export const tinyWebp = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==",
  "base64",
);

export type MockOwnerPage = {
  id: string;
  slug: string;
  canonicalUrl: string | null;
  passwordProtected: boolean;
  recipientLabel: string;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  contentVersion: number;
  content: {
    recipientName: string;
    mainMessage: string;
    creatorName?: string;
    sections: [];
  };
  settings: {
    theme: string;
    fontStyle: string;
    autoPlayMusic: false;
    music: null;
  };
  template: {
    id: string;
    key: string;
    name: string;
    templateVersionId: string;
    version: number;
    registryKey: string;
  };
  createdAt: string;
  updatedAt: string;
  images: Array<{
    imageId: string;
    state: "READY";
    attached: true;
    sortOrder: number;
    mediaUrl: string;
    caption: string | null;
    failureCode: null;
    expiresAt: null;
  }>;
  audio?: {
    audioId: string;
    state: "READY";
    mediaUrl: string;
    title: string;
    sourceMimeType: "audio/mpeg" | "audio/mp4";
    sourceByteSize: number;
    durationMilliseconds: number | null;
    failureCode: null;
  };
};

export function ownerPage(
  contentVersion = 1,
  caption = "A saved memory",
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" = "DRAFT",
  content: {
    recipientName: string;
    mainMessage: string;
    creatorName?: string;
  } = {
    recipientName: "Alex",
    mainMessage: "A letter that keeps its memories.",
  },
  audio?: MockOwnerPage["audio"],
): MockOwnerPage {
  return {
    id: editorPageId,
    slug: "mock-letter",
    canonicalUrl:
      status === "PUBLISHED" ? "http://127.0.0.1:3100/p/mock-letter" : null,
    passwordProtected: false,
    recipientLabel: "For Alex",
    status,
    contentVersion,
    content: {
      recipientName: content.recipientName,
      mainMessage: content.mainMessage,
      creatorName: content.creatorName,
      sections: [],
    },
    settings: {
      theme: "classic",
      fontStyle: "serif",
      autoPlayMusic: false,
      music: null,
    },
    template: {
      id: templateVersionId,
      key: "secret-letter",
      name: "Secret Letter",
      templateVersionId,
      version: 1,
      registryKey: "secret-letter",
    },
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T01:00:00.000Z",
    images: [
      {
        imageId: editorImageId,
        state: "READY",
        attached: true,
        sortOrder: 0,
        mediaUrl: `/api/v1/pages/${editorPageId}/images/${editorImageId}`,
        caption,
        failureCode: null,
        expiresAt: null,
      },
    ],
    ...(audio ? { audio } : {}),
  };
}

export function ownerPageWithAudio(): MockOwnerPage {
  return ownerPage(1, "A saved memory", "DRAFT", undefined, {
    audioId: editorAudioId,
    state: "READY",
    mediaUrl: `/api/v1/pages/${editorPageId}/audio`,
    title: "Our song",
    sourceMimeType: "audio/mpeg",
    sourceByteSize: 3,
    durationMilliseconds: 180_000,
    failureCode: null,
  });
}

export function ownerPageWithImages(
  contentVersion = 1,
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" = "DRAFT",
): MockOwnerPage {
  const page = ownerPage(contentVersion, "A saved memory", status);
  const firstImage = page.images[0];

  if (!firstImage) return page;

  return {
    ...page,
    images: [
      firstImage,
      {
        ...firstImage,
        imageId: secondEditorImageId,
        sortOrder: 1,
        mediaUrl: `/api/v1/pages/${editorPageId}/images/${secondEditorImageId}`,
        caption: "Another saved memory",
      },
    ],
  };
}

export function chooseYourHeartOwnerPage(): MockOwnerPage {
  const page = ownerPage();
  return {
    ...page,
    content: { recipientName: "", mainMessage: "", sections: [] },
    template: {
      ...page.template,
      key: "choose-your-heart",
      name: "Choose Your Heart",
      registryKey: "confession.choose-your-heart",
    },
  };
}

export const starterJourneyGraph = {
  schemaVersion: 1 as const,
  rootQuestionKey: "root",
  questions: [
    {
      key: "root",
      prompt: "What do you remember?",
      displayOrder: 0,
      choices: [
        {
          key: "happy",
          label: "The happy moments",
          displayOrder: 0,
          nextQuestionKey: null,
          outcomeKey: "happy-result",
        },
        {
          key: "quiet",
          label: "The quiet moments",
          displayOrder: 1,
          nextQuestionKey: null,
          outcomeKey: "quiet-result",
        },
      ],
    },
  ],
  outcomes: [
    {
      key: "happy-result",
      title: "A heart full of warmth",
      resultMessage: "You hold close the moments that made you smile.",
      displayOrder: 0,
    },
    {
      key: "quiet-result",
      title: "A heart at peace",
      resultMessage: "You remember the gentle moments that needed no words.",
      displayOrder: 1,
    },
  ],
};

export function journeyOwnerResponse(
  graph = starterJourneyGraph,
  contentVersion = 1,
) {
  return {
    draft: { ...graph, revisionNumber: 1 },
    publishedGraphVersion: null,
    contentVersion,
    validation: { valid: true, issues: [] },
  };
}

export async function mockOwnerImage(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route(
    `**/api/v1/pages/${editorPageId}/images/${editorImageId}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/webp",
        headers: { "Cache-Control": "no-store" },
        body: tinyWebp,
      });
    },
  );
}

export function editorImage(page: import("@playwright/test").Page) {
  return page.getByRole("list", { name: "Letter images" }).locator("img");
}

export async function openContentWorkspace(
  page: import("@playwright/test").Page,
  workspace: "Memories" | "Music" | "Questions",
): Promise<void> {
  const tab = page.getByRole("tab", { name: workspace, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}
