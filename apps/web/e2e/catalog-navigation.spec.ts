import { expect, test } from "@playwright/test";

test.describe("catalog navigation", () => {
  test("opens the authenticated overview with the workspace navigation", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "home-session",
            userId: "home-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "home-user",
            name: "Home User",
            email: "home@example.com",
            emailVerified: true,
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
        },
      });
    });
    await page.route("**/api/v1/pages**", async (route) => {
      await route.fulfill({
        status: 200,
        json: { items: [], nextCursor: null },
      });
    });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Welcome back, Home." }),
    ).toBeVisible();
    const navigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(
      navigation.getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("href", "/dashboard");
    await expect(
      navigation.getByRole("link", { name: "My pages" }),
    ).toHaveAttribute("href", "/dashboard/pages");
    await expect(
      navigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
    await expect(navigation).not.toHaveClass(/overflow-x-auto/u);
    const navigationWidth = await navigation.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(navigationWidth.scrollWidth).toBeLessThanOrEqual(
      navigationWidth.clientWidth,
    );
    const documentWidth = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(documentWidth.scrollWidth).toBeLessThanOrEqual(
      documentWidth.clientWidth + 1,
    );
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    const zoomedDocumentWidth = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(zoomedDocumentWidth.scrollWidth).toBeLessThanOrEqual(
      zoomedDocumentWidth.clientWidth + 1,
    );
    await page.evaluate(() => {
      document.documentElement.style.zoom = "";
    });
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      const sidebar = navigation.locator("xpath=ancestor::aside");
      await expect(sidebar).toHaveCSS("position", "sticky");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect
        .poll(() =>
          sidebar.evaluate((element) =>
            Math.abs(element.getBoundingClientRect().top),
          ),
        )
        .toBeLessThanOrEqual(1);
    }
    await expect(
      page.getByText("Your pages stay yours until you decide to share them.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Private by default", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Give your words a place to land.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your words stay in your hands." }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Recent replies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Choose a shape for what's next." }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "No pages yet.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No replies yet." }),
    ).toBeVisible();

    await page.goto("/dashboard/home");
    await expect(page).toHaveURL(/\/dashboard$/u);
  });

  test("renders the complete template collection and category filter", async ({
    page,
  }) => {
    await page.goto("/templates");

    const navigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "My pages" }),
    ).toHaveAttribute("href", "/dashboard/pages");
    await expect(
      page.getByRole("heading", {
        name: "Templates",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("A shape for what matters", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Start with the feeling, not a blank page.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Letterly catalog", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "All categories" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Make it unmistakably yours." }),
    ).toBeVisible();

    const categoryLink = page
      .getByRole("link", { name: /Confession\s+\d+ templates/u })
      .first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();
    await expect(page).toHaveURL(/\/templates\?category=confession$/u);
    await expect(
      page.getByRole("heading", { name: "Templates for confession." }),
    ).toBeVisible();
  });

  test("puts the latest page and its replies in the first working view", async ({
    page,
  }) => {
    const pageId = "11111111-1111-4111-8111-111111111111";
    const templateVersionId = "22222222-2222-4222-8222-222222222222";

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "overview-session",
            userId: "overview-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "overview-user",
            name: "Overview User",
            email: "overview@example.com",
            emailVerified: true,
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
        },
      });
    });
    await page.route("**/api/v1/pages**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;

      if (pathname === "/api/v1/pages") {
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: pageId,
                recipientLabel: "For Maya",
                status: "DRAFT",
                contentVersion: 1,
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

      if (pathname === `/api/v1/pages/${pageId}/submissions`) {
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: "44444444-4444-4444-8444-444444444444",
                readState: "UNREAD",
                submittedAt: "2026-08-21T00:05:00.000Z",
                answerCount: 2,
                hasVisitorMessage: true,
              },
            ],
            unreadCount: 1,
            nextCursor: null,
          },
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "For Maya" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Continue writing", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open editor" }).first(),
    ).toHaveAttribute("href", `/dashboard/pages/${pageId}/edit`);
    await expect(
      page.getByRole("link", { name: "View replies" }),
    ).toHaveAttribute("href", `/dashboard/pages/${pageId}/responses`);
    await expect(
      page.getByRole("link", { name: /Unread reply.*For Maya/u }),
    ).toHaveAttribute(
      "href",
      `/dashboard/pages/${pageId}/responses?selected=44444444-4444-4444-8444-444444444444`,
    );

    await page.getByRole("link", { name: "Preview" }).first().click();
    const previewDialog = page.getByRole("dialog");
    await expect(previewDialog).toBeVisible();
    await expect(
      previewDialog.getByRole("link", { name: "Use this template" }),
    ).toBeVisible();
    await previewDialog
      .getByRole("button", { name: /Close .* preview/u })
      .click();
    await expect(
      page.getByRole("link", { name: "Use template" }).first(),
    ).toHaveAttribute("href", /\/create\?templateVersionId=/u);
  });

  test("recovers the overview when the page list fails once", async ({
    page,
  }) => {
    let pageRequestCount = 0;

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "recovery-session",
            userId: "recovery-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "recovery-user",
            name: "Recovery User",
            email: "recovery@example.com",
            emailVerified: true,
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
        },
      });
    });
    await page.route("**/api/v1/pages**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;

      if (pathname === "/api/v1/pages") {
        pageRequestCount += 1;

        if (pageRequestCount === 1) {
          await route.fulfill({
            status: 503,
            json: {
              error: {
                code: "TEMPORARILY_UNAVAILABLE",
                message: "Pages are temporarily unavailable.",
              },
            },
          });
          return;
        }

        await route.fulfill({
          status: 200,
          json: { items: [], nextCursor: null },
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "We could not find your latest page." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "We could not load your pages." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Try again" }).first().click();
    await expect.poll(() => pageRequestCount).toBe(2);
    await expect(
      page.getByRole("heading", { name: "Give your words a place to land." }),
    ).toBeVisible();
  });
});
