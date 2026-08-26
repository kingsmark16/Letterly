"use client";

import type { PageQuestion } from "@letterly/contracts/questions";
import styles from "./question-editor.module.css";

interface QuestionFlowCanvasProps {
  pageId: string;
  questions: PageQuestion[];
  editor: QuestionCanvasEditor | null;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
}

export type QuestionCanvasType = "CHOICE" | "PLAIN_MESSAGE";

export interface QuestionCanvasChoiceDraft {
  key: string;
  label: string;
  nextQuestionId: string | null;
  endsJourney: boolean;
}

export interface QuestionCanvasDraft {
  type: QuestionCanvasType;
  prompt: string;
  nextQuestionId: string | null;
  endsJourney: boolean;
  choices: QuestionCanvasChoiceDraft[];
}

export interface QuestionCanvasEditor {
  editingId: string | null;
  isCreating: boolean;
  draft: QuestionCanvasDraft;
  isSaving: boolean;
  canSave: boolean;
  destinationOptions: PageQuestion[];
  onPromptChange: (value: string) => void;
  onTypeChange: (type: QuestionCanvasType) => void;
  onPlainDestinationChange: (value: string) => void;
  onChoiceChange: (
    index: number,
    patch: Partial<QuestionCanvasChoiceDraft>,
  ) => void;
  onChoiceDestinationChange: (index: number, value: string) => void;
  onAddChoice: () => void;
  onRemoveChoice: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

interface FlowBranch {
  id: string;
  label: string;
  target: PageQuestion | null;
  targetLabel: string;
  endsJourney: boolean;
}

interface FlowQuestionTreeNode {
  question: PageQuestion;
  index: number;
  branches: Array<
    FlowBranch & {
      child: FlowQuestionTreeNode | null;
      isReference: boolean;
    }
  >;
}

interface FlowQuestionNodeProps {
  node: FlowQuestionTreeNode;
  pageId: string;
  editor: QuestionCanvasEditor | null;
  isListItem?: boolean;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
}

const CONTINUE_VALUE = "__continue__";
const FINISH_VALUE = "__finish__";

function destinationValue(
  nextQuestionId: string | null,
  endsJourney: boolean,
): string {
  if (endsJourney) return FINISH_VALUE;
  return nextQuestionId ?? CONTINUE_VALUE;
}

function destinationLabel(question: PageQuestion, index: number): string {
  return `Question ${index + 1}: ${question.prompt || "Untitled question"}`;
}

function nextQuestion(
  question: PageQuestion,
  index: number,
  questions: PageQuestion[],
  targetId: string | null,
): PageQuestion | null {
  if (question.endsJourney) return null;
  if (targetId) {
    return questions.find((candidate) => candidate.id === targetId) ?? null;
  }
  return questions[index + 1] ?? null;
}

function branchList(
  question: PageQuestion,
  index: number,
  questions: PageQuestion[],
): FlowBranch[] {
  if (question.type === "CHOICE") {
    return question.choices.map((choice) => {
      const target = choice.endsJourney
        ? null
        : nextQuestion(question, index, questions, choice.nextQuestionId);
      return {
        id: choice.id,
        // Answer nodes are intentionally neutral on the canvas. The labels
        // remain in the accessible question list and are editable in place.
        label: "Answer",
        target,
        targetLabel: choice.endsJourney
          ? "Finish the journey"
          : (target?.prompt ?? "Add a question"),
        endsJourney: choice.endsJourney,
      };
    });
  }

  const target = nextQuestion(
    question,
    index,
    questions,
    question.nextQuestionId,
  );
  return [
    {
      id: question.id,
      label: "Answer",
      target,
      targetLabel: question.endsJourney
        ? "Finish the journey"
        : (target?.prompt ?? "Add a question"),
      endsJourney: question.endsJourney,
    },
  ];
}

function draftAsQuestion(
  pageId: string,
  draft: QuestionCanvasDraft,
  displayOrder: number,
  id = "__draft-question__",
): PageQuestion {
  return {
    id,
    pageId,
    key: id,
    type: draft.type,
    prompt: draft.prompt,
    displayOrder,
    config: null,
    endsJourney: draft.endsJourney,
    nextQuestionId: draft.nextQuestionId,
    choices: draft.choices.map((choice, index) => ({
      id: `__draft-choice-${index}`,
      key: choice.key,
      label: choice.label,
      displayOrder: index,
      creatorMessage: null,
      endsJourney: choice.endsJourney,
      nextQuestionId: choice.nextQuestionId,
    })),
  };
}

function buildFlowQuestionTree(
  question: PageQuestion,
  index: number,
  questions: PageQuestion[],
  seen: ReadonlySet<string>,
): { node: FlowQuestionTreeNode; seen: Set<string> } {
  const nextSeen = new Set(seen);
  nextSeen.add(question.id);

  const branches = branchList(question, index, questions).map((branch) => {
    if (!branch.target || nextSeen.has(branch.target.id)) {
      return {
        ...branch,
        child: null,
        isReference: Boolean(branch.target),
      };
    }

    const childResult = buildFlowQuestionTree(
      branch.target,
      questions.findIndex((candidate) => candidate.id === branch.target?.id),
      questions,
      nextSeen,
    );
    for (const id of childResult.seen) nextSeen.add(id);

    return {
      ...branch,
      child: childResult.node,
      isReference: false,
    };
  });

  return {
    node: { question, index, branches },
    seen: nextSeen,
  };
}

function destinationOptions(questions: PageQuestion[]): React.JSX.Element[] {
  return questions.map((question, index) => (
    <option key={question.id} value={question.id}>
      {destinationLabel(question, index)}
    </option>
  ));
}

function FlowQuestionNode({
  node,
  pageId,
  editor,
  isListItem = false,
  onEdit,
  onDelete,
  onAddQuestion,
}: FlowQuestionNodeProps): React.JSX.Element {
  const { question, index, branches } = node;
  const isDraft = question.id === "__draft-question__";
  const isEditing = Boolean(
    editor &&
    ((editor.editingId === question.id && !editor.isCreating) ||
      (editor.isCreating && isDraft)),
  );
  const isBase = index === 0;
  const QuestionNodeTag = isListItem ? "li" : "div";
  const draft = isEditing ? editor?.draft : null;

  return (
    <QuestionNodeTag className={styles.canvasQuestion}>
      <div
        className={`${styles.questionNode} ${isEditing ? styles.editingQuestion : ""}`}
      >
        {isEditing && editor && draft ? (
          <textarea
            className={styles.promptEditor}
            value={draft.prompt}
            onChange={(event) => editor.onPromptChange(event.target.value)}
            placeholder="What should visitors answer?"
            aria-label="What should visitors answer?"
            autoFocus={editor.isCreating}
          />
        ) : (
          <button
            className={styles.promptNode}
            type="button"
            onClick={() => onEdit(question)}
            aria-label={`Question: ${question.prompt}`}
          >
            {question.prompt || "Untitled question"}
          </button>
        )}

        {isEditing && editor && draft ? (
          <select
            className={styles.typeSelect}
            value={draft.type}
            onChange={(event) =>
              editor.onTypeChange(event.target.value as QuestionCanvasType)
            }
            aria-label="Answer style"
          >
            <option value="CHOICE">Choose one answer</option>
            <option value="PLAIN_MESSAGE">Write an answer</option>
          </select>
        ) : (
          <button
            className={styles.typeNode}
            type="button"
            onClick={() => onEdit(question)}
            aria-label={`Choose question type for ${question.prompt}`}
          >
            CHOOSE QUESTION TYPE
          </button>
        )}
      </div>

      {isEditing && editor ? (
        <div className={`${styles.nodeActions} ${styles.editingActions}`}>
          <span>{editor.isCreating ? "NEW QUESTION" : "EDITING"}</span>
          <button
            type="button"
            onClick={editor.onSave}
            disabled={!editor.canSave}
          >
            {editor.isSaving
              ? "Saving..."
              : editor.isCreating
                ? "Add question"
                : "Save question"}
          </button>
          <button
            type="button"
            onClick={editor.onCancel}
            disabled={editor.isSaving}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.nodeActions}>
          <span>{isBase ? "BASE QUESTION" : `QUESTION ${index + 1}`}</span>
          <button type="button" onClick={() => onEdit(question)}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(question)}>
            Delete
          </button>
        </div>
      )}

      <span className={styles.questionStem} aria-hidden="true" />
      <span className={styles.questionStem} aria-hidden="true" />
      <div
        className={`${styles.answerBranches} ${branches.length === 1 ? styles.singleBranch : ""}`}
      >
        {branches.map((branch, branchIndex) => {
          const choiceDraft =
            isEditing && editor?.draft.type === "CHOICE"
              ? editor.draft.choices[branchIndex]
              : null;
          const branchDestination = choiceDraft
            ? destinationValue(
                choiceDraft.nextQuestionId,
                choiceDraft.endsJourney,
              )
            : destinationValue(
                editor?.draft.nextQuestionId ?? branch.target?.id ?? null,
                editor?.draft.endsJourney ?? branch.endsJourney,
              );
          const child = branch.child ? (
            <FlowQuestionNode
              node={branch.child}
              pageId={pageId}
              editor={editor}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddQuestion={onAddQuestion}
            />
          ) : branch.isReference ? (
            <div className={styles.referenceNode}>
              Already shown: {branch.targetLabel}
            </div>
          ) : (
            <button
              className={styles.addNode}
              type="button"
              onClick={onAddQuestion}
            >
              <span className="sr-only">Finish when no question remains</span>
              Add more question
            </button>
          );

          return (
            <div className={styles.answerBranch} key={branch.id}>
              <span className={styles.branchStem} aria-hidden="true" />
              <div
                className={`${styles.answerNode} ${isEditing ? styles.editableAnswerNode : ""}`}
                aria-label="Answer placeholder"
              >
                <span className="sr-only">Next step</span>
                {isEditing && editor && draft ? (
                  draft.type === "CHOICE" && choiceDraft ? (
                    <div className={styles.answerEditor}>
                      <input
                        className={styles.answerLabel}
                        value={choiceDraft.label}
                        onChange={(event) =>
                          editor.onChoiceChange(branchIndex, {
                            label: event.target.value,
                          })
                        }
                        placeholder={`Answer ${branchIndex + 1}`}
                        aria-label={`Answer ${branchIndex + 1} label`}
                      />
                      <select
                        className={styles.answerDestination}
                        value={branchDestination}
                        onChange={(event) =>
                          editor.onChoiceDestinationChange(
                            branchIndex,
                            event.target.value,
                          )
                        }
                        aria-label={`Answer ${branchIndex + 1} next step`}
                      >
                        <option value={CONTINUE_VALUE}>
                          Continue in order
                        </option>
                        <option value={FINISH_VALUE}>Finish the journey</option>
                        {destinationOptions(editor.destinationOptions)}
                      </select>
                      {editor.draft.choices.length > 2 ? (
                        <button
                          className={styles.removeAnswer}
                          type="button"
                          onClick={() => editor.onRemoveChoice(branchIndex)}
                          aria-label={`Remove answer ${branchIndex + 1}`}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <select
                      className={styles.answerDestination}
                      value={branchDestination}
                      onChange={(event) =>
                        editor.onPlainDestinationChange(event.target.value)
                      }
                      aria-label="Answer next step"
                    >
                      <option value={CONTINUE_VALUE}>Continue in order</option>
                      <option value={FINISH_VALUE}>Finish the journey</option>
                      {destinationOptions(editor.destinationOptions)}
                    </select>
                  )
                ) : (
                  <span className={styles.answerPlaceholder}>
                    {branch.label}
                  </span>
                )}
              </div>
              <span className={styles.answerStem} aria-hidden="true" />
              <div className={styles.branchChild}>
                {branch.endsJourney ? (
                  <div className={styles.finishNode}>Finish the journey</div>
                ) : (
                  child
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isEditing &&
      editor?.draft.type === "CHOICE" &&
      editor.draft.choices.length < 10 ? (
        <button
          className={styles.addAnswerNode}
          type="button"
          onClick={editor.onAddChoice}
        >
          + Add another answer
        </button>
      ) : null}
    </QuestionNodeTag>
  );
}

function AccessibleQuestionList({
  questions,
}: {
  questions: PageQuestion[];
}): React.JSX.Element {
  return (
    <ol className={styles.accessibleQuestionList} aria-label="Saved questions">
      {questions.map((question, index) => (
        <li key={question.id}>
          {index === 0 ? "Base question" : `Question ${index + 1}`}:{" "}
          {question.prompt}
          {question.type === "CHOICE"
            ? question.choices.map((choice) => ` ${choice.label}`).join(",")
            : " Written answer"}
        </li>
      ))}
    </ol>
  );
}

export function QuestionFlowCanvas({
  pageId,
  questions,
  editor,
  onEdit,
  onDelete,
  onAddQuestion,
}: QuestionFlowCanvasProps): React.JSX.Element {
  const displayedQuestions = questions.map((question) =>
    editor?.editingId === question.id && !editor.isCreating
      ? draftAsQuestion(
          pageId,
          editor.draft,
          question.displayOrder,
          question.id,
        )
      : question,
  );
  if (editor?.isCreating) {
    displayedQuestions.push(
      draftAsQuestion(pageId, editor.draft, displayedQuestions.length),
    );
  }

  const baseQuestion = displayedQuestions[0];
  const flowRoots: FlowQuestionTreeNode[] = [];
  let seen = new Set<string>();

  if (baseQuestion) {
    const baseResult = buildFlowQuestionTree(
      baseQuestion,
      0,
      displayedQuestions,
      seen,
    );
    flowRoots.push(baseResult.node);
    seen = baseResult.seen;
  }

  for (const question of displayedQuestions) {
    if (seen.has(question.id)) continue;
    const result = buildFlowQuestionTree(
      question,
      displayedQuestions.findIndex((candidate) => candidate.id === question.id),
      displayedQuestions,
      seen,
    );
    flowRoots.push(result.node);
    seen = result.seen;
  }

  return (
    <div className={styles.canvas} role="group" aria-label="Question list">
      <AccessibleQuestionList questions={questions} />
      <div className={styles.canvasInner}>
        {baseQuestion ? (
          flowRoots.map((root) => (
            <ol className={styles.canvasTree} key={root.question.id}>
              <FlowQuestionNode
                node={root}
                pageId={pageId}
                editor={editor}
                isListItem
                onEdit={onEdit}
                onDelete={onDelete}
                onAddQuestion={onAddQuestion}
              />
            </ol>
          ))
        ) : (
          <div className={styles.emptyCanvasNode}>
            <div className={styles.questionNode}>
              <button
                className={styles.promptNode}
                type="button"
                onClick={onAddQuestion}
              >
                Start with a question
              </button>
              <button
                className={styles.typeNode}
                type="button"
                onClick={onAddQuestion}
              >
                CHOOSE QUESTION TYPE
              </button>
            </div>
            <span className={styles.questionStem} aria-hidden="true" />
            <button
              className={styles.addNode}
              type="button"
              onClick={onAddQuestion}
            >
              Add more question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
