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
  test("shows published letters in My letters", async ({ page }) => {
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
        expect(url.searchParams.get("status")).toBeNull();
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: pageId,
                recipientLabel: "Published letter",
                status: "PUBLISHED",
                contentVersion: 3,
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
              },
            ],
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
    await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
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
        name: "A quiet place for what you mean.",
      }),
    ).toBeVisible();

    await page.getByLabel("Who is this letter for?").fill("Alex");
    await page
      .getByLabel("Your message")
      .fill("A private message that should survive reopening.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Saved as version 1.");

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "My letters" }),
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

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Delete permanently" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Alex was permanently deleted.",
    );
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
    await page.getByRole("button", { name: "Save draft" }).click();

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
