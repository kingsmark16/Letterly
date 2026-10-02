import { expect, test, type Page } from "@playwright/test";
import { chooseYourHeartDefaultGraph } from "@letterly/templates";
import {
  pageJourneyOwnerResponseSchema,
  pageJourneySaveRequestSchema,
} from "@letterly/contracts/page-journeys";

const pageId = "55555555-5555-4555-8555-555555555555";
const now = "2026-10-02T00:00:00.000Z";

async function mockJourney(
  page: Page,
  options: {
    failLoad?: boolean;
    failSave?: boolean;
    published?: boolean;
    registryKey?: string;
    version?: number;
  } = {},
) {
  let failOwnerRead = false;
  let failLoad = options.failLoad ?? false;
  let failSave = options.failSave ?? false;
  let remote = pageJourneyOwnerResponseSchema.parse({
    draft: {
      ...structuredClone(chooseYourHeartDefaultGraph),
      revisionNumber: 1,
    },
    contentVersion: 1,
    publishedGraphVersion: options.published ? 1 : null,
    validation: { valid: true, issues: [] },
  });
  const savedVersions: number[] = [];
  const requests: string[] = [];
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "journey-session",
          userId: "journey-owner",
          expiresAt: "2099-01-01T00:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        },
        user: {
          id: "journey-owner",
          name: "Journey Owner",
          email: "journey@example.com",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  );
  await page.route("**/api/v1/pages/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${path}`);
    if (path === `/api/v1/pages/${pageId}/choose-your-heart`) {
      if (
        (request.method() === "GET" && failLoad) ||
        (request.method() === "PUT" && failSave)
      ) {
        if (request.method() === "GET") failLoad = false;
        else failSave = false;
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "Journey service is temporarily unavailable.",
            requestId: pageId,
          },
        });
        return;
      }
      if (request.method() === "PUT") {
        const input = pageJourneySaveRequestSchema.parse(
          request.postDataJSON(),
        );
        savedVersions.push(input.expectedContentVersion);
        remote = {
          ...remote,
          draft: { ...input, revisionNumber: remote.draft.revisionNumber + 1 },
          contentVersion: remote.contentVersion + 1,
        };
      }
      await route.fulfill({ json: remote });
      return;
    }
    if (path.endsWith("/questions")) {
      await route.fulfill({ json: [] });
      return;
    }
    if (path === `/api/v1/pages/${pageId}`) {
      if (failOwnerRead) {
        failOwnerRead = false;
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "Page service is temporarily unavailable.",
          },
        });
        return;
      }
      await route.fulfill({
        json: {
          id: pageId,
          slug: "journey-test",
          canonicalUrl: options.published
            ? "http://127.0.0.1:3100/p/journey-test"
            : null,
          passwordProtected: false,
          recipientLabel: "My journey",
          status: options.published ? "PUBLISHED" : "DRAFT",
          contentVersion: remote.contentVersion,
          content: { recipientName: "", mainMessage: "", sections: [] },
          settings: {
            theme: "romantic",
            fontStyle: "handwritten",
            autoPlayMusic: false,
            music: null,
            responsesEnabled: false,
          },
          template: {
            id: "33333333-3333-4333-8333-333333333333",
            key: "choose-your-heart",
            name: "Choose Your Heart",
            templateVersionId: "44444444-4444-4444-8444-444444444444",
            registryKey: options.registryKey ?? "confession.choose-your-heart",
            version: options.version ?? 1,
          },
          createdAt: now,
          updatedAt: now,
          images: [],
        },
      });
      return;
    }
    await route.fulfill({
      status: 503,
      json: { error: "Unmocked owner request" },
    });
  });
  return {
    savedVersions,
    requests,
    failOwnerRead() {
      failOwnerRead = true;
    },
    advanceRemote() {
      remote = structuredClone(remote);
      remote.contentVersion++;
      remote.draft.revisionNumber++;
      remote.draft.questions[0]!.prompt = "A newer server prompt";
    },
  };
}

test("journey editor retries loading and saving without discarding edits", async ({
  page,
}) => {
  const { savedVersions } = await mockJourney(page, {
    failLoad: true,
    failSave: true,
  });
  await page.goto(`/dashboard/pages/${pageId}/edit`);
  await expect(
    page.getByRole("heading", { name: "Journey unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  const prompt = page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .first();
  await prompt.fill("What makes you smile?");
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Journey service is temporarily unavailable." }),
  ).toBeVisible();
  await expect(prompt).toHaveValue("What makes you smile?");
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved as version 2." }),
  ).toBeVisible();
  expect(savedVersions).toEqual([1]);
  await page.reload();
  await expect(prompt).toHaveValue("What makes you smile?");
});

test("journey editor preserves unsaved changes until explicit reload after a remote update", async ({
  page,
}) => {
  const fixture = await mockJourney(page);
  await page.goto(`/dashboard/pages/${pageId}/edit`);
  const prompt = page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .first();
  await prompt.fill("My unsaved prompt");
  fixture.advanceRemote();
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/pages/${pageId}/choose-your-heart`) &&
      response.request().method() === "GET",
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await refreshed;
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "A newer saved journey is available." }),
  ).toBeVisible();
  await expect(prompt).toHaveValue("My unsaved prompt");
  await expect(
    page.getByRole("button", { name: "Save journey", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reload saved journey", exact: true })
    .click();
  await expect(prompt).toHaveValue("A newer server prompt");
  await expect(
    page.getByRole("button", { name: "Save journey", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved as version 3." }),
  ).toBeVisible();
  expect(fixture.savedVersions).toEqual([2]);
});

test("published journeys keep graph controls read only", async ({ page }) => {
  const fixture = await mockJourney(page, { published: true });
  await page.goto(`/dashboard/pages/${pageId}/edit`);
  await expect(
    page.getByRole("heading", { name: "Shape the journey" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Prompt", exact: true }).first(),
  ).toHaveAttribute("readonly", "");
  for (const name of ["Save journey", "Add question", "Add result"])
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: /^Starting question/ }),
  ).toBeDisabled();
  expect(fixture.savedVersions).toEqual([]);
});

test("journey dispatch avoids Secret Letter requests and preserves dirty exit confirmation", async ({
  page,
}) => {
  const fixture = await mockJourney(page);
  await page.goto(`/dashboard/pages/${pageId}/edit`);
  const prompt = page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .first();
  await prompt.fill("Keep my unsaved journey.");
  await page.getByRole("link", { name: "Back", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(prompt).toHaveValue("Keep my unsaved journey.");
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await expect(
    page.getByText("Saved as version 2.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/pages$/);
  expect(
    fixture.requests.filter(
      (request) =>
        request.includes("/questions") || request.startsWith("PATCH "),
    ),
  ).toEqual([]);
});

test("creator dispatch rejects mismatched registry keys and unsupported versions before loading a template", async ({
  page,
}) => {
  for (const options of [
    { registryKey: "confession.secret-letter" },
    { version: 999 },
  ]) {
    const fixture = await mockJourney(page, options);
    await page.goto(`/dashboard/pages/${pageId}/edit`);
    await expect(
      page.getByRole("heading", {
        name: "This design version is unavailable.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Prompt", exact: true }),
    ).toHaveCount(0);
    expect(
      fixture.requests.filter(
        (request) =>
          request.includes("/choose-your-heart") ||
          request.includes("/questions"),
      ),
    ).toEqual([]);
    await page.unroute("**/api/v1/pages/**");
  }
});

test("owner refresh errors preserve the mounted editor and unsaved journey", async ({
  page,
}) => {
  const fixture = await mockJourney(page);
  await page.goto(`/dashboard/pages/${pageId}/edit`);
  const prompt = page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .first();
  await prompt.fill("Keep my unsaved words");
  fixture.failOwnerRead();
  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    page.getByRole("heading", { name: "We could not open this letter." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveValue("Keep my unsaved words");
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved as version 2." }),
  ).toBeVisible();
  expect(fixture.savedVersions).toEqual([1]);
});
