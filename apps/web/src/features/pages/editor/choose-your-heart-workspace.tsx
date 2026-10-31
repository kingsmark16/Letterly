"use client";

import type { PageJourneyOwnerResponse } from "@letterly/contracts/page-journeys";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import type { PageQuestion } from "@letterly/contracts/questions";
import {
  countGraphemes,
  hasAtMostGraphemes,
} from "@letterly/templates/graphemes";
import {
  DEFAULT_JOURNEY_COMPLETION_OUTCOME,
  isPageJourneyTextQuestion,
  EMPTY_JOURNEY_QUESTION_KEY,
  normalizeLinearPageJourneyGraph,
  type PageJourneyGraph,
} from "@letterly/templates/journey";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import { getOwnerPageJourney, saveOwnerPageJourney } from "../api/journeys";
import { savePage } from "../api/lifecycle";
import { type WebApiError } from "../../../lib/api/errors";
import { pageKeys } from "../api/query-keys";
import { DeletePageControl } from "./delete-page-control";
import styles from "./draft-editor.module.css";
import { EditorAnalytics } from "./editor-analytics";
import type { PageEditorProps } from "./editor-context";
import { EditorJourneyPreview } from "./editor-journey-preview";
import { EditorOverview } from "./editor-overview";
import { EditorSectionNav, type EditorSection } from "./editor-section-nav";
import { EditorSettings } from "./editor-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./editor-tabs";
import {
  getJourneyEditorState,
  type JourneyDraft,
} from "./journey-editor-state";
import questionStyles from "./question-editor.module.css";
import {
  QuestionFormDialog,
  type QuestionChoiceDraft,
  type QuestionFormType,
} from "./question-form-dialog";
import {
  MAX_EDITOR_CHOICE_LABEL_LENGTH,
  MAX_EDITOR_QUESTION_PROMPT_LENGTH,
} from "./question-limits";
import { QuestionList } from "./question-list";

interface ChooseYourHeartLetterDraft {
  title: string;
  recipientName: string;
  mainMessage: string;
  creatorName: string;
}

type ContentWorkspace = "basics" | "questions";

const contentWorkspaceOrder: ContentWorkspace[] = ["basics", "questions"];

function isContentWorkspace(value: string): value is ContentWorkspace {
  return contentWorkspaceOrder.includes(value as ContentWorkspace);
}

function ContentTabIcon({
  workspace,
}: {
  workspace: ContentWorkspace;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={styles.workspaceTabIcon}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {workspace === "basics" ? (
        <>
          <path d="m5 16.75-.75 3 3-.75L18.5 7.75a2.12 2.12 0 0 0-3-3L5 16.75Z" />
          <path d="m13.75 6.25 3 3" />
        </>
      ) : (
        <>
          <path d="M20 11.5a8 8 0 0 1-8 8H7l-3 1v-4.25A8 8 0 1 1 20 11.5Z" />
          <path d="M10 9.25a2 2 0 1 1 3.5 1.25c-.75.8-1.5 1.1-1.5 2.5" />
          <path d="M12 16h.01" />
        </>
      )}
    </svg>
  );
}

function createNodeKey(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function toLetterDraft(
  content: OwnerPageProjection["content"],
): ChooseYourHeartLetterDraft {
  return {
    title: content.title ?? "",
    recipientName: content.recipientName ?? "",
    mainMessage: content.mainMessage ?? "",
    creatorName: content.creatorName ?? "",
  };
}

function isSameLetterDraft(
  left: ChooseYourHeartLetterDraft,
  right: ChooseYourHeartLetterDraft,
): boolean {
  return (
    left.title === right.title &&
    left.recipientName === right.recipientName &&
    left.mainMessage === right.mainMessage &&
    left.creatorName === right.creatorName
  );
}

function pathText(error: WebApiError): string {
  if (!error.details || !("issues" in error.details)) return error.message;
  return error.details.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
    .join("; ");
}

function toPageQuestions(
  pageId: string,
  graph: PageJourneyGraph,
): PageQuestion[] {
  return graph.questions
    .filter((question) => question.key !== EMPTY_JOURNEY_QUESTION_KEY)
    .map((question, index) => {
      const isText = isPageJourneyTextQuestion(question);
      return {
        id: question.key,
        pageId,
        type: isText ? "PLAIN_MESSAGE" : "CHOICE",
        prompt: question.prompt,
        displayOrder: index,
        choices: isText
          ? []
          : question.choices.map((choice, choiceIndex) => ({
              id: choice.key,
              label: choice.label,
              displayOrder: choiceIndex,
              creatorMessage: null,
            })),
      };
    });
}

function initialChoices(): QuestionChoiceDraft[] {
  return [{ label: "" }, { label: "" }];
}

export function ChooseYourHeartWorkspace({
  pageQuery,
}: PageEditorProps): React.JSX.Element {
  const page = pageQuery.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPublished = page.status === "PUBLISHED";
  const readOnly = isPublished;

  const [activeSection, setActiveSection] = useState<EditorSection>(() =>
    page.status === "PUBLISHED" ? "analytics" : "content",
  );
  const [activeContentWorkspace, setActiveContentWorkspace] =
    useState<ContentWorkspace>("basics");
  const [leaveOpen, setLeaveOpen] = useState(false);

  const journeyKey = useMemo(() => ["page-journey", page.id], [page.id]);
  const journeyQuery = useQuery<PageJourneyOwnerResponse, WebApiError>({
    queryKey: journeyKey,
    queryFn: ({ signal }) => getOwnerPageJourney(page.id, { signal }),
  });

  const [draft, setDraft] = useState<JourneyDraft | null>(null);
  const [letterDraft, setLetterDraft] =
    useState<ChooseYourHeartLetterDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Saved");

  const [qType, setQType] = useState<QuestionFormType>("CHOICE");
  const [qPrompt, setQPrompt] = useState("");
  const [qChoices, setQChoices] =
    useState<QuestionChoiceDraft[]>(initialChoices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    question: PageQuestion;
    returnToEditor: boolean;
  } | null>(null);
  const [questionMessage, setQuestionMessage] = useState<string | null>(null);
  const [questionMessageKind, setQuestionMessageKind] = useState<
    "status" | "error"
  >("status");

  const baselineLetter = useMemo(
    () => toLetterDraft(page.content),
    [page.content],
  );
  const currentLetter = letterDraft ?? baselineLetter;
  const letterDirty =
    letterDraft !== null && !isSameLetterDraft(letterDraft, baselineLetter);

  const state = getJourneyEditorState(journeyQuery.data, draft);
  const dirty = !readOnly && ((state?.isDirty ?? false) || letterDirty);
  const hasSavedContent =
    page.contentVersion > 0 ||
    (state?.baseline.contentVersion ?? 0) > 0 ||
    (state?.baseline.draft.revisionNumber ?? 1) > 1 ||
    Boolean(
      baselineLetter.recipientName.trim() || baselineLetter.mainMessage.trim(),
    );

  useEffect(() => {
    if (!isPublished && activeSection === "analytics") {
      setActiveSection("content");
    }
  }, [activeSection, isPublished]);

  useEffect(() => {
    function warnBeforeExit(event: BeforeUnloadEvent): void {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [dirty]);

  const saveMutation = useMutation<
    PageJourneyOwnerResponse,
    WebApiError,
    { graph: PageJourneyGraph; letter: ChooseYourHeartLetterDraft }
  >({
    mutationFn: async ({ graph, letter }) => {
      if (readOnly || !state) {
        throw new Error("Unpublish this letter before editing it.");
      }

      let expectedContentVersion = state.baseline.contentVersion;
      if (letterDirty) {
        const updatedPage = await savePage(page.id, {
          expectedContentVersion,
          title: letter.title.trim(),
          recipientName: letter.recipientName.trim(),
          mainMessage: letter.mainMessage.trim(),
          creatorName: letter.creatorName.trim(),
        });
        queryClient.setQueryData(pageKeys.detail(page.id), updatedPage);
        expectedContentVersion = updatedPage.contentVersion;
      }

      const normalizedGraph = normalizeLinearPageJourneyGraph(graph);
      return saveOwnerPageJourney(page.id, {
        ...normalizedGraph,
        expectedContentVersion,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(journeyKey, response);
      setDraft(null);
      setLetterDraft(null);
      setSaveError(null);
      setStatusMessage(`Saved as version ${response.contentVersion}.`);
      void queryClient.invalidateQueries({
        queryKey: pageKeys.detail(page.id),
      });
      void journeyQuery.refetch();
    },
    onError: (error) => {
      setSaveError(pathText(error));
      setStatusMessage("We could not save your changes.");
    },
  });

  const currentGraph = state?.graph ?? journeyQuery.data?.draft ?? null;
  const completionOutcome =
    currentGraph?.outcomes[0] ?? DEFAULT_JOURNEY_COMPLETION_OUTCOME;

  const pageQuestions = useMemo(
    () => (currentGraph ? toPageQuestions(page.id, currentGraph) : []),
    [currentGraph, page.id],
  );
  const choiceQuestions = useMemo(
    () => pageQuestions.filter((question) => question.type === "CHOICE"),
    [pageQuestions],
  );
  const totalChoiceCount = useMemo(
    () =>
      choiceQuestions.reduce(
        (total, question) => total + question.choices.length,
        0,
      ),
    [choiceQuestions],
  );

  function updateLetterField(
    field: keyof ChooseYourHeartLetterDraft,
    value: string,
  ): void {
    if (readOnly) return;
    setLetterDraft({
      ...currentLetter,
      [field]: value,
    });
    setSaveError(null);
    setStatusMessage("Unsaved changes");
  }

  function updateGraph(
    updater: (graph: PageJourneyGraph) => PageJourneyGraph,
  ): void {
    if (readOnly || !state) return;
    const nextGraph = normalizeLinearPageJourneyGraph(updater(state.graph));
    setDraft({
      baseline: state.baseline,
      graph: nextGraph,
    });
    setSaveError(null);
    setStatusMessage("Unsaved changes");
  }

  function setQuestionFeedback(
    message: string | null,
    kind: "status" | "error" = "status",
  ): void {
    setQuestionMessage(message);
    setQuestionMessageKind(kind);
  }

  function resetQuestionForm(): void {
    setPendingRemoval(null);
    setEditingId(null);
    setIsCreating(false);
    setQType("CHOICE");
    setQPrompt("");
    setQChoices(initialChoices());
  }

  function beginNewQuestion(): void {
    if (readOnly) return;
    if (pageQuestions.length >= 12) {
      setQuestionFeedback(
        "Choose Your Heart can contain at most 12 questions.",
        "error",
      );
      return;
    }
    resetQuestionForm();
    setIsCreating(true);
    setQuestionFeedback(null);
  }

  function beginEditQuestion(question: PageQuestion): void {
    if (readOnly) return;
    setPendingRemoval(null);
    setIsCreating(false);
    setEditingId(question.id);
    setQType(question.type);
    setQPrompt(question.prompt);
    setQChoices(
      question.type === "CHOICE" && question.choices.length >= 2
        ? question.choices.map((choice) => ({
            id: choice.id,
            label: choice.label,
            creatorMessage: choice.creatorMessage,
          }))
        : initialChoices(),
    );
    setQuestionFeedback(null);
  }

  function closeQuestionEditor(): void {
    setPendingRemoval(null);
    resetQuestionForm();
    setQuestionFeedback(null);
  }

  function changeQuestionType(nextType: QuestionFormType): void {
    setQType(nextType);
    if (nextType === "CHOICE") {
      setQChoices((current) =>
        current.length >= 2 ? current.slice(0, 4) : initialChoices(),
      );
    }
  }

  function changeQuestionChoice(
    index: number,
    patch: Partial<QuestionChoiceDraft>,
  ): void {
    setQChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...patch } : choice,
      ),
    );
  }

  function addQuestionChoice(): void {
    setQChoices((current) =>
      current.length >= 4 ? current : [...current, { label: "" }],
    );
  }

  function removeQuestionChoice(index: number): void {
    setQChoices((current) =>
      current.length <= 2
        ? current
        : current.filter((_, choiceIndex) => choiceIndex !== index),
    );
  }

  function saveQuestionDialog(): void {
    if (readOnly || !state) return;
    const trimmedPrompt = qPrompt.trim();
    if (!trimmedPrompt) {
      setQuestionFeedback("Add a prompt before saving this question.", "error");
      return;
    }
    if (
      trimmedPrompt.length > MAX_EDITOR_QUESTION_PROMPT_LENGTH ||
      !hasAtMostGraphemes(trimmedPrompt, 200)
    ) {
      setQuestionFeedback(
        "Keep the question to 200 characters or fewer.",
        "error",
      );
      return;
    }

    if (qType === "CHOICE") {
      const validChoices =
        qChoices.length >= 2 &&
        qChoices.length <= 4 &&
        qChoices.every((choice) => Boolean(choice.label.trim()));
      if (!validChoices) {
        setQuestionFeedback(
          "Add between 2 and 4 choices, each with a label.",
          "error",
        );
        return;
      }
      if (
        qChoices.some(
          (choice) =>
            choice.label.trim().length > MAX_EDITOR_CHOICE_LABEL_LENGTH ||
            !hasAtMostGraphemes(choice.label.trim(), 80),
        )
      ) {
        setQuestionFeedback(
          "Keep each choice to 80 characters or fewer.",
          "error",
        );
        return;
      }
    }

    updateGraph((graph) => {
      const outcomeKey = graph.outcomes[0]?.key ?? completionOutcome.key;
      if (editingId) {
        return {
          ...graph,
          questions: graph.questions.map((question) => {
            if (question.key !== editingId) return question;
            if (qType === "PLAIN_MESSAGE") {
              return {
                ...question,
                prompt: trimmedPrompt,
                choices: [
                  {
                    key: question.choices[0]?.key ?? createNodeKey("text"),
                    label: "Written answer",
                    displayOrder: 0,
                    nextQuestionKey: null,
                    outcomeKey,
                  },
                ],
              };
            }
            return {
              ...question,
              prompt: trimmedPrompt,
              choices: qChoices.slice(0, 4).map((choice, index) => ({
                key:
                  choice.id ??
                  question.choices[index]?.key ??
                  createNodeKey("choice"),
                label: choice.label.trim(),
                displayOrder: index,
                nextQuestionKey: null,
                outcomeKey,
              })),
            };
          }),
        };
      }

      const newQuestion =
        qType === "PLAIN_MESSAGE"
          ? {
              key: createNodeKey("question"),
              prompt: trimmedPrompt,
              displayOrder: graph.questions.length,
              choices: [
                {
                  key: createNodeKey("text"),
                  label: "Written answer",
                  displayOrder: 0,
                  nextQuestionKey: null,
                  outcomeKey,
                },
              ],
            }
          : {
              key: createNodeKey("question"),
              prompt: trimmedPrompt,
              displayOrder: graph.questions.length,
              choices: qChoices.slice(0, 4).map((choice, index) => ({
                key: createNodeKey("choice"),
                label: choice.label.trim(),
                displayOrder: index,
                nextQuestionKey: null,
                outcomeKey,
              })),
            };

      return {
        ...graph,
        questions: [...graph.questions, newQuestion],
      };
    });

    setQuestionFeedback(
      editingId ? "Question updated." : "Question added.",
      "status",
    );
    resetQuestionForm();
  }

  function requestDeleteQuestion(
    question: PageQuestion,
    returnToEditor = false,
  ): void {
    if (readOnly || !state) return;

    if (!returnToEditor) {
      setIsCreating(false);
      setEditingId(question.id);
      setQType(question.type);
      setQPrompt(question.prompt);
      setQChoices(
        question.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          creatorMessage: choice.creatorMessage,
        })),
      );
    }
    setQuestionFeedback(null);
    setPendingRemoval({ question, returnToEditor });
  }

  function confirmQuestionRemoval(): void {
    if (!pendingRemoval || readOnly || !state) return;
    updateGraph((graph) => ({
      ...graph,
      questions: graph.questions.filter(
        (item) => item.key !== pendingRemoval.question.id,
      ),
    }));
    setQuestionFeedback(
      "Question removed. Save changes to update your letter.",
      "status",
    );
    resetQuestionForm();
  }

  function cancelQuestionRemoval(): void {
    const returnToEditor = pendingRemoval?.returnToEditor ?? false;
    setPendingRemoval(null);
    setQuestionFeedback(null);
    if (!returnToEditor) closeQuestionEditor();
  }

  function handleReorderQuestions(questionIds: string[]): void {
    if (readOnly || !state) return;

    updateGraph((graph) => {
      const byKey = new Map(
        graph.questions.map((question) => [question.key, question]),
      );
      const reordered = questionIds
        .map((id) => byKey.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      if (reordered.length !== graph.questions.length) return graph;
      return {
        ...graph,
        questions: reordered,
      };
    });
    setQuestionFeedback("Question order updated.", "status");
  }

  function handleLifecycleChanged(): void {
    void queryClient.invalidateQueries({
      queryKey: pageKeys.detail(page.id),
    });
    void queryClient.invalidateQueries({ queryKey: pageKeys.all });
    void queryClient.invalidateQueries({ queryKey: journeyKey });
  }

  function changeSection(nextSection: EditorSection): void {
    setActiveSection(nextSection);
  }

  const contentWorkspaceIndex = contentWorkspaceOrder.indexOf(
    activeContentWorkspace,
  );
  const previousContentWorkspace =
    contentWorkspaceIndex > 0
      ? contentWorkspaceOrder[contentWorkspaceIndex - 1]
      : null;
  const nextContentWorkspace =
    contentWorkspaceIndex >= 0 &&
    contentWorkspaceIndex < contentWorkspaceOrder.length - 1
      ? contentWorkspaceOrder[contentWorkspaceIndex + 1]
      : null;

  const titleCount = countGraphemes(currentLetter.title);
  const recipientCount = countGraphemes(currentLetter.recipientName);
  const creatorCount = countGraphemes(currentLetter.creatorName);
  const messageCount = countGraphemes(currentLetter.mainMessage);

  const isQuestionFormOpen = !readOnly && Boolean(editingId || isCreating);
  const editingQuestion = pageQuestions.find(
    (question) => question.id === editingId,
  );

  const questionFeedbackNode = questionMessage ? (
    <div
      className={questionStyles.feedback}
      data-kind={questionMessageKind}
      role={questionMessageKind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className={questionStyles.feedbackMark} aria-hidden="true" />
      <p className={questionStyles.feedbackMessage}>{questionMessage}</p>
    </div>
  ) : null;

  return (
    <main
      className={styles.page}
      data-editor-page="true"
      data-expanded-preview={activeSection === "preview" ? "true" : undefined}
      data-editor-workspace={activeContentWorkspace}
      data-editor-section={activeSection}
      id="dashboard-content"
    >
      <div className={styles.editorShell}>
        <h1 className="sr-only">Edit letter</h1>
        <h2 className="sr-only">Shape the journey</h2>
        <p className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </p>
        <div className={styles.editorTopline}>
          <Link
            className={styles.backLink}
            href="/dashboard/pages"
            aria-label="Back to My Letters"
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                setLeaveOpen(true);
              }
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Back</span>
          </Link>

          <EditorSectionNav
            activeSection={activeSection}
            onChange={changeSection}
            published={isPublished}
          />
        </div>

        <div
          className={`${styles.editorGrid} ${
            activeSection === "content" ? styles.editorGridWriting : ""
          }`}
        >
          <div className={styles.editorPane}>
            <div className={styles.editorContent}>
              {state?.refreshConflict ? (
                <div className={styles.conflict} role="alert">
                  <strong>A newer saved journey is available.</strong>
                  <p>
                    Reload it when you are ready to replace your current unsaved
                    changes.
                  </p>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      setDraft(null);
                      setLetterDraft(null);
                      setSaveError(null);
                      setStatusMessage("Loaded latest saved version.");
                    }}
                  >
                    Reload saved journey
                  </button>
                </div>
              ) : null}

              {readOnly && activeSection === "content" ? (
                <p className={styles.readOnlyNotice} role="status">
                  This letter is published and read only. Unpublish it in Review
                  & share or Settings whenever you want to edit your message or
                  questions.
                </p>
              ) : null}

              <section
                id="editor-panel-content"
                role="tabpanel"
                aria-labelledby="editor-tab-content"
                className={`${styles.sectionPanel} ${styles.contentPanel}`}
                hidden={activeSection !== "content"}
              >
                {journeyQuery.isError ? (
                  <div className={styles.errorMessage} role="alert">
                    <h2 className="text-h3 font-semibold text-ink">
                      Journey unavailable
                    </h2>
                    <span>{journeyQuery.error.message}</span>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => void journeyQuery.refetch()}
                    >
                      Try again
                    </button>
                  </div>
                ) : !state || !currentGraph ? (
                  <p className="text-small text-ink-muted" role="status">
                    Loading your letter and questions...
                  </p>
                ) : (
                  <>
                    <section
                      id="content-workspace"
                      aria-label="Letter content"
                      className={styles.contentWorkspace}
                    >
                      <Tabs
                        value={activeContentWorkspace}
                        onValueChange={(value) => {
                          if (isContentWorkspace(value)) {
                            setActiveContentWorkspace(value);
                          }
                        }}
                        className={styles.contentWorkspaceTabs}
                      >
                        <TabsList
                          aria-label="Letter content areas"
                          className={styles.workspaceTabs}
                        >
                          <TabsTrigger
                            id="content-workspace-tab-basics"
                            value="basics"
                            aria-controls="content-workspace-panel-basics"
                            className={styles.workspaceTab}
                          >
                            <ContentTabIcon workspace="basics" />
                            <span className={styles.workspaceTabLabel}>
                              Words
                            </span>
                          </TabsTrigger>
                          <TabsTrigger
                            id="content-workspace-tab-questions"
                            value="questions"
                            aria-controls="content-workspace-panel-questions"
                            className={styles.workspaceTab}
                          >
                            <ContentTabIcon workspace="questions" />
                            <span className={styles.workspaceTabLabel}>
                              Questions
                            </span>
                          </TabsTrigger>
                        </TabsList>

                        <div
                          className={`${styles.contentWorkspacePanels} min-h-0`}
                        >
                          <TabsContent
                            id="content-workspace-panel-basics"
                            value="basics"
                            aria-labelledby="content-workspace-tab-basics"
                            forceMount
                            className={`${styles.workspacePanel} pt-1`}
                          >
                            <form
                              id="draft-editor-form"
                              className={styles.contentWorkspaceForm}
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (!readOnly && state) {
                                  saveMutation.mutate({
                                    graph: state.graph,
                                    letter: currentLetter,
                                  });
                                }
                              }}
                              noValidate
                            >
                              <section className={styles.contentSection}>
                                <div className={styles.fieldGroup}>
                                  <div className={styles.fieldLabelRow}>
                                    <label htmlFor="title">
                                      Title{" "}
                                      <span className={styles.fieldQualifier}>
                                        (optional)
                                      </span>
                                    </label>
                                    <span
                                      className={styles.fieldCounter}
                                      id="title-meta"
                                    >
                                      {titleCount} / 120
                                    </span>
                                  </div>
                                  <input
                                    id="title"
                                    type="text"
                                    autoComplete="off"
                                    value={currentLetter.title}
                                    readOnly={readOnly}
                                    aria-readonly={readOnly}
                                    onChange={(event) =>
                                      hasAtMostGraphemes(
                                        event.target.value,
                                        120,
                                      ) &&
                                      updateLetterField(
                                        "title",
                                        event.target.value,
                                      )
                                    }
                                    aria-describedby="title-help title-meta"
                                    placeholder="Choose Your Heart"
                                  />
                                  <div
                                    className={styles.fieldMeta}
                                    id="title-help"
                                  >
                                    <span>
                                      Appears at the top. Leave blank to use the
                                      template title.
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <div
                                    className={`${styles.fieldGroup} min-w-0`}
                                  >
                                    <div className={styles.fieldLabelRow}>
                                      <label htmlFor="recipientName">
                                        To{" "}
                                        <span className={styles.fieldQualifier}>
                                          (required)
                                        </span>
                                      </label>
                                      <span
                                        className={styles.fieldCounter}
                                        id="recipientName-meta"
                                      >
                                        {recipientCount} / 120
                                      </span>
                                    </div>
                                    <input
                                      id="recipientName"
                                      type="text"
                                      autoComplete="off"
                                      value={currentLetter.recipientName}
                                      readOnly={readOnly}
                                      aria-readonly={readOnly}
                                      onChange={(event) =>
                                        hasAtMostGraphemes(
                                          event.target.value,
                                          120,
                                        ) &&
                                        updateLetterField(
                                          "recipientName",
                                          event.target.value,
                                        )
                                      }
                                      aria-describedby="recipientName-meta"
                                      placeholder="e.g. Maria"
                                    />
                                  </div>

                                  <div
                                    className={`${styles.fieldGroup} min-w-0`}
                                  >
                                    <div className={styles.fieldLabelRow}>
                                      <label htmlFor="creatorName">
                                        From{" "}
                                        <span className={styles.fieldQualifier}>
                                          (optional)
                                        </span>
                                      </label>
                                      <span
                                        className={styles.fieldCounter}
                                        id="creatorName-meta"
                                      >
                                        {creatorCount} / 120
                                      </span>
                                    </div>
                                    <input
                                      id="creatorName"
                                      type="text"
                                      autoComplete="name"
                                      value={currentLetter.creatorName}
                                      readOnly={readOnly}
                                      aria-readonly={readOnly}
                                      onChange={(event) =>
                                        hasAtMostGraphemes(
                                          event.target.value,
                                          120,
                                        ) &&
                                        updateLetterField(
                                          "creatorName",
                                          event.target.value,
                                        )
                                      }
                                      aria-describedby="creatorName-help creatorName-meta"
                                      placeholder="Someone who cares"
                                    />
                                    <div className={styles.fieldMeta}>
                                      <span id="creatorName-help">
                                        Leave blank to stay anonymous.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </section>

                              <section className={styles.contentSection}>
                                <div
                                  className={`${styles.contentSectionHeading} ${styles.messageSectionHeading}`}
                                >
                                  <h2
                                    id="message-section-title"
                                    className={styles.messageSectionTitle}
                                  >
                                    Your message
                                  </h2>
                                  <span className={styles.fieldQualifier}>
                                    (required)
                                  </span>
                                  <span
                                    className={styles.fieldCounter}
                                    id="mainMessage-meta"
                                  >
                                    {messageCount.toLocaleString()} / 20,000
                                  </span>
                                </div>
                                <div className={styles.fieldGroup}>
                                  <label
                                    htmlFor="mainMessage"
                                    className="sr-only"
                                  >
                                    Your message (required)
                                  </label>
                                  <div className={styles.messageEditor}>
                                    <textarea
                                      id="mainMessage"
                                      value={currentLetter.mainMessage}
                                      readOnly={readOnly}
                                      aria-readonly={readOnly}
                                      onChange={(event) =>
                                        hasAtMostGraphemes(
                                          event.target.value,
                                          20_000,
                                        ) &&
                                        updateLetterField(
                                          "mainMessage",
                                          event.target.value,
                                        )
                                      }
                                      aria-describedby="mainMessage-meta"
                                      placeholder="Write the message that appears on the letter before the questions pop up..."
                                      rows={12}
                                    />
                                  </div>
                                </div>
                              </section>

                              {saveError ? (
                                <p className={styles.fieldError} role="alert">
                                  {saveError}
                                </p>
                              ) : null}
                            </form>
                          </TabsContent>

                          <TabsContent
                            id="content-workspace-panel-questions"
                            value="questions"
                            aria-labelledby="content-workspace-tab-questions"
                            forceMount
                            className={`${styles.workspacePanel} pt-1`}
                          >
                            <section
                              className={questionStyles.editorPanel}
                              aria-labelledby="question-editor-title"
                            >
                              <div className={questionStyles.editorHeading}>
                                <div className={questionStyles.sectionHeading}>
                                  <div>
                                    <div className={questionStyles.titleRow}>
                                      <h2
                                        id="question-editor-title"
                                        className={questionStyles.editorTitle}
                                      >
                                        Questions
                                      </h2>
                                      <span className={questionStyles.optional}>
                                        (pop up after letter)
                                      </span>
                                    </div>
                                    <p
                                      className={
                                        questionStyles.editorDescription
                                      }
                                    >
                                      {readOnly
                                        ? "Published questions are locked until this letter is unpublished."
                                        : pageQuestions.length > 1
                                          ? "Drag questions to change their order."
                                          : "Ask questions that pop up after your reader finishes the letter."}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {!isQuestionFormOpen
                                ? questionFeedbackNode
                                : null}

                              <div>
                                <QuestionList
                                  questions={pageQuestions}
                                  readOnly={readOnly}
                                  isReordering={saveMutation.isPending}
                                  onEdit={beginEditQuestion}
                                  onDelete={(question) =>
                                    requestDeleteQuestion(question, false)
                                  }
                                  onAddQuestion={beginNewQuestion}
                                  onReorder={handleReorderQuestions}
                                />
                              </div>

                              {saveError ? (
                                <p className={styles.fieldError} role="alert">
                                  {saveError}
                                </p>
                              ) : null}
                            </section>
                          </TabsContent>
                        </div>
                      </Tabs>

                      <div
                        className={styles.sectionStepNavigation}
                        role="group"
                        aria-label="Content navigation"
                      >
                        {previousContentWorkspace ? (
                          <button
                            className={styles.footerSecondary}
                            type="button"
                            onClick={() => {
                              setActiveContentWorkspace(
                                previousContentWorkspace,
                              );
                            }}
                          >
                            Back
                          </button>
                        ) : null}
                        {nextContentWorkspace ? (
                          <button
                            className={
                              hasSavedContent && dirty
                                ? styles.footerSecondary
                                : styles.footerPrimary
                            }
                            type="button"
                            onClick={() => {
                              setActiveContentWorkspace(nextContentWorkspace);
                            }}
                          >
                            Next
                          </button>
                        ) : null}
                        {hasSavedContent ? (
                          <button
                            className={
                              !nextContentWorkspace || dirty
                                ? styles.footerPrimary
                                : styles.footerSecondary
                            }
                            type="button"
                            disabled={
                              readOnly ||
                              !dirty ||
                              saveMutation.isPending ||
                              Boolean(state.refreshConflict)
                            }
                            aria-busy={saveMutation.isPending}
                            onClick={() => {
                              if (!readOnly && state) {
                                saveMutation.mutate({
                                  graph: state.graph,
                                  letter: currentLetter,
                                });
                              }
                            }}
                          >
                            {saveMutation.isPending
                              ? "Saving..."
                              : "Save journey"}
                          </button>
                        ) : !nextContentWorkspace ? (
                          <button
                            className={styles.footerPrimary}
                            type="button"
                            disabled={
                              readOnly ||
                              saveMutation.isPending ||
                              Boolean(state.refreshConflict)
                            }
                            aria-busy={saveMutation.isPending}
                            onClick={() => {
                              void (async () => {
                                if (!readOnly && state && dirty) {
                                  try {
                                    await saveMutation.mutateAsync({
                                      graph: state.graph,
                                      letter: currentLetter,
                                    });
                                  } catch {
                                    return;
                                  }
                                }
                                changeSection("overview");
                              })();
                            }}
                          >
                            {saveMutation.isPending ? "Saving..." : "Finish"}
                          </button>
                        ) : null}
                      </div>
                    </section>
                  </>
                )}
              </section>

              <section
                id="editor-panel-preview"
                className={`${styles.sectionPanel} ${styles.previewPanel}`}
                role="tabpanel"
                aria-labelledby="editor-tab-preview"
                hidden={activeSection !== "preview"}
              >
                {activeSection === "preview" && currentGraph ? (
                  <EditorJourneyPreview
                    standalone
                    title={currentLetter.title}
                    recipientName={currentLetter.recipientName}
                    mainMessage={currentLetter.mainMessage}
                    creatorName={currentLetter.creatorName}
                    graph={currentGraph}
                    slug={page.slug}
                  />
                ) : null}
              </section>

              <section
                id="editor-panel-overview"
                role="tabpanel"
                aria-labelledby="editor-tab-overview"
                className={styles.sectionPanel}
                hidden={activeSection !== "overview"}
              >
                <EditorOverview
                  page={page}
                  questionReadiness={{
                    questionCount: pageQuestions.length,
                    isLoading: journeyQuery.isPending,
                    isError: journeyQuery.isError,
                    isUpdating: saveMutation.isPending,
                    onRetry: () => {
                      void journeyQuery.refetch();
                    },
                  }}
                  title={currentLetter.title}
                  recipientName={currentLetter.recipientName}
                  mainMessage={currentLetter.mainMessage}
                  creatorName={currentLetter.creatorName}
                  imageCount={0}
                  photoCaptionCount={0}
                  choiceQuestionCount={choiceQuestions.length}
                  choiceCount={totalChoiceCount}
                  isDirty={dirty}
                  isSaving={saveMutation.isPending}
                  supportsPhotos={false}
                  supportsMusic={false}
                  onEditContent={() => {
                    setActiveContentWorkspace("basics");
                    changeSection("content");
                  }}
                  onChanged={handleLifecycleChanged}
                />
              </section>

              {isPublished ? (
                <section
                  id="editor-panel-analytics"
                  role="tabpanel"
                  aria-labelledby="editor-tab-analytics"
                  className={styles.sectionPanel}
                  hidden={activeSection !== "analytics"}
                >
                  <EditorAnalytics
                    page={page}
                    active={activeSection === "analytics"}
                  />
                </section>
              ) : null}

              <section
                id="editor-panel-settings"
                role="tabpanel"
                aria-labelledby="editor-tab-settings"
                className={styles.sectionPanel}
                hidden={activeSection !== "settings"}
              >
                <EditorSettings
                  page={page}
                  onChanged={handleLifecycleChanged}
                  dangerZone={
                    <DeletePageControl
                      pageId={page.id}
                      idSuffix="-settings"
                      embedded
                    />
                  }
                />
              </section>
            </div>
          </div>

          {activeSection === "content" && currentGraph ? (
            <div className={styles.inlinePreview}>
              <EditorJourneyPreview
                title={currentLetter.title}
                recipientName={currentLetter.recipientName}
                mainMessage={currentLetter.mainMessage}
                creatorName={currentLetter.creatorName}
                graph={currentGraph}
                slug={page.slug}
              />
            </div>
          ) : null}
        </div>
      </div>

      {isQuestionFormOpen ? (
        <QuestionFormDialog
          editor={{
            editingId,
            isCreating,
            draft: {
              type: qType,
              prompt: qPrompt,
              choices: qChoices,
            },
            isSaving: false,
            canSave: true,
            onPromptChange: setQPrompt,
            onTypeChange: changeQuestionType,
            onChoiceChange: changeQuestionChoice,
            onAddChoice: addQuestionChoice,
            onRemoveChoice: removeQuestionChoice,
            onSave: saveQuestionDialog,
            onCancel: closeQuestionEditor,
          }}
          feedback={questionFeedbackNode}
          isRemoving={false}
          saveImpactConfirmation={false}
          onConfirmSaveImpact={() => {}}
          onCancelSaveImpact={() => {}}
          removal={
            pendingRemoval
              ? {
                  prompt: pendingRemoval.question.prompt,
                  requiresResponseDeletionConfirmation: false,
                  returnToEditor: pendingRemoval.returnToEditor,
                }
              : null
          }
          onConfirmRemoval={confirmQuestionRemoval}
          onCancelRemoval={cancelQuestionRemoval}
          onRemove={
            editingQuestion
              ? () => requestDeleteQuestion(editingQuestion, true)
              : undefined
          }
        />
      ) : null}

      <ConfirmationDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave with unsaved changes?"
        description="Your latest changes have not been saved. Leaving now may discard them."
        confirmLabel="Leave page"
        cancelLabel="Keep editing"
        destructive={false}
        onConfirm={() => {
          setLeaveOpen(false);
          router.push("/dashboard/pages");
        }}
      />
    </main>
  );
}
