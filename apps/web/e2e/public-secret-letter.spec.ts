import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import QRCode from "qrcode";
import { getTrustedVisitorAddress } from "../src/lib/visitor-identity";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const publishedSlug = process.env.PUBLIC_TEST_SLUG;
// eslint-disable-next-line turbo/no-undeclared-env-vars
const protectedJourneySlug = process.env.PUBLIC_CH_PROTECTED_SLUG;
// eslint-disable-next-line turbo/no-undeclared-env-vars
const publicJourneySlug = process.env.PUBLIC_CH_PUBLIC_SLUG;

const editorPageId = "11111111-1111-4111-8111-111111111111";
const editorImageId = "22222222-2222-4222-8222-222222222222";
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
): MockOwnerPage {
  return {
    id: editorPageId,
    slug: "mock-letter",
    canonicalUrl:
      status === "PUBLISHED" ? "http://127.0.0.1:3100/p/mock-letter" : null,
    recipientLabel: "For Alex",
    status,
    contentVersion,
    content: {
      recipientName: "Alex",
      mainMessage: "A letter that keeps its memories.",
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

    await expect(page.getByLabel("Optional caption")).toHaveValue(
      "A saved memory",
    );
    await expect(page.getByText("Included in this letter")).toBeVisible();
    await expect(editorImage(page)).toBeVisible();
    await expect
      .poll(() =>
        editorImage(page).evaluate(
          (image: HTMLImageElement) => image.naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  });

  test("AC-7 keeps local image edits during a same version query refetch", async ({
    page,
  }) => {
    let ownerReads = 0;
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/unpublish`,
      async (route) => {
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
    await expect(page.getByLabel("Optional caption")).toHaveValue(
      "A saved memory",
    );
    await page.getByLabel("Optional caption").fill("An unsaved local caption");

    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect.poll(() => ownerReads).toBeGreaterThan(1);

    await expect(page.getByLabel("Optional caption")).toHaveValue(
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
    await page.getByLabel("Optional caption").fill("  Remember this day  ");

    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.getByRole("status").first()).toContainText(
      "Saved as version 2.",
    );
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 1,
      images: [
        {
          imageId: editorImageId,
          sortOrder: 0,
          caption: "Remember this day",
        },
      ],
    });
    await expect(page.getByLabel("Optional caption")).toHaveValue(
      "Remember this day",
    );
    await expect(editorImage(page)).toBeVisible();
  });

  test("AC-4 warns before reload when only media has unsaved changes", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByLabel("Optional caption").fill("An unsaved caption");
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
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      await route.fulfill({
        status: 200,
        json: ownerPage(ownerReads > 1 ? 2 : 1),
      });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, json: [] });
          return;
        }

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
              nextQuestionId: null,
              choices: [
                {
                  id: choiceOneId,
                  key: "choice-one",
                  label: "The beginning",
                  displayOrder: 0,
                  creatorMessage: null,
                  nextQuestionId: null,
                },
                {
                  id: choiceTwoId,
                  key: "choice-two",
                  label: "The middle",
                  displayOrder: 1,
                  creatorMessage: null,
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
    await page.getByLabel("Who is this letter for?").fill("Unsent recipient");
    await page.getByLabel("Your message").fill("Unsent message");
    await page
      .getByRole("checkbox", { name: "Allow private responses" })
      .check();
    await page.getByLabel("Question key").fill("memory");
    await page.getByLabel("Prompt").fill("What do you remember?");
    await page.getByLabel("Choice 1 label").fill("The beginning");
    await page.getByLabel("Choice 2 label").fill("The middle");

    await page.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByText("Question saved.")).toBeVisible();
    await expect.poll(() => ownerReads).toBeGreaterThan(1);

    await expect(page.getByLabel("Who is this letter for?")).toHaveValue(
      "Unsent recipient",
    );
    await expect(page.getByLabel("Your message")).toHaveValue("Unsent message");
    await expect(
      page.getByRole("checkbox", { name: "Allow private responses" }),
    ).toBeChecked();
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
    await expect(page.getByLabel("Optional caption")).toHaveValue("Still here");
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

    const qrRegion = page.locator('[role="img"][aria-label^="QR code for"]');
    await expect(
      page.getByRole("heading", {
        name: "A quiet way to share your letter",
      }),
    ).toBeVisible();
    await expect(qrRegion).toBeVisible();
    await expect(qrRegion.locator("img")).toBeVisible();
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
        value: undefined,
      });
    });
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("button", { name: "Copy link", exact: true }).click();

    await expect(
      page.getByText(
        "Copy was unavailable. Select the public link and copy it manually.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Public link")).toHaveAttribute(
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

      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      await expect(
        page.getByText("Create your own letter on Letterly"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Skip animation" }).click();
      await expect(page.getByRole("heading", { level: 2 })).toBeFocused();
      await expect(
        page.getByRole("button", { name: "Letter opened" }),
      ).toBeVisible();
    });

    test("AC-11 keeps the published letter readable with reduced motion", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: "Reduce motion" }),
      ).toBeChecked();
      await page.getByRole("button", { name: "Open your letter" }).click();
      await expect(page.getByRole("heading", { level: 2 })).toBeFocused();
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

      await expect(
        page.getByText("This image is unavailable right now.").first(),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
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
      const images = page.locator("article figure img");

      expect(mediaResponse.status()).toBe(200);
      expect(mediaResponse.headers()["content-type"]).toContain("image/webp");
      expect(mediaResponse.headers()["cache-control"]).toContain("no-store");
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

    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(
      page.getByText("Create your own letter on Letterly"),
    ).toBeVisible();
  });
});
