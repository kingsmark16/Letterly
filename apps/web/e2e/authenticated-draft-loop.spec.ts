import { expect, test, type Page } from "@playwright/test";

const pageId = "11111111-1111-4111-8111-111111111111";
const templateVersionId = "22222222-2222-4222-8222-222222222222";

const session = {
  session: {
    id: "draft-session",
    userId: "draft-creator",
    expiresAt: "2026-09-20T00:00:00.000Z",
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

function ownerPage(
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

async function selectEditorSection(
  page: Page,
  label: string,
  section: "content" | "preview" | "overview" | "settings",
): Promise<void> {
  await expect(page.locator("[data-editor-section]")).toBeVisible();
  const tab = page.getByRole("tab", { name: label, exact: true });

  if (await tab.isVisible()) {
    await tab.click();
  } else {
    await page.getByRole("button", { name: "Open editor sections" }).click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
  }

  await expect(page.locator("[data-editor-section]")).toHaveAttribute(
    "data-editor-section",
    section,
  );
}

test.describe("authenticated Secret Letter draft loop", () => {
  test("shows pages through the status filters without card actions", async ({
    page,
  }) => {
    const summary = (
      id: string,
      recipientLabel: string,
      status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
      contentVersion: number,
    ) => ({
      id,
      recipientLabel,
      status,
      contentVersion,
      preview: {
        title: `For ${recipientLabel}`,
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
      updatedAt: "2026-08-20T00:05:00.000Z",
    });

    const draft = summary(pageId, "Draft letter", "DRAFT", 1);
    const published = summary(
      "44444444-4444-4444-8444-444444444444",
      "Published letter",
      "PUBLISHED",
      3,
    );
    const archived = summary(
      "55555555-5555-4555-8555-555555555555",
      "Archived letter",
      "ARCHIVED",
      2,
    );

    await page.route("**/api/auth/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
        await route.fulfill({ status: 200, json: session });
        return;
      }
      await route.continue();
    });

    await page.route("**/api/v1/pages**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/v1/pages" && request.method() === "GET") {
        const status = url.searchParams.get("status");
        expect(status).toBeTruthy();
        const items =
          status === "DRAFT"
            ? [draft]
            : status === "PUBLISHED"
              ? [published]
              : status === "ARCHIVED"
                ? [archived]
                : [draft, published, archived];
        await route.fulfill({
          status: 200,
          json: {
            items,
            nextCursor: null,
          },
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dashboard/pages");
    const statusFilterButtons = page
      .getByRole("group", { name: "Filter pages by status" })
      .getByRole("button");
    const filterSizes = await statusFilterButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect();
        return { height: Math.round(height), width: Math.round(width) };
      }),
    );
    expect(new Set(filterSizes.map(({ width }) => width)).size).toBe(1);
    expect(new Set(filterSizes.map(({ height }) => height)).size).toBe(1);
    expect(filterSizes[0]?.height).toBeGreaterThanOrEqual(44);
    await expect(
      page.getByRole("heading", { name: "For Published letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "For Draft letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "For Archived letter" }),
    ).toBeVisible();
    await expect(
      page.getByText("To Published letter", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-template-thumbnail]")).toHaveCount(3);
    await expect(page.locator("time").first()).toHaveText(
      /^(?:just now|\d+ (?:seconds?|minutes?|hours?|days?|months?|years?) ago)$/u,
    );
    await expect(page.getByText("Open page", { exact: true })).toHaveCount(0);
    await expect(
      page
        .getByRole("link", {
          name: /Open .*"For Published letter" for Published letter/u,
        })
        .getByText("Published", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete permanently" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Draft" }).click();
    await expect(
      page.getByRole("heading", { name: "For Draft letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "For Published letter" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Archived" }).click();
    await expect(
      page.getByRole("heading", { name: "For Archived letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "For Draft letter" }),
    ).toHaveCount(0);
  });

  test("navigates the editor sections without a full page reload", async ({
    page,
  }) => {
    await page.route("**/api/auth/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
        await route.fulfill({ status: 200, json: session });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/v1/pages/${pageId}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          json: ownerPage(
            1,
            "A thoughtful recipient",
            "A message worth keeping.",
            "2026-08-20T00:05:00.000Z",
          ),
        });
        return;
      }
      await route.continue();
    });
    await page.route(`**/api/v1/pages/${pageId}/questions`, async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route(
      `**/api/v1/pages/${pageId}/submissions**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          json: { items: [], unreadCount: 0, nextCursor: null },
        });
      },
    );

    await page.goto(`/dashboard/pages/${pageId}/edit`);
    await expect(page.locator("[data-editor-section]")).toHaveAttribute(
      "data-editor-section",
      "preview",
    );

    await selectEditorSection(page, "Review & share", "overview");
    await expect(page).toHaveURL(/section=overview/u);
    const reviewPanel = page.getByRole("region", { name: "Review and share" });
    await expect(reviewPanel).toBeVisible();
    await expect(
      reviewPanel.getByRole("heading", { name: "Field checklist" }),
    ).toBeVisible();
    for (const group of ["Words", "Photos", "Music", "Questions"]) {
      await expect(
        reviewPanel.getByRole("region", { name: group, exact: true }),
      ).toBeVisible();
    }
    await expect(
      reviewPanel.getByRole("button", { name: "Publish letter", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Overview", exact: true }),
    ).toHaveCount(0);

    await selectEditorSection(page, "Settings", "settings");
    await expect(page).toHaveURL(/section=settings/u);
    await expect(
      page.getByRole("heading", { name: "Letter settings" }),
    ).toBeVisible();

    await selectEditorSection(page, "Write", "content");
    await expect(page).toHaveURL(/section=content/u);
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A message worth keeping.",
    );
    await expect(page.getByLabel("To (required)")).toHaveValue(
      "A thoughtful recipient",
    );
    await expect(
      page.getByRole("tab", { name: "Photos", exact: true }),
    ).toBeVisible();
  });

  test("waits for an owner page response while the database wakes", async ({
    page,
  }) => {
    await page.route("**/api/auth/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
        await route.fulfill({ status: 200, json: session });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/v1/pages/${pageId}`, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 16_000));
      await route.fulfill({
        status: 200,
        json: ownerPage(
          1,
          "A thoughtful recipient",
          "A message worth keeping.",
          "2026-08-20T00:05:00.000Z",
        ),
      });
    });
    await page.route(`**/api/v1/pages/${pageId}/questions`, async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route(
      `**/api/v1/pages/${pageId}/submissions**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          json: { items: [], unreadCount: 0, nextCursor: null },
        });
      },
    );

    await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
    await expect(page.locator("[data-editor-section]")).toHaveAttribute(
      "data-editor-section",
      "content",
      { timeout: 25_000 },
    );
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A message worth keeping.",
    );
  });

  test("keeps Secret Letter password protection available after saving", async ({
    page,
  }) => {
    let passwordProtected = false;

    await page.route("**/api/auth/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
        await route.fulfill({ status: 200, json: session });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/v1/pages/${pageId}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          json: {
            ...ownerPage(
              1,
              "A thoughtful recipient",
              "A message worth keeping.",
              "2026-08-20T00:05:00.000Z",
            ),
            passwordProtected,
          },
        });
        return;
      }
      await route.continue();
    });
    await page.route(`**/api/v1/pages/${pageId}/password`, async (route) => {
      expect(route.request().method()).toBe("PATCH");
      const body = route.request().postDataJSON() as {
        password: string | null;
      };
      passwordProtected = body.password !== null;
      await route.fulfill({ status: 200, json: { passwordProtected } });
    });
    await page.route(`**/api/v1/pages/${pageId}/questions`, async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route(
      `**/api/v1/pages/${pageId}/submissions**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          json: { items: [], unreadCount: 0, nextCursor: null },
        });
      },
    );

    await page.goto(`/dashboard/pages/${pageId}/edit`);
    await selectEditorSection(page, "Settings", "settings");
    await expect(page.getByText("No password", { exact: true })).toBeVisible();

    const passwordInput = page.getByLabel("Enter a password");
    await expect(passwordInput).toHaveAttribute("type", "password");
    await passwordInput.fill("a private letter password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await page.getByRole("button", { name: "Add password" }).click();
    await expect(
      page.getByText("Password protected", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove password" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Remove password" }).click();
    const removePasswordDialog = page.getByRole("alertdialog", {
      name: "Remove the password?",
    });
    await expect(removePasswordDialog).toBeVisible();
    await removePasswordDialog
      .getByRole("button", { name: "Remove password", exact: true })
      .click();
    await expect(page.getByText("No password", { exact: true })).toBeVisible();
  });

  test("AC-1, AC-3, AC-5, AC-6, AC-7 creates, saves, reopens, and deletes a draft", async ({
    page,
  }) => {
    let currentPage = ownerPage(0, "", "", "2026-08-20T00:00:00.000Z");
    let deleted = false;

    await page.route("**/api/auth/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
        await route.fulfill({ status: 200, json: session });
        return;
      }
      await route.continue();
    });

    await page.route("**/api/v1/pages**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;

      if (path === "/api/v1/pages" && request.method() === "POST") {
        await route.fulfill({ status: 201, json: currentPage });
        return;
      }

      if (path === "/api/v1/pages" && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          json: {
            items: deleted
              ? []
              : [
                  {
                    id: pageId,
                    recipientLabel: currentPage.recipientLabel,
                    status: "DRAFT",
                    contentVersion: currentPage.contentVersion,
                    template: currentPage.template,
                    createdAt: currentPage.createdAt,
                    updatedAt: currentPage.updatedAt,
                  },
                ],
            nextCursor: null,
          },
        });
        return;
      }

      if (
        path === `/api/v1/pages/${pageId}/questions` &&
        request.method() === "GET"
      ) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }

      if (path === `/api/v1/pages/${pageId}` && request.method() === "GET") {
        await route.fulfill({
          status: deleted ? 404 : 200,
          json: deleted
            ? {
                statusCode: 404,
                code: "PAGE_NOT_FOUND",
                message: "Page not found",
              }
            : currentPage,
        });
        return;
      }

      if (path === `/api/v1/pages/${pageId}` && request.method() === "PATCH") {
        const body = request.postDataJSON() as {
          recipientName: string;
          mainMessage: string;
        };
        currentPage = ownerPage(
          1,
          body.recipientName,
          body.mainMessage,
          "2026-08-20T00:05:00.000Z",
        );
        await route.fulfill({ status: 200, json: currentPage });
        return;
      }

      if (path === `/api/v1/pages/${pageId}` && request.method() === "DELETE") {
        deleted = true;
        await route.fulfill({ status: 204, body: "" });
        return;
      }

      await route.continue();
    });

    await page.goto(`/create?templateVersionId=${templateVersionId}`);
    await page
      .getByRole("button", { name: "Create draft with Secret Letter" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Edit letter" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(
      0,
    );

    await selectEditorSection(page, "Write", "content");
    await page.getByLabel("To (required)").fill("Alex");
    await page
      .getByLabel("Your message")
      .fill("A private message that should survive reopening.");
    await expect(
      page.getByRole("status").filter({ hasText: "All changes saved." }),
    ).toBeVisible();

    await page.goto("/dashboard/pages");
    await expect(
      page.getByRole("heading", { name: "Untitled page" }),
    ).toBeVisible();
    await expect(page.getByText("To Alex", { exact: true })).toBeVisible();
    await expect(
      page.getByText("A private message that should survive reopening.", {
        exact: true,
      }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: /Open .*page .* for Alex/u }).click();
    await selectEditorSection(page, "Write", "content");
    await expect(page.getByLabel("To (required)")).toHaveValue("Alex");
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A private message that should survive reopening.",
    );
    await expect(
      page.getByRole("button", { name: "Delete permanently" }),
    ).toHaveCount(0);

    await selectEditorSection(page, "Settings", "settings");
    await expect(page).toHaveURL(/section=settings/u);
    await expect(
      page.getByRole("button", { name: "Delete permanently" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete permanently" }).click();
    await page
      .getByRole("alertdialog", { name: "Delete this letter permanently?" })
      .getByRole("button", { name: "Delete permanently", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/pages$/u);
    await expect(
      page.getByText("Your first page is still waiting.", { exact: true }),
    ).toBeVisible();
  });

  test("AC-10 keeps the editor mounted when saving fails", async ({ page }) => {
    const currentPage = ownerPage(0, "", "", "2026-08-20T00:00:00.000Z");

    await page.route("**/api/auth/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
        await route.fulfill({ status: 200, json: session });
        return;
      }
      await route.continue();
    });

    await page.route("**/api/v1/pages**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (
        path === `/api/v1/pages/${pageId}/questions` &&
        request.method() === "GET"
      ) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }

      if (path === `/api/v1/pages/${pageId}` && request.method() === "GET") {
        await route.fulfill({ status: 200, json: currentPage });
        return;
      }

      if (path === `/api/v1/pages/${pageId}` && request.method() === "PATCH") {
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "The draft could not be saved. Please try again.",
            requestId: "44444444-4444-4444-8444-444444444444",
          },
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`/dashboard/pages/${pageId}/edit`);
    await selectEditorSection(page, "Write", "content");
    await page.getByLabel("To (required)").fill("Alex");
    await page.getByLabel("Your message").fill("This remains in the editor.");

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "The draft could not be saved." }),
    ).toContainText("The draft could not be saved. Please try again.");
    await expect(page.getByLabel("Your message")).toHaveValue(
      "This remains in the editor.",
    );
  });
});
