import { expect, test } from "@playwright/test";

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

test.describe("authenticated Secret Letter draft loop", () => {
  test("shows letters through the status filters without card actions", async ({
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

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Published letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Draft letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Archived letter" }),
    ).toBeVisible();
    await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete permanently" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Draft" }).click();
    await expect(
      page.getByRole("heading", { name: "Draft letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Published letter" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Archived" }).click();
    await expect(
      page.getByRole("heading", { name: "Archived letter" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Draft letter" }),
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

    await page.goto(`/dashboard/letters/${pageId}/edit`);
    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    await expect(
      page.getByRole("heading", { name: "A quiet view of your progress" }),
    ).toBeVisible();
    await expect(page.getByText("Total views", { exact: true })).toBeVisible();
    await expect(page.getByText("Responses", { exact: true })).toBeVisible();
    await expect(page.getByText("Unique views", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Viewers" }).click();
    await expect(page).toHaveURL(/section=viewers/u);
    await expect(
      page.getByRole("heading", { name: "Responses from your readers" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Settings" }).click();
    await expect(page).toHaveURL(/section=settings/u);
    await expect(
      page.getByRole("heading", { name: "Make the details feel like you" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Content" }).click();
    await expect(page).not.toHaveURL(/section=/u);
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A message worth keeping.",
    );
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

    await page.goto(`/dashboard/letters/${pageId}/edit`);
    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
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

    await page.goto(`/dashboard/letters/${pageId}/edit`);
    await page.getByRole("tab", { name: "Settings" }).click();
    await expect(page.getByText("Not set", { exact: true })).toBeVisible();

    const passwordInput = page.getByLabel("Set or replace password");
    await expect(passwordInput).toHaveAttribute("type", "password");
    await passwordInput.fill("a private letter password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Enabled", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove password protection" }),
    ).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await page
      .getByRole("button", { name: "Remove password protection" })
      .click();
    await expect(page.getByText("Not set", { exact: true })).toBeVisible();
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
    await page.getByRole("button", { name: "Create my draft" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Untitled letter",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Dashboard navigation" })
        .getByRole("link", { name: "Home" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(
      0,
    );

    await page.getByLabel("Who is this letter for?").fill("Alex");
    await page
      .getByLabel("Your message")
      .fill("A private message that should survive reopening.");
    await expect(
      page.getByRole("status").filter({ hasText: "Saved as version 1." }),
    ).toBeVisible();

    await page.goto("/dashboard");
    await expect(
      page
        .getByRole("navigation", { name: "Dashboard navigation" })
        .getByRole("link", { name: "My letters" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alex" })).toBeVisible();
    await expect(
      page.getByText("A private message that should survive reopening.", {
        exact: true,
      }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Open letter" }).click();
    await expect(page.getByLabel("Who is this letter for?")).toHaveValue(
      "Alex",
    );
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A private message that should survive reopening.",
    );
    await expect(
      page.getByRole("button", { name: "Delete permanently" }),
    ).toHaveCount(0);

    await page.getByRole("tab", { name: "Settings" }).click();
    await expect(page).toHaveURL(/section=settings/u);
    await expect(
      page.getByRole("button", { name: "Delete permanently" }),
    ).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/dashboard$/u);
    await expect(
      page.getByText("Your first letter is still waiting.", { exact: true }),
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

    await page.goto(`/dashboard/letters/${pageId}/edit`);
    await page.getByLabel("Who is this letter for?").fill("Alex");
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
