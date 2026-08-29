import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import QRCode from "qrcode";
import { getTrustedVisitorAddress } from "../src/lib/visitor-identity";
import {
  updatePageQuestionRequestSchema,
  type PageQuestion,
} from "@letterly/contracts/questions";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const publishedSlug = process.env.PUBLIC_TEST_SLUG;
// eslint-disable-next-line turbo/no-undeclared-env-vars
const protectedJourneySlug = process.env.PUBLIC_CH_PROTECTED_SLUG;
// eslint-disable-next-line turbo/no-undeclared-env-vars
const publicJourneySlug = process.env.PUBLIC_CH_PUBLIC_SLUG;

const editorPageId = "11111111-1111-4111-8111-111111111111";
const editorImageId = "22222222-2222-4222-8222-222222222222";
const secondEditorImageId = "77777777-7777-4777-8777-777777777777";
const templateVersionId = "33333333-3333-4333-8333-333333333333";
const questionId = "44444444-4444-4444-8444-444444444444";
const choiceOneId = "55555555-5555-4555-8555-555555555555";
const choiceTwoId = "66666666-6666-4666-8666-666666666666";
const tinyWebp = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==",
  "base64",
);

test.describe("public visitor identity", () => {
  test("AC-10 ignores spoofed addresses before the trusted proxy boundary", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.9, 203.0.113.24",
    });

    expect(getTrustedVisitorAddress(headers, 1)).toBe("203.0.113.24");
  });

  test("AC-10 ignores forwarding headers when no proxy is trusted", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.9",
      "x-real-ip": "198.51.100.10",
    });

    expect(getTrustedVisitorAddress(headers, 0)).toBe("unknown");
  });

  test("AC-10 ignores X-Real-IP outside the trusted forwarding chain", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.10",
    });

    expect(getTrustedVisitorAddress(headers, 1)).toBe("unknown");
  });
});

type MockOwnerPage = {
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
};

function ownerPage(
  contentVersion = 1,
  caption = "A saved memory",
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" = "DRAFT",
  content: { recipientName: string; mainMessage: string } = {
    recipientName: "Alex",
    mainMessage: "A letter that keeps its memories.",
  },
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
  };
}

function ownerPageWithImages(
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

function chooseYourHeartOwnerPage(): MockOwnerPage {
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

const starterJourneyGraph = {
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

function journeyOwnerResponse(graph = starterJourneyGraph, contentVersion = 1) {
  return {
    draft: { ...graph, revisionNumber: 1 },
    publishedGraphVersion: null,
    contentVersion,
    validation: { valid: true, issues: [] },
  };
}

async function mockOwnerImage(
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

function editorImage(page: import("@playwright/test").Page) {
  return page.getByRole("list", { name: "Letter images" }).locator("img");
}

test.describe("Secret Letter image editor persistence", () => {
  test("AC-7 restores a saved attached image when the editor opens", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);

    await expect(page.getByLabel("Caption")).toHaveValue("A saved memory");
    await expect(page.getByText("Included in this letter")).toHaveCount(0);
    await expect(editorImage(page)).toBeVisible();
    await expect
      .poll(() =>
        editorImage(page).evaluate(
          (image: HTMLImageElement) => image.naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  });

  test("published letters require unpublishing before image edits", async ({
    page,
  }) => {
    let ownerReads = 0;
    let didUnpublish = false;
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      await route.fulfill({
        status: 200,
        json: ownerPage(
          1,
          "A saved memory",
          didUnpublish ? "UNPUBLISHED" : "PUBLISHED",
        ),
      });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/unpublish`,
      async (route) => {
        didUnpublish = true;
        await route.fulfill({
          status: 200,
          json: {
            pageId: editorPageId,
            status: "UNPUBLISHED",
            slug: "mock-letter",
            publicUrl: "http://127.0.0.1:3100/p/mock-letter",
            publishedAt: null,
            unpublishedAt: "2026-08-14T02:00:00.000Z",
            contentVersion: 1,
            updatedAt: "2026-08-14T02:00:00.000Z",
          },
        });
      },
    );
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await expect(page.getByLabel("Caption")).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("Caption")).toHaveValue("A saved memory");

    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect.poll(() => ownerReads).toBeGreaterThan(1);

    await expect(page.getByLabel("Caption")).not.toHaveAttribute("readonly");
    await page.getByLabel("Caption").fill("An unsaved local caption");
    await expect(page.getByLabel("Caption")).toHaveValue(
      "An unsaved local caption",
    );
    await expect(editorImage(page)).toBeVisible();
  });

  test("AC-4 saves the image identity, order, and trimmed caption", async ({
    page,
  }) => {
    let savedRequest: unknown;
    let currentPage = ownerPage();
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        savedRequest = route.request().postDataJSON();
        currentPage = ownerPage(2, "Remember this day");
      }
      await route.fulfill({ status: 200, json: currentPage });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByLabel("Caption").fill("  Remember this day  ");

    await expect(page.getByRole("status").first()).toContainText(
      "Saved as version 2.",
    );
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 1,
      recipientName: "Alex",
      mainMessage: "A letter that keeps its memories.",
      images: [
        {
          imageId: editorImageId,
          sortOrder: 0,
          caption: "Remember this day",
        },
      ],
    });
    await expect(page.getByLabel("Caption")).toHaveValue("Remember this day");
    await expect(editorImage(page)).toBeVisible();
  });

  test("AC-4 reorders image cards with drag and drop", async ({
    page,
  }, testInfo) => {
    testInfo.skip(
      testInfo.project.name === "mobile",
      "Native HTML drag and drop is not available in touch emulation.",
    );

    let savedRequest: Record<string, unknown> | null = null;
    let currentPage = ownerPageWithImages();

    await mockOwnerImage(page);
    await page.route(
      `**/api/v1/pages/${editorPageId}/images/${secondEditorImageId}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "image/webp",
          headers: { "Cache-Control": "no-store" },
          body: tinyWebp,
        });
      },
    );
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        savedRequest = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        currentPage = ownerPageWithImages(2);
      }
      await route.fulfill({ status: 200, json: currentPage });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);

    const cards = page.locator('li[draggable="true"]');
    await expect(cards).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Move earlier" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Move later" })).toHaveCount(
      0,
    );
    await cards.nth(0).dragTo(cards.nth(1));

    await expect(page.getByRole("status").first()).toContainText(
      "Saved as version 2.",
    );
    expect(savedRequest).toMatchObject({
      images: [
        { imageId: secondEditorImageId, sortOrder: 0 },
        { imageId: editorImageId, sortOrder: 1 },
      ],
    });
  });

  test("AC-4 warns before reload when only media has unsaved changes", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByLabel("Caption").fill("An unsaved caption");
    await expect(
      page.getByText("Save your current changes before publishing."),
    ).toBeVisible();

    const warningRequested = await page.evaluate(() => {
      const event = new Event("beforeunload", {
        cancelable: true,
      }) as BeforeUnloadEvent;
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(warningRequested).toBe(true);
  });

  test("AC-17 preserves unsaved letter fields while a question is saved", async ({
    page,
  }) => {
    let ownerReads = 0;
    let createdQuestionRequest: Record<string, unknown> | null = null;
    let savedContent = {
      recipientName: "Alex",
      mainMessage: "A letter that keeps its memories.",
    };
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as {
          recipientName: string;
          mainMessage: string;
        };
        savedContent = body;
      }
      await route.fulfill({
        status: 200,
        json: ownerPage(
          ownerReads > 1 ? 2 : 1,
          "A saved memory",
          "DRAFT",
          savedContent,
        ),
      });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, json: [] });
          return;
        }

        createdQuestionRequest = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        await route.fulfill({
          status: 201,
          json: {
            question: {
              id: questionId,
              pageId: editorPageId,
              key: "memory",
              type: "CHOICE",
              prompt: "What do you remember?",
              displayOrder: 0,
              config: null,
              endsJourney: false,
              nextQuestionId: null,
              choices: [
                {
                  id: choiceOneId,
                  key: "choice-one",
                  label: "The beginning",
                  displayOrder: 0,
                  creatorMessage: null,
                  endsJourney: false,
                  nextQuestionId: null,
                },
                {
                  id: choiceTwoId,
                  key: "choice-two",
                  label: "The middle",
                  displayOrder: 1,
                  creatorMessage: null,
                  endsJourney: false,
                  nextQuestionId: null,
                },
              ],
            },
            contentVersion: 2,
          },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("button", { name: "Add your first question" }).click();
    await page.getByLabel("Who is this letter for?").fill("Unsent recipient");
    await page.getByLabel("Your message").fill("Unsent message");
    await page
      .getByRole("textbox", { name: /What should visitors answer/ })
      .fill("What do you remember?");
    await page.getByLabel("Answer 1 label").fill("The beginning");
    await page.getByLabel("Answer 2 label").fill("The middle");

    await page.getByRole("button", { name: "Add question" }).click();
    await expect(
      page.getByText(
        "First question added. It will appear first in the letter.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    expect(createdQuestionRequest).not.toBeNull();
    const createdRequest = createdQuestionRequest as unknown as Record<
      string,
      unknown
    >;
    expect(createdRequest).not.toHaveProperty("key");
    expect(createdRequest.displayOrder).toBeUndefined();
    await expect.poll(() => ownerReads).toBeGreaterThan(1);

    await expect(page.getByLabel("Who is this letter for?")).toHaveValue(
      "Unsent recipient",
    );
    await expect(page.getByLabel("Your message")).toHaveValue("Unsent message");
    await expect(
      page.getByRole("checkbox", { name: "Allow private responses" }),
    ).toHaveCount(0);
  });

  test("AC-9 keeps question edits and recovers a stale save version", async ({
    page,
  }) => {
    const currentQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      key: "first-question",
      type: "PLAIN_MESSAGE",
      prompt: "What do you remember?",
      displayOrder: 0,
      config: null,
      endsJourney: false,
      nextQuestionId: null,
      choices: [],
    };
    let saveAttempts = 0;

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: [currentQuestion] });
          return;
        }
        saveAttempts += 1;
        if (saveAttempts === 1) {
          await route.fulfill({
            status: 409,
            json: {
              statusCode: 409,
              code: "STALE_VERSION",
              message: "This page changed elsewhere",
              requestId: "77777777-7777-4777-8777-777777777777",
              details: { currentContentVersion: 2 },
            },
          });
          return;
        }
        await route.fulfill({
          status: 200,
          json: {
            question: { ...currentQuestion, prompt: "A new memory?" },
            contentVersion: 3,
          },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const questionCard = questionList.locator(":scope > li").first();
    await questionCard.locator("summary").click();
    await questionCard.getByRole("button", { name: "Edit" }).click();
    await page
      .getByRole("textbox", { name: /What should visitors answer/ })
      .fill("A new memory?");
    await page.getByRole("button", { name: "Save question" }).click();

    await expect(page.getByText("Your edits are still here")).toBeVisible();
    await page.getByRole("button", { name: "Retry save" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Question saved." }),
    ).toBeVisible();
    expect(saveAttempts).toBe(2);
  });

  test("AC-9 allocates a fresh answer key after removing a middle answer", async ({
    page,
  }) => {
    const currentQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      key: "first-question",
      type: "CHOICE",
      prompt: "What do you remember?",
      displayOrder: 0,
      config: null,
      endsJourney: false,
      nextQuestionId: null,
      choices: [
        {
          id: choiceOneId,
          key: "choice-1",
          label: "The beginning",
          displayOrder: 0,
          creatorMessage: null,
          endsJourney: false,
          nextQuestionId: null,
        },
        {
          id: choiceTwoId,
          key: "choice-2",
          label: "The middle",
          displayOrder: 1,
          creatorMessage: null,
          endsJourney: false,
          nextQuestionId: null,
        },
        {
          id: "88888888-8888-4888-8888-888888888888",
          key: "choice-3",
          label: "The end",
          displayOrder: 2,
          creatorMessage: null,
          endsJourney: false,
          nextQuestionId: null,
        },
      ],
    };
    let savedKeys: string[] = [];

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: [currentQuestion] });
          return;
        }
        const payload = updatePageQuestionRequestSchema.parse(
          request.postDataJSON(),
        );
        savedKeys = (payload.choices ?? []).map((choice) => choice.key);
        await route.fulfill({
          status: 200,
          json: { question: currentQuestion, contentVersion: 2 },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const questionCard = questionList.locator(":scope > li").first();
    await questionCard.locator("summary").click();
    await questionCard.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Remove answer 2" }).click();
    await page.getByRole("button", { name: "Add another choice" }).click();
    await page.getByLabel("Answer 3 label").fill("The replacement");
    await page.getByRole("button", { name: "Save question" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Question saved." }),
    ).toBeVisible();
    expect(savedKeys).toHaveLength(3);
    expect(new Set(savedKeys).size).toBe(3);
  });

  test("AC-3 and AC-4 reorder questions with the drag handle", async ({
    page,
  }) => {
    const firstQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      key: "first-question",
      type: "CHOICE" as const,
      prompt: "What do you remember?",
      displayOrder: 0,
      config: null,
      endsJourney: false,
      nextQuestionId: null,
      choices: [
        {
          id: choiceOneId,
          key: "happy",
          label: "The happy moments",
          displayOrder: 0,
          creatorMessage: null,
          endsJourney: false,
          nextQuestionId: null,
        },
        {
          id: choiceTwoId,
          key: "quiet",
          label: "The quiet moments",
          displayOrder: 1,
          creatorMessage: null,
          endsJourney: false,
          nextQuestionId: null,
        },
      ],
    };
    const secondQuestion: PageQuestion = {
      id: "77777777-7777-4777-8777-777777777777",
      pageId: editorPageId,
      key: "second-question",
      type: "PLAIN_MESSAGE",
      prompt: "Tell me more",
      displayOrder: 1,
      config: null,
      endsJourney: false,
      nextQuestionId: null,
      choices: [],
    };
    let currentQuestions = [firstQuestion, secondQuestion];
    let currentVersion = 1;
    let savedRequest: Record<string, unknown> | null = null;

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(currentVersion) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: currentQuestions });
          return;
        }
        savedRequest = request.postDataJSON() as Record<string, unknown>;
        const payload = savedRequest as {
          questionIds?: string[];
          expectedContentVersion?: number;
        };
        currentQuestions = [secondQuestion, firstQuestion].map(
          (question, displayOrder) => ({ ...question, displayOrder }),
        );
        currentVersion = (payload.expectedContentVersion ?? 1) + 1;
        await route.fulfill({
          status: 200,
          json: {
            questionIds: payload.questionIds,
            contentVersion: currentVersion,
          },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const firstCard = questionList.locator(":scope > li").nth(0);
    const secondCard = questionList.locator(":scope > li").nth(1);
    await firstCard.locator("summary").click();
    await firstCard
      .getByRole("button", { name: "Drag question 1 to reorder" })
      .dispatchEvent("dragstart");
    await secondCard.dispatchEvent("dragover");
    await secondCard.dispatchEvent("drop");

    await expect(
      page.getByRole("status").filter({ hasText: "Question order saved." }),
    ).toBeVisible();
    expect(savedRequest).not.toBeNull();
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 1,
      questionIds: [secondQuestion.id, firstQuestion.id],
    });
    await expect(questionList.locator(":scope > li").nth(0)).toContainText(
      "Tell me more",
    );
    await expect(questionList.locator(":scope > li").nth(1)).toContainText(
      "What do you remember?",
    );

    await page.reload();
    await expect(
      page
        .getByRole("list", { name: "Questions in visitor order" })
        .locator(":scope > li")
        .nth(0),
    ).toContainText("Tell me more");
  });

  test("AC-5 deletes a question without reference or branching errors", async ({
    page,
  }) => {
    const firstQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      key: "first-question",
      type: "PLAIN_MESSAGE",
      prompt: "What do you remember?",
      displayOrder: 0,
      config: null,
      endsJourney: false,
      nextQuestionId: null,
      choices: [],
    };
    const secondQuestion: PageQuestion = {
      id: "77777777-7777-4777-8777-777777777777",
      pageId: editorPageId,
      key: "second-question",
      type: "PLAIN_MESSAGE",
      prompt: "Tell me more",
      displayOrder: 1,
      config: null,
      endsJourney: false,
      nextQuestionId: null,
      choices: [],
    };
    let currentQuestions = [firstQuestion, secondQuestion];

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: currentQuestions });
          return;
        }
        currentQuestions = [firstQuestion];
        await route.fulfill({
          status: 200,
          json: { deleted: true, contentVersion: 2 },
        });
      },
    );

    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const secondCard = questionList.locator(":scope > li").nth(1);
    await secondCard.locator("summary").click();
    await secondCard.getByRole("button", { name: "Delete" }).click();

    await expect(
      page.getByRole("status").filter({
        hasText: "Question deleted. The remaining questions stay in order.",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Questions in visitor order" })
        .locator(":scope > li")
        .filter({ hasText: "Tell me more" }),
    ).toHaveCount(0);
  });

  test("AC-7 keeps question actions inside the expanded accordion", async ({
    page,
  }) => {
    const questionIds = [
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
      "99999999-9999-4999-8999-999999999999",
    ];
    const prompts = ["First question", "Second question", "Third question"];
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() === "GET" && url.pathname.endsWith("/questions")) {
          await route.fulfill({
            status: 200,
            json: questionIds.map((id, index) => ({
              id,
              pageId: editorPageId,
              key: `question-${index + 1}`,
              type: "PLAIN_MESSAGE",
              prompt: prompts[questionIds.indexOf(id)] ?? "Question",
              displayOrder: index,
              config: null,
              endsJourney: false,
              nextQuestionId: null,
              choices: [],
            })),
          });
          return;
        }

        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    const questions = page
      .getByRole("list", {
        name: "Questions in visitor order",
      })
      .locator(":scope > li");
    await expect(questions).toHaveCount(3);
    await expect(questions.nth(0)).toContainText("First question");
    await expect(questions.nth(1)).toContainText("Second question");
    await expect(questions.nth(2)).toContainText("Third question");
    await expect(
      page.getByRole("button", { name: /Move .* (up|down)/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(questions.getByRole("button", { name: "Delete" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: /Drag question .* to reorder/ }),
    ).toHaveCount(3);
    await expect(
      questions.nth(0).getByRole("button", {
        name: "Drag question 1 to reorder",
      }),
    ).toBeVisible();
    await questions.nth(0).locator("summary").click();
    await expect(
      questions.nth(0).getByRole("button", { name: "Edit" }),
    ).toBeVisible();
    await expect(
      questions.nth(0).getByRole("button", { name: "Delete" }),
    ).toBeVisible();
    await expect(
      questions.nth(0).getByRole("button", {
        name: "Drag question 1 to reorder",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add another question" }),
    ).toBeVisible();
    await expect(page.getByText("Retry reorder")).toHaveCount(0);
  });

  test("AC-1 renders question cards without branching controls and hides details while collapsed", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() === "GET" && url.pathname.endsWith("/questions")) {
          await route.fulfill({
            status: 200,
            json: [
              {
                id: questionId,
                pageId: editorPageId,
                key: "first-question",
                type: "CHOICE",
                prompt: "What do you remember?",
                displayOrder: 0,
                config: null,
                endsJourney: false,
                nextQuestionId: null,
                choices: [
                  {
                    id: choiceOneId,
                    key: "happy",
                    label: "The happy moments",
                    displayOrder: 0,
                    creatorMessage: null,
                    endsJourney: false,
                    nextQuestionId: null,
                  },
                  {
                    id: choiceTwoId,
                    key: "quiet",
                    label: "The quiet moments",
                    displayOrder: 1,
                    creatorMessage: null,
                    endsJourney: true,
                    nextQuestionId: null,
                  },
                ],
              },
            ],
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    const flow = page.getByRole("group", { name: "Ordered question list" });
    const firstCard = flow
      .getByRole("list", { name: "Questions in visitor order" })
      .locator(":scope > li")
      .first();
    await expect(flow.getByRole("dialog")).toHaveCount(0);
    await expect(firstCard.locator("details")).not.toHaveAttribute("open");
    await expect(firstCard.getByText("The happy moments")).toBeHidden();
    await expect(firstCard.getByRole("button", { name: "Edit" })).toHaveCount(
      0,
    );
    await expect(firstCard.getByRole("button", { name: "Delete" })).toHaveCount(
      0,
    );
    await expect(flow.getByText("Next step")).toHaveCount(0);
    await expect(flow.getByText("Finish the journey")).toHaveCount(0);
    await expect(
      flow.getByRole("combobox", { name: /next step/i }),
    ).toHaveCount(0);
    await expect(
      flow.getByRole("button", { name: "Add another question" }),
    ).toHaveCount(1);
    await firstCard.locator("summary").click();
    await expect(firstCard.getByText("The happy moments")).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: "Delete" }),
    ).toBeVisible();
  });

  test("AC-7 restores the permanent image after a full page reload", async ({
    page,
  }) => {
    let ownerReads = 0;
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      await route.fulfill({ status: 200, json: ownerPage(2, "Still here") });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await expect(editorImage(page)).toBeVisible();

    await page.reload();

    await expect.poll(() => ownerReads).toBeGreaterThan(1);
    await expect(page.getByLabel("Caption")).toHaveValue("Still here");
    await expect(editorImage(page)).toBeVisible();
    await expect
      .poll(() =>
        editorImage(page).evaluate(
          (image: HTMLImageElement) => image.naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  });
});

test.describe("protected links and QR sharing", () => {
  test("AC-1, AC-3, AC-5, and AC-11 render a published owner QR panel", async ({
    page,
  }) => {
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    await expect(page.getByText("Letter link", { exact: true })).toHaveCount(0);

    const qrPanel = page.getByRole("region", {
      name: "A quiet way to share your letter",
    });
    const qrRegion = page.locator('[role="img"][aria-label^="QR code for"]');
    await expect(
      page.getByRole("heading", {
        name: "A quiet way to share your letter",
      }),
    ).toBeVisible();
    await expect(qrRegion).toBeVisible();
    await expect(qrRegion.locator("img")).toBeVisible();
    await expect(
      qrPanel.getByRole("link", { name: "Open letter" }),
    ).toHaveAttribute("href", "/p/mock-letter");
    await expect(page.getByLabel("Public link")).toHaveValue(
      "http://127.0.0.1:3100/p/mock-letter",
    );
    await expect(
      page.getByRole("button", { name: "Download SVG" }),
    ).toBeEnabled();
    await expect(qrRegion).toHaveAttribute(
      "aria-label",
      "QR code for http://127.0.0.1:3100/p/mock-letter",
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download SVG" }).click();
    const download = await downloadPromise;
    const downloadedMarkup = await readFile(
      (await download.path()) ?? "",
      "utf8",
    );
    const expectedMarkup = await QRCode.toString(
      "http://127.0.0.1:3100/p/mock-letter",
      {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 4,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
    );

    expect(download.suggestedFilename()).toBe("letterly-mock-letter.svg");
    expect(downloadedMarkup.trim()).toBe(expectedMarkup.trim());
  });

  test("AC-5 keeps the URL copy fallback available when clipboard access is unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Clipboard unavailable");
          },
        },
      });
    });
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    const qrPanel = page.getByRole("region", {
      name: "A quiet way to share your letter",
    });
    const qrPreview = page.locator(
      '[role="img"][aria-label^="QR code for"] img',
    );
    await expect(qrPreview).toBeAttached();
    await qrPanel
      .getByRole("button", { name: "Copy link", exact: true })
      .click();
    await qrPreview.dispatchEvent("load");

    await expect(
      page.getByText(
        "Copy was unavailable. Select the public link and copy it manually.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(qrPanel.getByLabel("Public link")).toHaveAttribute(
      "readonly",
      "",
    );
  });

  test("AC-11 keeps the QR panel usable at a narrow viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    await expect(
      page.getByRole("button", { name: "Download SVG" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  });

  test("AC-8 keeps the published slug immutable when a letter is unpublished", async ({
    page,
  }) => {
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "UNPUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);

    await expect(page.getByLabel("Custom public slug")).toHaveCount(0);
    await expect(
      page
        .locator('p[role="status"]')
        .filter({ hasText: "Your existing public link is reserved" }),
    ).toBeVisible();
  });
});

test.describe("Choose Your Heart authoring and protection", () => {
  test("AC-3 and AC-14 let a creator connect a new question to the journey", async ({
    page,
  }) => {
    let savedRequest: Record<string, unknown> | null = null;
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          json: chooseYourHeartOwnerPage(),
        });
        return;
      }
      await route.continue();
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/choose-your-heart`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            json: journeyOwnerResponse(),
          });
          return;
        }

        savedRequest = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        const graph = route.request().postDataJSON() as Record<string, unknown>;
        delete graph.expectedContentVersion;
        await route.fulfill({
          status: 200,
          json: journeyOwnerResponse(
            graph as unknown as typeof starterJourneyGraph,
            2,
          ),
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await expect(
      page.getByRole("heading", { name: "Shape the journey" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Allow private responses" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Add question" }).click();
    const destinations = page.getByRole("combobox", { name: "Destination" });
    await expect(destinations).toHaveCount(4);
    await destinations
      .first()
      .selectOption({ label: "Question: New question" });
    await expect(destinations.first()).toHaveValue(/question:/);

    await page.getByRole("button", { name: "Save journey" }).click();
    await expect(
      page.getByText("Saved as version 2.", { exact: true }),
    ).toBeVisible();
    expect(savedRequest).not.toBeNull();
    const request = savedRequest as unknown as Record<string, unknown>;
    expect(request.expectedContentVersion).toBe(1);
    const savedQuestions = request.questions as Array<{
      choices: Array<{ nextQuestionKey: string | null }>;
    }>;
    expect(savedQuestions[0]?.choices[0]?.nextQuestionKey).toMatch(
      /^question-/,
    );
  });

  test("AC-6 renders the unlock state for a protected Choose Your Heart page", async ({
    page,
  }) => {
    test.skip(
      !protectedJourneySlug,
      "Set PUBLIC_CH_PROTECTED_SLUG to a protected published Choose Your Heart page",
    );
    await page.goto(`/p/${encodeURIComponent(protectedJourneySlug ?? "")}`);
    await expect(
      page.getByRole("heading", { name: "This letter is protected." }),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});

test.describe("Choose Your Heart visitor journey", () => {
  test("AC-8 and AC-9 support back navigation, a result, and a private response", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    test.skip(
      !publicJourneySlug,
      "Set PUBLIC_CH_PUBLIC_SLUG to a published Choose Your Heart page with responses enabled",
    );

    await page.goto(`/p/${encodeURIComponent(publicJourneySlug ?? "")}`);
    await expect(
      page.getByRole("heading", { name: "Choose Your Heart" }),
    ).toBeVisible();
    await expect(page.locator('[aria-label="0% complete"]')).toBeVisible();

    await page.getByRole("button", { name: "The happy moments" }).click();
    await expect(
      page.getByRole("heading", { name: "A heart full of warmth" }),
    ).toBeVisible();
    await expect(page.locator('[aria-label="100% complete"]')).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "What do you remember?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "The happy moments" }).click();
    await expect(
      page.getByRole("heading", { name: "Leave a private response" }),
    ).toBeVisible();
    await page.getByLabel(/Private message/).fill("A private journey note.");
    await page.getByRole("button", { name: "Send private response" }).click();
    await expect(
      page.getByRole("heading", { name: "Thank you for sharing." }),
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("public Secret Letter route", () => {
  test("AC-7 renders a generic unavailable page without private details", async ({
    page,
  }) => {
    const response = await page.goto("/p/dashboard");

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["x-robots-tag"]).toBe(
      "noindex, nofollow, noarchive",
    );

    await expect(
      page.getByRole("heading", { name: "This letter is not available." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to Letterly" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("creatorId");
    await expect(page.locator("body")).not.toContainText("contentVersion");
    await expect(page).toHaveTitle("Letter unavailable | Letterly");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow, noarchive",
    );
  });

  test.describe("published letter", () => {
    test.skip(
      !publishedSlug,
      "Set PUBLIC_TEST_SLUG to a current published page for this journey",
    );

    test("AC-6 and AC-9 render the published letter and keep the opening keyboard accessible", async ({
      page,
    }) => {
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await expect(page.getByRole("heading", { name: /^To / })).toBeVisible();
      await expect(
        page.getByText("Create your own letter on Letterly"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).toBeVisible();
      await expect(page.getByText("For My Dearest")).toBeVisible();
      await expect(page.getByText("Tap to open")).toBeVisible();

      await page.getByRole("button", { name: "Skip animation" }).click();
      await expect(page.getByRole("heading", { name: /^To / })).toBeFocused();
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).not.toBeVisible();
    });

    test("AC-11 keeps the published letter readable with reduced motion", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await expect(page.getByRole("heading", { name: /^To / })).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: "Reduce motion" }),
      ).toBeChecked();
      await page.getByRole("button", { name: "Open your letter" }).click();
      await expect(page.getByRole("heading", { name: /^To / })).toBeFocused();
      await expect(
        page.getByText("Create your own letter on Letterly"),
      ).toBeVisible();
    });

    test("AC-14 keeps the letter readable when public images fail", async ({
      page,
    }) => {
      await page.route(
        `**/p/${encodeURIComponent(publishedSlug ?? "")}/media/*`,
        async (route) => {
          await route.fulfill({ status: 503, body: "unavailable" });
        },
      );

      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await page.getByRole("button", { name: "Skip animation" }).click();
      await page
        .getByRole("heading", { name: "Cherished Moments" })
        .scrollIntoViewIfNeeded();

      await expect(
        page.getByText("This image is unavailable right now.").first(),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: /^To / })).toBeVisible();
      await expect(
        page.getByText("Create your own letter on Letterly"),
      ).toBeVisible();
    });

    test("AC-9 keeps decoded public WebP images available after reload", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const mediaResponsePromise = page.waitForResponse((response) =>
        /\/p\/[^/]+\/media\/[^/?]+/.test(response.url()),
      );
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`, {
        waitUntil: "domcontentloaded",
      });
      const mediaResponse = await mediaResponsePromise;
      const images = page.locator("main figure img");

      expect(mediaResponse.status()).toBe(200);
      expect(mediaResponse.headers()["content-type"]).toContain("image/webp");
      expect(mediaResponse.headers()["cache-control"]).toContain("no-store");
      await page.getByRole("button", { name: "Skip animation" }).click();
      await page
        .getByRole("heading", { name: "Cherished Moments" })
        .scrollIntoViewIfNeeded();
      await expect(images.first()).toBeVisible();
      await expect
        .poll(
          () =>
            images.evaluateAll((elements) =>
              elements.every(
                (element) => (element as HTMLImageElement).naturalWidth > 0,
              ),
            ),
          { timeout: 60_000 },
        )
        .toBe(true);

      await expect
        .poll(async () =>
          (await page.context().cookies()).some(
            (cookie) => cookie.name === "letterly_browser",
          ),
        )
        .toBe(true);

      await page.reload({ waitUntil: "domcontentloaded" });

      await expect(images.first()).toBeVisible();
      await expect
        .poll(
          () =>
            images.evaluateAll((elements) =>
              elements.every(
                (element) => (element as HTMLImageElement).naturalWidth > 0,
              ),
            ),
          { timeout: 60_000 },
        )
        .toBe(true);
    });
  });
});

test.describe("public Secret Letter without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.skip(
    !publishedSlug,
    "Set PUBLIC_TEST_SLUG to a current published page for this journey",
  );

  test("AC-9 keeps the letter content in the document without client scripts", async ({
    page,
  }) => {
    await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

    await expect(
      page.locator("#letter-content").getByRole("heading", { level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByText("Create your own letter on Letterly"),
    ).toBeVisible();
  });
});
