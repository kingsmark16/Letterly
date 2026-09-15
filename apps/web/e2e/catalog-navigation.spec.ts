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
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ height: 900, width });
      const targetNavigationWidth = await navigation.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(targetNavigationWidth.scrollWidth).toBeLessThanOrEqual(
        targetNavigationWidth.clientWidth,
      );
      const targetWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(targetWidth.scrollWidth).toBeLessThanOrEqual(
        targetWidth.clientWidth + 1,
      );
      if (width >= 1024) {
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

    await page.setViewportSize({ height: 900, width: 390 });
    const compactOverview = navigation.getByRole("link", {
      name: "Overview",
    });
    const compactPages = navigation.getByRole("link", { name: "My pages" });
    const compactResponses = navigation.getByRole("link", {
      name: "Responses",
    });
    const compactTemplates = navigation.getByRole("link", {
      name: "Templates",
    });
    const skipLink = page.getByRole("link", {
      name: "Skip to workspace content",
    });
    const mobileLogo = page.getByRole("link", { name: "Letterly overview" });
    const createLink = page.getByRole("link", { name: "Create", exact: true });
    const mobileSignOut = page.getByRole("button", {
      name: "Sign out",
      exact: true,
    });
    await mobileLogo.focus();
    await expect(mobileLogo).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(createLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(compactOverview).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(compactPages).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(compactResponses).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(compactTemplates).toBeFocused();
    await expect(compactTemplates).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Tab");
    await expect(mobileSignOut).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(mobileSignOut).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(compactTemplates).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/templates$/u);

    await page.goto("/dashboard/home");
    await expect(page).toHaveURL(/\/dashboard$/u);
  });

  test("renders dashboard catalog recovery and empty states", async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "catalog-state-session",
            userId: "catalog-state-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "catalog-state-user",
            name: "Catalog State User",
            email: "catalog-state@example.com",
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

    await page.goto("/dashboard?uiFixture=error");
    await expect(
      page.getByRole("heading", { name: "We could not load templates." }),
    ).toBeVisible();
    const catalogRecovery = page.getByRole("link", { name: "Try again" });
    await expect(catalogRecovery).toHaveAttribute(
      "href",
      "/templates",
    );
    await catalogRecovery.focus();
    await expect(catalogRecovery).toBeFocused();
    await expect(catalogRecovery).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/templates$/u);

    await page.goto("/dashboard?uiFixture=empty");
    await expect(
      page.getByText("No templates yet", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Return to the collection soon.", { exact: true }),
    ).toBeVisible();
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
    await page.emulateMedia({ reducedMotion: "no-preference" });
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
    await expect(
      page.locator("[data-dashboard-root] [data-dashboard-reveal]").first(),
    ).toHaveCSS("opacity", "1");
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

    const previewTrigger = page.getByRole("link", { name: "Preview" }).first();
    await previewTrigger.focus();
    await page.keyboard.press("Enter");
    const previewDialog = page.getByRole("dialog");
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog).toBeFocused();
    await expect(
      previewDialog.getByRole("link", { name: "Use this template" }),
    ).toBeVisible();
    const closePreview = previewDialog.getByRole("button", {
      name: /Close .* preview/u,
    });
    const useTemplate = previewDialog.getByRole("link", {
      name: "Use this template",
    });
    await page.keyboard.press("Tab");
    await expect(closePreview).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(useTemplate).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closePreview).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(previewDialog).not.toBeVisible();
    await expect(previewTrigger).toBeFocused();
    await expect(
      page.getByRole("link", { name: "Use template" }).first(),
    ).toHaveAttribute("href", /\/create\?templateVersionId=/u);

    const openEditor = page.getByRole("link", { name: "Open editor" }).first();
    const viewReplies = page.getByRole("link", { name: "View replies" });
    await openEditor.focus();
    await page.keyboard.press("Tab");
    await expect(viewReplies).toBeFocused();
    await expect(viewReplies).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/dashboard/pages/${pageId}/responses`);
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

    const pagesRetry = page.getByRole("button", { name: "Try again" }).first();
    await pagesRetry.focus();
    await expect(pagesRetry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => pageRequestCount).toBe(2);
    await expect(
      page.getByRole("heading", { name: "Give your words a place to land." }),
    ).toBeVisible();
  });

  test("recovers recent replies when a response query fails once", async ({
    page,
  }) => {
    const pageId = "55555555-5555-4555-8555-555555555555";
    let responseRequestCount = 0;

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "response-recovery-session",
            userId: "response-recovery-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "response-recovery-user",
            name: "Response Recovery User",
            email: "response-recovery@example.com",
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
                  id: "66666666-6666-4666-8666-666666666666",
                  key: "secret-letter",
                  name: "Secret Letter",
                  templateVersionId: "77777777-7777-4777-8777-777777777777",
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
        responseRequestCount += 1;

        if (responseRequestCount === 1) {
          await route.fulfill({
            status: 503,
            json: {
              error: {
                code: "TEMPORARILY_UNAVAILABLE",
                message: "Replies are temporarily unavailable.",
              },
            },
          });
          return;
        }

        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: "88888888-8888-4888-8888-888888888888",
                readState: "UNREAD",
                submittedAt: "2026-08-21T00:05:00.000Z",
                answerCount: 1,
                hasVisitorMessage: false,
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
      page.getByRole("heading", { name: "We could not check your replies." }),
    ).toBeVisible();

    const responseRetry = page.getByRole("button", { name: "Try again" }).last();
    await responseRetry.focus();
    await expect(responseRetry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => responseRequestCount).toBe(2);
    await expect(
      page.getByRole("link", { name: /Unread reply.*For Maya/u }),
    ).toBeVisible();
  });

  test("recovers a partial recent replies failure", async ({ page }) => {
    const firstPageId = "99999999-9999-4999-8999-999999999999";
    const secondPageId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    let firstResponseRequestCount = 0;
    let secondResponseRequestCount = 0;

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "partial-response-session",
            userId: "partial-response-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "partial-response-user",
            name: "Partial Response User",
            email: "partial-response@example.com",
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
                id: firstPageId,
                recipientLabel: "For Maya",
                status: "DRAFT",
                contentVersion: 1,
                template: {
                  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                  key: "secret-letter",
                  name: "Secret Letter",
                  templateVersionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                  version: 1,
                  registryKey: "confession.secret-letter",
                },
                createdAt: "2026-08-20T00:00:00.000Z",
                updatedAt: "2026-08-20T00:05:00.000Z",
              },
              {
                id: secondPageId,
                recipientLabel: "For Ari",
                status: "PUBLISHED",
                contentVersion: 1,
                template: {
                  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                  key: "secret-letter",
                  name: "Secret Letter",
                  templateVersionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                  version: 1,
                  registryKey: "confession.secret-letter",
                },
                createdAt: "2026-08-19T00:00:00.000Z",
                updatedAt: "2026-08-19T00:05:00.000Z",
              },
            ],
            nextCursor: null,
          },
        });
        return;
      }

      if (pathname === `/api/v1/pages/${firstPageId}/submissions`) {
        firstResponseRequestCount += 1;

        if (firstResponseRequestCount === 1) {
          await route.fulfill({
            status: 503,
            json: {
              error: {
                code: "TEMPORARILY_UNAVAILABLE",
                message: "Maya replies are temporarily unavailable.",
              },
            },
          });
          return;
        }

        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
                readState: "UNREAD",
                submittedAt: "2026-08-21T00:06:00.000Z",
                answerCount: 1,
                hasVisitorMessage: false,
              },
            ],
            unreadCount: 1,
            nextCursor: null,
          },
        });
        return;
      }

      if (pathname === `/api/v1/pages/${secondPageId}/submissions`) {
        secondResponseRequestCount += 1;
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: "12121212-1212-4121-8121-121212121212",
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
      page.getByText("Some replies are unavailable right now.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Unread reply.*For Ari/u }),
    ).toBeVisible();

    const partialResponseRetry = page.getByRole("button", {
      name: "Try again",
    });
    await partialResponseRetry.focus();
    await expect(partialResponseRetry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => firstResponseRequestCount).toBe(2);
    await expect.poll(() => secondResponseRequestCount).toBe(2);
    await expect(
      page.getByRole("link", { name: /Unread reply.*For Maya/u }),
    ).toBeVisible();
    await expect(
      page.getByText("Some replies are unavailable right now.", {
        exact: true,
      }),
    ).toHaveCount(0);
  });
});
