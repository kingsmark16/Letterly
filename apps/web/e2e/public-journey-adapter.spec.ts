import { expect, test, type Page } from "@playwright/test";
import {
  pageJourneySubmissionRequestSchema,
  type PageJourneySubmissionRequest,
} from "@letterly/contracts/page-journeys";
import { appOrigin } from "./support/app-origin";

async function mockPublicRequests(
  page: Page,
  failCount = 0,
  waitForRelease?: Promise<void>,
) {
  const submissions: {
    body: PageJourneySubmissionRequest;
    header: string | undefined;
  }[] = [];
  const metrics: Record<string, unknown>[] = [];
  await page.route("**/api/v1/public/pages/*/metrics", async (route) => {
    metrics.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 204 });
  });
  await page.route("**/p/*/visit**", (route) =>
    route.fulfill({ json: { viewId: null } }),
  );
  await page.route("**/p/*/responses", async (route) => {
    submissions.push({
      body: pageJourneySubmissionRequestSchema.parse(
        route.request().postDataJSON(),
      ),
      header: route.request().headers()["idempotency-key"],
    });
    if (waitForRelease) await waitForRelease;
    if (failCount-- > 0) {
      await route.fulfill({
        status: 503,
        json: {
          statusCode: 503,
          code: "SERVICE_UNAVAILABLE",
          message: "The response could not be sent. Please try again.",
          requestId: "55555555-5555-4555-8555-555555555555",
        },
      });
    } else await route.fulfill({ json: { accepted: true } });
  });
  return { submissions, metrics };
}

async function completeWarmJourney(page: Page) {
  await page
    .getByRole("button", {
      name: "Continue to Questions",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "The happy moments", exact: true })
    .click();
  await expect(
    page.getByText("Which result would you like to share?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Share the warm result", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A heart full of warmth", exact: true }),
  ).toBeVisible();
}

test("public journey submits answers and completes with outcome", async ({
  page,
}) => {
  const fixture = await mockPublicRequests(page);
  await page.goto("/p/fixture-heart");
  await completeWarmJourney(page);
  expect(fixture.submissions).toHaveLength(1);
  expect(fixture.submissions[0]?.header).toBe(
    fixture.submissions[0]?.body.idempotencyKey,
  );
  expect(fixture.submissions[0]?.body.answers).toEqual([
    { questionKey: "root", choiceKey: "happy" },
    { questionKey: "follow-up", choiceKey: "warm" },
  ]);
  expect(fixture.submissions[0]?.body.visitorMessage).toBeUndefined();
  await expect
    .poll(
      () =>
        fixture.metrics.filter((event) => event.event === "journey_completed")
          .length,
    )
    .toBe(1);
  expect(
    fixture.metrics.filter((event) => event.event === "journey_start"),
  ).toHaveLength(1);
  for (const metric of fixture.metrics) {
    expect(Object.keys(metric).sort()).toEqual(
      metric.event === "journey_start"
        ? ["event", "templateKey"]
        : ["event", "outcomeCategory", "templateKey"],
    );
  }
});

test("public journey displays error when submission fails", async ({
  page,
}) => {
  await mockPublicRequests(page, 1);
  await page.goto("/p/fixture-heart");
  await completeWarmJourney(page);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "The response could not be sent." }),
  ).toBeVisible();
});

test("disabled responses do not record submissions", async ({ page }) => {
  const fixture = await mockPublicRequests(page);
  await page.goto("/p/fixture-heart-disabled");
  await page
    .getByRole("button", {
      name: "Continue to Questions",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "The happy moments", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Share the warm result", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A heart full of warmth", exact: true }),
  ).toBeVisible();
  expect(fixture.submissions).toHaveLength(0);
});

test("public journey initial question is included in the server HTML", async ({
  request,
}) => {
  const response = await request.get("/p/fixture-heart-disabled");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("The happy moments</span></button>");
  expect(html).toContain("The quiet moments</span></button>");
  expect(html).toContain("Enable JavaScript to choose an answer");
});

test("registered public templates stay readable and keyboard usable on mobile with reduced motion", async ({
  page,
}) => {
  await mockPublicRequests(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);

  await page.goto("/p/fixture-letter");
  const openLetter = page.getByRole("button", {
    name: "Open your letter",
    exact: true,
  });
  await expect(openLetter).toBeVisible();
  await openLetter.focus();
  await expect(openLetter).toBeFocused();
  await page.keyboard.press("Enter");
  const recipientHeading = page.getByRole("heading", {
    name: "To Fixture Reader",
    exact: true,
  });
  await expect(recipientHeading).toBeVisible();
  await expect(recipientHeading).toBeFocused();
  await expect(page.locator("#heart-letter-heading")).toHaveText(
    "My favorite person, ♡",
  );
  await expect(page.locator("[data-message-spark]")).toHaveText("♡");
  await expect(
    page.getByText("Dear Fixture Reader,", { exact: true }),
  ).toBeVisible();
  const visibleLetterMessage = page.locator("[data-message-visual]");
  await expect(visibleLetterMessage).toContainText(
    "These words belong to the published letter.",
  );
  await expect(visibleLetterMessage).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.goto("/p/fixture-heart-disabled");
  await page
    .getByRole("button", {
      name: "Continue to Questions",
      exact: true,
    })
    .click();
  const firstChoice = page.getByRole("button", {
    name: "The happy moments",
    exact: true,
  });
  await expect(firstChoice).toBeVisible();
  const firstChoiceBox = await firstChoice.boundingBox();
  expect(firstChoiceBox?.height).toBeGreaterThanOrEqual(44);

  await firstChoice.focus();
  await expect(firstChoice).toBeFocused();
  await page.keyboard.press("Enter");

  const followUpChoice = page.getByRole("button", {
    name: "Share the warm result",
    exact: true,
  });
  await expect(followUpChoice).toBeVisible();
  const followUpChoiceBox = await followUpChoice.boundingBox();
  expect(followUpChoiceBox?.height).toBeGreaterThanOrEqual(44);
  await followUpChoice.focus();
  await expect(followUpChoice).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", { name: "A heart full of warmth", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("public template routes load only their registered renderer bundle", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");

  async function inspectRoute(path: string, initialButton: string) {
    const context = await browser.newContext({
      baseURL: appOrigin,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const scripts: Array<{ path: string; body: Buffer }> = [];
    const pendingScripts: Promise<void>[] = [];

    page.on("response", (response) => {
      const assetPath = new URL(response.url()).pathname;
      if (
        !assetPath.startsWith("/_next/static/chunks/") ||
        !assetPath.endsWith(".js")
      ) {
        return;
      }
      pendingScripts.push(
        response.body().then((body) => {
          scripts.push({ path: assetPath, body });
        }),
      );
    });

    await mockPublicRequests(page);
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: initialButton, exact: true }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await Promise.all(pendingScripts);

    const source = scripts.map(({ body }) => body.toString("utf8")).join("\n");
    const bundle = {
      scriptPaths: [...new Set(scripts.map(({ path }) => path))].sort(),
      scriptCount: scripts.length,
      scriptBytes: scripts.reduce(
        (total, script) => total + script.body.length,
        0,
      ),
      includesSecretLetter: source.includes("Open your letter"),
      includesChooseYourHeart: source.includes("Return to letter"),
    };
    await context.close();
    return bundle;
  }

  const secretLetter = await inspectRoute(
    "/p/fixture-letter",
    "Open your letter",
  );
  const chooseYourHeart = await inspectRoute(
    "/p/fixture-heart-disabled",
    "Continue to Questions",
  );

  console.info(
    JSON.stringify({
      event: "public-template-bundle-measurement",
      secretLetter,
      chooseYourHeart,
    }),
  );
  expect(secretLetter.includesSecretLetter).toBe(true);
  expect(secretLetter.includesChooseYourHeart).toBe(false);
  expect(chooseYourHeart.includesChooseYourHeart).toBe(true);
  expect(chooseYourHeart.includesSecretLetter).toBe(false);
});
