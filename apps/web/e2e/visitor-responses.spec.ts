import { expect, test } from "@playwright/test";

const pageId = "1f41e3c1-51b3-4a26-932c-aca7e11360cb";
const submissionId = "96666666-6666-4666-8666-666666666666";
const questionId = "51111111-1111-4111-8111-111111111111";

const ownerPage = {
  id: pageId,
  slug: "response-letter",
  canonicalUrl: null,
  recipientLabel: "For Sam",
  status: "PUBLISHED",
  contentVersion: 1,
  content: {
    recipientName: "Sam",
    mainMessage: "A private response test letter.",
    sections: [],
  },
  settings: {
    theme: "classic",
    fontStyle: "serif",
    autoPlayMusic: false,
    music: null,
    responsesEnabled: true,
  },
  template: {
    id: "33333333-3333-4333-8333-333333333333",
    key: "secret-letter",
    name: "Secret Letter",
    templateVersionId: "33333333-3333-4333-8333-333333333333",
    version: 1,
    registryKey: "secret-letter",
  },
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  images: [],
};

const session = {
  session: {
    id: "session-response-test",
    userId: "creator-response-test",
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  user: {
    id: "creator-response-test",
    name: "Response Creator",
    email: "creator@example.com",
    emailVerified: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
};

function responseSummary(readState: "UNREAD" | "READ" = "UNREAD") {
  return {
    id: submissionId,
    readState,
    submittedAt: "2026-08-16T01:00:00.000Z",
    answerCount: 1,
    hasVisitorMessage: true,
  };
}

function responseDetail(readState: "UNREAD" | "READ" = "UNREAD") {
  return {
    id: submissionId,
    pageId,
    readState,
    submittedAt: "2026-08-16T01:00:00.000Z",
    answers: [
      {
        questionId,
        promptSnapshot: "What do you remember?",
        choiceLabelSnapshot: "The happy moments",
        textAnswer: null,
      },
    ],
    visitorMessage: {
      promptSnapshot: "Private message",
      message: "A private note from the visitor.",
    },
  };
}

async function mockAuthenticatedResponseApi(
  page: import("@playwright/test").Page,
  options: {
    failDetailOnce?: boolean;
    failReadOnce?: boolean;
    failDeleteOnce?: boolean;
  } = {},
): Promise<{ getListCalls: number[] }> {
  let readState: "UNREAD" | "READ" = "UNREAD";
  let deleted = false;
  let failDetailOnce = options.failDetailOnce ?? false;
  let failReadOnce = options.failReadOnce ?? false;
  let failDeleteOnce = options.failDeleteOnce ?? false;
  const getListCalls: number[] = [];

  await page.route("**/api/auth/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
      await route.fulfill({ status: 200, json: session });
      return;
    }
    await route.continue();
  });

  await page.route(`**/api/v1/pages/${pageId}**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === "GET" && path.endsWith(`/pages/${pageId}`)) {
      await route.fulfill({ status: 200, json: ownerPage });
      return;
    }

    if (
      request.method() === "GET" &&
      path.endsWith(`/pages/${pageId}/submissions`)
    ) {
      getListCalls.push(Number(url.searchParams.get("size") ?? 0));
      await route.fulfill({
        status: 200,
        json: {
          items: deleted ? [] : [responseSummary(readState)],
          unreadCount: deleted || readState === "READ" ? 0 : 1,
          nextCursor: null,
        },
      });
      return;
    }

    if (
      request.method() === "GET" &&
      path.endsWith(`/pages/${pageId}/submissions/${submissionId}`)
    ) {
      if (failDetailOnce) {
        failDetailOnce = false;
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "The response could not be opened. Please try again.",
            requestId: "98888888-8888-4888-8888-888888888888",
          },
        });
        return;
      }
      if (deleted) {
        await route.fulfill({
          status: 404,
          json: {
            statusCode: 404,
            code: "SUBMISSION_NOT_FOUND",
            message: "Submission not found",
            requestId: "response-test",
          },
        });
        return;
      }
      await route.fulfill({ status: 200, json: responseDetail(readState) });
      return;
    }

    if (
      request.method() === "POST" &&
      path.endsWith(`/submissions/${submissionId}/read`)
    ) {
      if (failReadOnce) {
        failReadOnce = false;
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "The response could not be updated. Please try again.",
            requestId: "96666666-6666-4666-8666-666666666666",
          },
        });
        return;
      }
      readState = "READ";
      await route.fulfill({
        status: 200,
        json: { submissionId, readState: "READ" },
      });
      return;
    }

    if (
      request.method() === "DELETE" &&
      path.endsWith(`/submissions/${submissionId}`)
    ) {
      if (failDeleteOnce) {
        failDeleteOnce = false;
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "The response could not be deleted. Please try again.",
            requestId: "97777777-7777-4777-8777-777777777777",
          },
        });
        return;
      }
      deleted = true;
      await route.fulfill({ status: 200, json: { deleted: true } });
      return;
    }

    await route.continue();
  });

  return { getListCalls };
}

test.describe("visitor responses and creator dashboard", () => {
  test("AC-8, AC-9, AC-10, and AC-11 keep the owner response lifecycle private", async ({
    page,
  }) => {
    const { getListCalls } = await mockAuthenticatedResponseApi(page);
    await page.goto(`/dashboard/pages/${pageId}/responses`);
    await expect(
      page.getByRole("heading", { name: "Private inbox" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Unread (1)", exact: true }),
    ).toBeVisible();
    const response = page.getByRole("button", { name: /Anonymous response/ });
    await expect(response).toContainText("Unread");
    await expect(
      page.getByText("A private note from the visitor."),
    ).toHaveCount(0);
    expect(getListCalls).toContain(20);
    await response.click();
    const dialog = page.getByRole("dialog", {
      name: "Anonymous response",
      exact: true,
    });
    await expect(
      dialog.getByText("A private note from the visitor."),
    ).toBeVisible();
    await expect(dialog.getByRole("status")).toHaveText("Response is read.");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(response).not.toContainText("Unread");
    await expect(
      page.getByRole("link", { name: "Unread (0)", exact: true }),
    ).toBeVisible();
    await response.click();
    await dialog
      .getByRole("button", { name: "Delete response", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete response", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Response deleted.");
    await expect(
      page.getByRole("heading", { name: "No responses yet." }),
    ).toBeVisible();
    await expect(response).toHaveCount(0);
  });

  test("AC-14 keeps response dialogs keyboard reachable and restores focus", async ({
    page,
  }) => {
    await mockAuthenticatedResponseApi(page);
    await page.goto(`/dashboard/pages/${pageId}/responses`);
    const response = page.getByRole("button", { name: /Anonymous response/ });
    await response.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Anonymous response",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("A private note from the visitor."),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Close response", exact: true })
      .focus();
    await expect(
      dialog.getByRole("button", { name: "Close response", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(response).toBeFocused();
  });

  test("AC-14 announces mutation failures and supports explicit retries", async ({
    page,
  }) => {
    await mockAuthenticatedResponseApi(page, {
      failDetailOnce: true,
      failReadOnce: true,
      failDeleteOnce: true,
    });
    await page.goto(`/dashboard/pages/${pageId}/responses`);
    await page.getByRole("button", { name: /Anonymous response/ }).click();
    const dialog = page.getByRole("dialog", {
      name: "Anonymous response",
      exact: true,
    });
    await expect(
      dialog
        .getByRole("alert")
        .filter({ hasText: "Response could not be loaded." }),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await expect(
      dialog.getByText("A private note from the visitor."),
    ).toBeVisible();
    const readError = dialog
      .getByRole("alert")
      .filter({ hasText: "The response could not be updated." });
    await expect(readError).toContainText(
      "The response could not be updated. Please try again.",
    );
    await readError.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText("Response is read.");
    await dialog
      .getByRole("button", { name: "Delete response", exact: true })
      .click();
    const confirmation = page.getByRole("alertdialog");
    await confirmation
      .getByRole("button", { name: "Delete response", exact: true })
      .click();
    await expect(confirmation.getByRole("alert")).toContainText(
      "The response could not be deleted. Please try again.",
    );
    await confirmation
      .getByRole("button", { name: "Delete response", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Response deleted.");
  });
});
