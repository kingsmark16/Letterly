import { expect, test } from "@playwright/test";
import {
  updatePageQuestionRequestSchema,
  type PageQuestion,
} from "@letterly/contracts/questions";
import {
  editorPageId,
  questionId,
  choiceOneId,
  choiceTwoId,
  ownerPage,
  mockOwnerImage,
  openContentWorkspace,
} from "./fixtures/owner-page-editor";

test.describe("Secret Letter image editor persistence", () => {
  test("does not guess a question count after the query fails", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }

        await route.fulfill({
          status: 500,
          json: { message: "Questions temporarily unavailable" },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit?section=overview`);
    const overview = page.locator("#editor-panel-overview");
    await expect(
      overview.getByText("Questions unavailable", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(overview).not.toContainText("0 visitor");
    await expect(
      overview.getByRole("button", { name: "Retry questions" }),
    ).toBeVisible();
    await expect(
      overview.getByRole("img", { name: "3 of 4 letter details complete" }),
    ).toBeVisible();
  });

  test("AC-17 preserves unsaved letter fields while a question is saved", async ({
    page,
  }) => {
    let ownerReads = 0;
    let createdQuestionRequest: Record<string, unknown> | null = null;
    let savedContent = {
      recipientName: "Alex",
      mainMessage: "A letter that keeps its memories.",
    };
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as {
          recipientName: string;
          mainMessage: string;
        };
        savedContent = body;
      }
      await route.fulfill({
        status: 200,
        json: ownerPage(
          ownerReads > 1 ? 2 : 1,
          "A saved memory",
          "DRAFT",
          savedContent,
        ),
      });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, json: [] });
          return;
        }

        createdQuestionRequest = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
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
              endsJourney: false,
              nextQuestionId: null,
              choices: [
                {
                  id: choiceOneId,
                  key: "choice-one",
                  label: "The beginning",
                  displayOrder: 0,
                  creatorMessage: null,
                  endsJourney: false,
                  nextQuestionId: null,
                },
                {
                  id: choiceTwoId,
                  key: "choice-two",
                  label: "The middle",
                  displayOrder: 1,
                  creatorMessage: null,
                  endsJourney: false,
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
    await openContentWorkspace(page, "Questions");
    await page.getByRole("button", { name: "Add your first question" }).click();
    await page
      .getByRole("textbox", { name: /What should visitors answer/ })
      .fill("What do you remember?");
    await page.getByLabel("Choice 1 label").fill("The beginning");
    await page.getByLabel("Choice 2 label").fill("The middle");

    await page.getByRole("button", { name: "Add question" }).click();
    await expect(
      page.getByText(
        "First question added. It will appear first in the letter.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    expect(createdQuestionRequest).not.toBeNull();
    const createdRequest = createdQuestionRequest as unknown as Record<
      string,
      unknown
    >;
    expect(createdRequest).not.toHaveProperty("key");
    expect(createdRequest.displayOrder).toBeUndefined();
    await expect.poll(() => ownerReads).toBeGreaterThan(1);

    await expect(page.getByLabel("Who is this letter for?")).toHaveValue(
      "Unsent recipient",
    );
    await expect(page.getByLabel("Your message")).toHaveValue("Unsent message");
    await expect(
      page.getByRole("checkbox", { name: "Allow private responses" }),
    ).toHaveCount(0);
  });

  test("AC-9 keeps question edits and recovers a stale save version", async ({
    page,
  }) => {
    const currentQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      type: "PLAIN_MESSAGE",
      prompt: "What do you remember?",
      displayOrder: 0,
      choices: [],
    };
    let saveAttempts = 0;

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: [currentQuestion] });
          return;
        }
        saveAttempts += 1;
        if (saveAttempts === 1) {
          await route.fulfill({
            status: 409,
            json: {
              statusCode: 409,
              code: "STALE_VERSION",
              message: "This page changed elsewhere",
              requestId: "77777777-7777-4777-8777-777777777777",
              details: { currentContentVersion: 2 },
            },
          });
          return;
        }
        await route.fulfill({
          status: 200,
          json: {
            question: { ...currentQuestion, prompt: "A new memory?" },
            contentVersion: 3,
          },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Questions");
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const questionCard = questionList.locator(":scope > li").first();
    await questionCard.locator("summary").click();
    await questionCard.getByRole("button", { name: "Edit" }).click();
    await page
      .getByRole("textbox", { name: /What should visitors answer/ })
      .fill("A new memory?");
    await page.getByRole("button", { name: "Save question" }).click();

    await expect(page.getByText("Your edits are still here")).toBeVisible();
    await page.getByRole("button", { name: "Retry save" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Question saved." }),
    ).toBeVisible();
    expect(saveAttempts).toBe(2);
  });

  test("AC-9 allocates a fresh answer key after removing a middle answer", async ({
    page,
  }) => {
    const currentQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      type: "CHOICE",
      prompt: "What do you remember?",
      displayOrder: 0,
      choices: [
        {
          id: choiceOneId,
          label: "The beginning",
          displayOrder: 0,
          creatorMessage: null,
        },
        {
          id: choiceTwoId,
          label: "The middle",
          displayOrder: 1,
          creatorMessage: null,
        },
        {
          id: "88888888-8888-4888-8888-888888888888",
          label: "The end",
          displayOrder: 2,
          creatorMessage: null,
        },
      ],
    };
    let savedChoiceIds: string[] = [];

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: [currentQuestion] });
          return;
        }
        const payload = updatePageQuestionRequestSchema.parse(
          request.postDataJSON(),
        );
        savedChoiceIds = (payload.choices ?? [])
          .map((choice) => choice.id)
          .filter((id): id is string => Boolean(id));
        await route.fulfill({
          status: 200,
          json: { question: currentQuestion, contentVersion: 2 },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Questions");
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const questionCard = questionList.locator(":scope > li").first();
    await questionCard.locator("summary").click();
    await questionCard.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Remove choice 2" }).click();
    await page.getByRole("button", { name: "Add another choice" }).click();
    await page.getByLabel("Choice 3 label").fill("The replacement");
    await page.getByRole("button", { name: "Save question" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Question saved." }),
    ).toBeVisible();
    expect(savedChoiceIds).toHaveLength(2);
    expect(new Set(savedChoiceIds).size).toBe(2);
  });

  test("AC-3 and AC-4 reorder questions with the drag handle", async ({
    page,
  }) => {
    const firstQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      type: "CHOICE" as const,
      prompt: "What do you remember?",
      displayOrder: 0,
      choices: [
        {
          id: choiceOneId,
          label: "The happy moments",
          displayOrder: 0,
          creatorMessage: null,
        },
        {
          id: choiceTwoId,
          label: "The quiet moments",
          displayOrder: 1,
          creatorMessage: null,
        },
      ],
    };
    const secondQuestion: PageQuestion = {
      id: "77777777-7777-4777-8777-777777777777",
      pageId: editorPageId,
      type: "PLAIN_MESSAGE",
      prompt: "Tell me more",
      displayOrder: 1,
      choices: [],
    };
    let currentQuestions = [firstQuestion, secondQuestion];
    let currentVersion = 1;
    let savedRequest: Record<string, unknown> | null = null;

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(currentVersion) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: currentQuestions });
          return;
        }
        savedRequest = request.postDataJSON() as Record<string, unknown>;
        const payload = savedRequest as {
          questionIds?: string[];
          expectedContentVersion?: number;
        };
        const questionIds =
          payload.questionIds ??
          currentQuestions.map((question) => question.id);
        const questionsById = new Map(
          currentQuestions.map((question) => [question.id, question]),
        );
        currentQuestions = questionIds.map((id, displayOrder) => {
          const question = questionsById.get(id);
          if (!question) {
            throw new Error(`Unknown question id: ${id}`);
          }
          return { ...question, displayOrder };
        });
        currentVersion = (payload.expectedContentVersion ?? 1) + 1;
        await route.fulfill({
          status: 200,
          json: {
            questionIds: payload.questionIds,
            contentVersion: currentVersion,
          },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Questions");
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const firstCard = questionList.locator(":scope > li").nth(0);
    const secondCard = questionList.locator(":scope > li").nth(1);
    await firstCard.locator("summary").click();
    await firstCard
      .getByRole("button", { name: "Drag question 1 to reorder" })
      .dispatchEvent("dragstart");
    await secondCard.dispatchEvent("dragover");
    await secondCard.dispatchEvent("drop");

    await expect(
      page.getByRole("status").filter({ hasText: "Question order saved." }),
    ).toBeVisible();
    expect(savedRequest).not.toBeNull();
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 1,
      questionIds: [secondQuestion.id, firstQuestion.id],
    });
    await expect(questionList.locator(":scope > li").nth(0)).toContainText(
      "Tell me more",
    );
    await expect(questionList.locator(":scope > li").nth(1)).toContainText(
      "What do you remember?",
    );

    await firstCard
      .getByRole("button", { name: "Move question 1 down" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Question order saved." }),
    ).toBeVisible();
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 2,
      questionIds: [firstQuestion.id, secondQuestion.id],
    });
    await expect(questionList.locator(":scope > li").nth(0)).toContainText(
      "What do you remember?",
    );

    await page.reload();
    await openContentWorkspace(page, "Questions");
    await expect(
      page
        .getByRole("list", { name: "Questions in visitor order" })
        .locator(":scope > li")
        .nth(0),
    ).toContainText("What do you remember?");
  });

  test("AC-5 deletes a question without reference or branching errors", async ({
    page,
  }) => {
    const firstQuestion: PageQuestion = {
      id: questionId,
      pageId: editorPageId,
      type: "PLAIN_MESSAGE",
      prompt: "What do you remember?",
      displayOrder: 0,
      choices: [],
    };
    const secondQuestion: PageQuestion = {
      id: "77777777-7777-4777-8777-777777777777",
      pageId: editorPageId,
      type: "PLAIN_MESSAGE",
      prompt: "Tell me more",
      displayOrder: 1,
      choices: [],
    };
    let currentQuestions = [firstQuestion, secondQuestion];

    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ status: 200, json: currentQuestions });
          return;
        }
        currentQuestions = [firstQuestion];
        await route.fulfill({
          status: 200,
          json: { deleted: true, contentVersion: 2 },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Questions");
    const questionList = page.getByRole("list", {
      name: "Questions in visitor order",
    });
    const secondCard = questionList.locator(":scope > li").nth(1);
    await secondCard.locator("summary").click();
    await secondCard.getByRole("button", { name: "Remove question" }).click();
    const removalDialog = page.getByRole("dialog", {
      name: "Remove question?",
    });
    await expect(removalDialog).toBeVisible();
    await removalDialog
      .getByRole("button", { name: "Remove question", exact: true })
      .click();

    await expect(
      page.getByRole("status").filter({
        hasText: "Question deleted. The remaining questions stay in order.",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Questions in visitor order" })
        .locator(":scope > li")
        .filter({ hasText: "Tell me more" }),
    ).toHaveCount(0);
  });

  test("AC-7 keeps question actions inside the expanded accordion", async ({
    page,
  }) => {
    const questionIds = [
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
      "99999999-9999-4999-8999-999999999999",
    ];
    const prompts = ["First question", "Second question", "Third question"];
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() === "GET" && url.pathname.endsWith("/questions")) {
          await route.fulfill({
            status: 200,
            json: questionIds.map((id, index) => ({
              id,
              pageId: editorPageId,
              key: `question-${index + 1}`,
              type: "PLAIN_MESSAGE",
              prompt: prompts[questionIds.indexOf(id)] ?? "Question",
              displayOrder: index,
              config: null,
              endsJourney: false,
              nextQuestionId: null,
              choices: [],
            })),
          });
          return;
        }

        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Questions");
    const questions = page
      .getByRole("list", {
        name: "Questions in visitor order",
      })
      .locator(":scope > li");
    await expect(questions).toHaveCount(3);
    await expect(questions.nth(0)).toContainText("First question");
    await expect(questions.nth(1)).toContainText("Second question");
    await expect(questions.nth(2)).toContainText("Third question");
    await expect(
      page.getByRole("button", { name: /Move question .* (up|down)/ }),
    ).toHaveCount(6);
    await expect(
      questions.nth(0).getByRole("button", {
        name: "Move question 1 up",
      }),
    ).toBeDisabled();
    await expect(
      questions.nth(0).getByRole("button", {
        name: "Move question 1 down",
      }),
    ).toBeEnabled();
    await expect(
      questions.nth(2).getByRole("button", {
        name: "Move question 3 up",
      }),
    ).toBeEnabled();
    await expect(
      questions.nth(2).getByRole("button", {
        name: "Move question 3 down",
      }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(questions.getByRole("button", { name: "Delete" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: /Drag question .* to reorder/ }),
    ).toHaveCount(3);
    await expect(
      questions.nth(0).getByRole("button", {
        name: "Drag question 1 to reorder",
      }),
    ).toBeVisible();
    await questions.nth(0).locator("summary").click();
    await expect(
      questions.nth(0).getByRole("button", { name: "Edit" }),
    ).toBeVisible();
    await expect(
      questions.nth(0).getByRole("button", { name: "Delete" }),
    ).toBeVisible();
    await expect(
      questions.nth(0).getByRole("button", {
        name: "Drag question 1 to reorder",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add another question" }),
    ).toBeVisible();
    await expect(page.getByText("Retry reorder")).toHaveCount(0);
  });

  test("AC-1 renders question cards without branching controls and hides details while collapsed", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1) });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() === "GET" && url.pathname.endsWith("/questions")) {
          await route.fulfill({
            status: 200,
            json: [
              {
                id: questionId,
                pageId: editorPageId,
                key: "first-question",
                type: "CHOICE",
                prompt: "What do you remember?",
                displayOrder: 0,
                config: null,
                endsJourney: false,
                nextQuestionId: null,
                choices: [
                  {
                    id: choiceOneId,
                    key: "happy",
                    label: "The happy moments",
                    displayOrder: 0,
                    creatorMessage: null,
                    endsJourney: false,
                    nextQuestionId: null,
                  },
                  {
                    id: choiceTwoId,
                    key: "quiet",
                    label: "The quiet moments",
                    displayOrder: 1,
                    creatorMessage: null,
                    endsJourney: true,
                    nextQuestionId: null,
                  },
                ],
              },
            ],
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Questions");
    const flow = page.getByRole("group", { name: "Ordered question list" });
    const firstCard = flow
      .getByRole("list", { name: "Questions in visitor order" })
      .locator(":scope > li")
      .first();
    await expect(flow.getByRole("dialog")).toHaveCount(0);
    await expect(firstCard.locator("details")).not.toHaveAttribute("open");
    await expect(firstCard.getByText("The happy moments")).toBeHidden();
    await expect(firstCard.getByRole("button", { name: "Edit" })).toHaveCount(
      0,
    );
    await expect(firstCard.getByRole("button", { name: "Delete" })).toHaveCount(
      0,
    );
    await expect(flow.getByText("Next step")).toHaveCount(0);
    await expect(flow.getByText("Finish the journey")).toHaveCount(0);
    await expect(
      flow.getByRole("combobox", { name: /next step/i }),
    ).toHaveCount(0);
    await expect(
      flow.getByRole("button", { name: "Add another question" }),
    ).toHaveCount(1);
    await firstCard.locator("summary").click();
    await expect(firstCard.getByText("The happy moments")).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: "Delete" }),
    ).toBeVisible();
  });
});
