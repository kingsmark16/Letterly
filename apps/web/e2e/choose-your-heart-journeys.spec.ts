import { expect, test } from "@playwright/test";
import {
  editorPageId,
  chooseYourHeartOwnerPage,
  starterJourneyGraph,
  journeyOwnerResponse,
} from "./fixtures/owner-page-editor";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const protectedJourneySlug = process.env.PUBLIC_CH_PROTECTED_SLUG;

// eslint-disable-next-line turbo/no-undeclared-env-vars
const publicJourneySlug = process.env.PUBLIC_CH_PUBLIC_SLUG;

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
    const openProtectedLetter = page.getByRole("button", {
      name: "Open your protected letter",
    });
    await expect(openProtectedLetter).toBeVisible();
    await expect(page.getByLabel("Password")).not.toBeVisible();
    await openProtectedLetter.click();
    await expect(
      page.getByRole("heading", { name: "This letter is protected." }),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toBeFocused();
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
    await page.getByRole("button", { name: "Send my answers" }).click();
    await expect(
      page.getByRole("heading", { name: "Thank you for sharing." }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
