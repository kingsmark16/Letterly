"use client";

import type { PageQuestion } from "@letterly/contracts/questions";
import { useState } from "react";
import styles from "./question-editor.module.css";

interface QuestionListProps {
  questions: PageQuestion[];
  editor: QuestionListEditor | null;
  readOnly?: boolean;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
  onReorder: (questionIds: string[]) => void;
}

export type QuestionListType = "CHOICE" | "PLAIN_MESSAGE";

export interface QuestionListChoiceDraft {
  id?: string;
  label: string;
  creatorMessage?: string | null;
}

export interface QuestionListDraft {
  type: QuestionListType;
  prompt: string;
  choices: QuestionListChoiceDraft[];
}

export interface QuestionListEditor {
  editingId: string | null;
  isCreating: boolean;
  draft: QuestionListDraft;
  isSaving: boolean;
  canSave: boolean;
  onPromptChange: (value: string) => void;
  onTypeChange: (type: QuestionListType) => void;
  onChoiceChange: (
    index: number,
    patch: Partial<QuestionListChoiceDraft>,
  ) => void;
  onAddChoice: () => void;
  onRemoveChoice: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

function draftForQuestion(
  question: PageQuestion,
  editor: QuestionListEditor,
): QuestionListDraft {
  if (
    (editor.editingId === question.id && !editor.isCreating) ||
    (editor.isCreating && question.id === "__draft-question__")
  ) {
    return editor.draft;
  }
  return {
    type: question.type,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      creatorMessage: choice.creatorMessage,
    })),
  };
}

function QuestionCard({
  question,
  index,
  questionCount,
  editor,
  readOnly,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMove,
}: {
  question: PageQuestion;
  index: number;
  questionCount: number;
  editor: QuestionListEditor | null;
  readOnly: boolean;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onDragStart: (questionId: string) => void;
  onDragEnd: () => void;
  onDragOver: (questionId: string) => void;
  onDrop: (questionId: string) => void;
  onMove: (questionId: string, direction: "up" | "down") => void;
}): React.JSX.Element {
  const isDraft = question.id === "__draft-question__";
  const isEditing = Boolean(
    editor &&
    ((editor.editingId === question.id && !editor.isCreating) ||
      (editor.isCreating && isDraft)),
  );
  const draft = editor ? draftForQuestion(question, editor) : null;

  return (
    <li
      className={`${styles.questionItem} ${isEditing ? styles.editingQuestion : ""}`}
      onDragOver={(event) => {
        if (readOnly) return;
        event.preventDefault();
        onDragOver(question.id);
      }}
      onDrop={(event) => {
        if (readOnly) return;
        event.preventDefault();
        onDrop(question.id);
      }}
    >
      <details className={styles.questionCard} open={isEditing || undefined}>
        <summary className={styles.questionHeader}>
          <div className={styles.questionHeading}>
            {!isDraft && !readOnly ? (
              <button
                className={styles.dragHandle}
                type="button"
                draggable
                onClick={(event) => event.preventDefault()}
                onDragStart={() => onDragStart(question.id)}
                onDragEnd={onDragEnd}
                aria-label={`Drag question ${index + 1} to reorder`}
                title="Drag to reorder"
              >
                <svg
                  className={styles.dragIcon}
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle cx="4" cy="3" r="1.25" />
                  <circle cx="12" cy="3" r="1.25" />
                  <circle cx="4" cy="8" r="1.25" />
                  <circle cx="12" cy="8" r="1.25" />
                  <circle cx="4" cy="13" r="1.25" />
                  <circle cx="12" cy="13" r="1.25" />
                </svg>
              </button>
            ) : null}
            <div>
              <p className={styles.questionEyebrow}>
                {`Question ${index + 1}`}
              </p>
              <h3>
                {isEditing
                  ? editor?.isCreating
                    ? "New question"
                    : "Edit question"
                  : question.prompt || "Untitled question"}
              </h3>
            </div>
          </div>
          {!isDraft && !readOnly ? (
            <div
              className={styles.questionReorderControls}
              aria-label={`Reorder question ${index + 1}`}
            >
              <button
                className={styles.reorderButton}
                type="button"
                disabled={index === 0}
                aria-label={`Move question ${index + 1} up`}
                title="Move up"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMove(question.id, "up");
                }}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="m3 9 5-5 5 5" />
                  <path d="M8 4v8" />
                </svg>
              </button>
              <button
                className={styles.reorderButton}
                type="button"
                disabled={index === questionCount - 1}
                aria-label={`Move question ${index + 1} down`}
                title="Move down"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMove(question.id, "down");
                }}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="m3 7 5 5 5-5" />
                  <path d="M8 12V4" />
                </svg>
              </button>
            </div>
          ) : null}
        </summary>

        <div className={styles.questionBody}>
          {isEditing && editor && draft ? (
            <div className={styles.questionForm}>
              <label
                className={styles.fieldLabel}
                htmlFor={`question-type-${question.id}`}
              >
                Question type
              </label>
              <select
                id={`question-type-${question.id}`}
                className={styles.typeSelect}
                value={draft.type}
                onChange={(event) =>
                  editor.onTypeChange(event.target.value as QuestionListType)
                }
              >
                <option value="CHOICE">Multiple choice</option>
                <option value="PLAIN_MESSAGE">Written answer</option>
              </select>

              <label
                className={styles.fieldLabel}
                htmlFor={`question-prompt-${question.id}`}
              >
                Question
              </label>
              <textarea
                id={`question-prompt-${question.id}`}
                className={styles.promptEditor}
                value={draft.prompt}
                onChange={(event) => editor.onPromptChange(event.target.value)}
                placeholder="What should visitors answer?"
                aria-label="What should visitors answer?"
                autoFocus={editor.isCreating}
              />

              {draft.type === "CHOICE" ? (
                <fieldset className={styles.choicesFieldset}>
                  <legend className={styles.fieldLabel}>Answer choices</legend>
                  <div className={styles.choiceList}>
                    {draft.choices.map((choice, choiceIndex) => (
                      <div
                        className={styles.choiceRow}
                        key={choice.id ?? `new-choice-${choiceIndex}`}
                      >
                        <label
                          className={styles.choiceLabel}
                          htmlFor={`answer-${question.id}-${choiceIndex}`}
                        >
                          Answer {choiceIndex + 1}
                        </label>
                        <input
                          id={`answer-${question.id}-${choiceIndex}`}
                          className={styles.answerLabel}
                          value={choice.label}
                          onChange={(event) =>
                            editor.onChoiceChange(choiceIndex, {
                              label: event.target.value,
                            })
                          }
                          placeholder={`Answer ${choiceIndex + 1}`}
                          aria-label={`Answer ${choiceIndex + 1} label`}
                        />
                        <label
                          className={styles.choiceLabel}
                          htmlFor={`creator-note-${question.id}-${choiceIndex}`}
                        >
                          Private note (optional)
                        </label>
                        <textarea
                          id={`creator-note-${question.id}-${choiceIndex}`}
                          className={styles.creatorNote}
                          value={choice.creatorMessage ?? ""}
                          maxLength={2_000}
                          onChange={(event) =>
                            editor.onChoiceChange(choiceIndex, {
                              creatorMessage: event.target.value,
                            })
                          }
                          placeholder="A note only you can see"
                          aria-label={`Private note for answer ${choiceIndex + 1}`}
                        />
                        {draft.choices.length > 2 ? (
                          <button
                            className={styles.removeAnswer}
                            type="button"
                            onClick={() => editor.onRemoveChoice(choiceIndex)}
                            aria-label={`Remove answer ${choiceIndex + 1}`}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {draft.choices.length < 10 ? (
                    <button
                      className={styles.addChoiceButton}
                      type="button"
                      onClick={editor.onAddChoice}
                    >
                      + Add another choice
                    </button>
                  ) : null}
                </fieldset>
              ) : null}

              <div className={styles.editingActions}>
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
            </div>
          ) : (
            <>
              <p className={styles.questionPrompt}>
                {question.prompt || "Untitled question"}
              </p>
              <p className={styles.questionType}>
                {question.type === "CHOICE"
                  ? "Multiple choice"
                  : "Written answer"}
              </p>
              {question.type === "CHOICE" ? (
                <ul className={styles.savedChoices} aria-label="Answer choices">
                  {question.choices.map((choice) => (
                    <li key={choice.id}>{choice.label}</li>
                  ))}
                </ul>
              ) : null}
              {!readOnly ? (
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => onEdit(question)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(question)}>
                    Delete
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </details>
    </li>
  );
}

export function QuestionList({
  questions,
  editor,
  readOnly = false,
  onEdit,
  onDelete,
  onAddQuestion,
  onReorder,
}: QuestionListProps): React.JSX.Element {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const displayedQuestions =
    !readOnly && editor?.isCreating
      ? [
          ...questions,
          {
            id: "__draft-question__",
            pageId: "__draft-page__",
            type: editor.draft.type,
            prompt: editor.draft.prompt,
            displayOrder: questions.length,
            choices: editor.draft.choices.map((choice, index) => ({
              id: `__draft-choice-${index}`,
              label: choice.label,
              displayOrder: index,
              creatorMessage: choice.creatorMessage ?? null,
            })),
          } satisfies PageQuestion,
        ]
      : questions;

  function dropQuestion(targetId: string): void {
    if (readOnly) return;

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }
    const ids = questions.map((question) => question.id);
    const fromIndex = ids.indexOf(draggedId);
    const targetIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    ids.splice(fromIndex, 1);
    ids.splice(targetIndex, 0, draggedId);
    onReorder(ids);
    setDraggedId(null);
    setDropTargetId(null);
  }

  function moveQuestion(questionId: string, direction: "up" | "down"): void {
    if (readOnly) return;

    const ids = questions.map((question) => question.id);
    const currentIndex = ids.indexOf(questionId);
    const targetIndex = currentIndex + (direction === "up" ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ids.length) {
      return;
    }

    const currentId = ids[currentIndex];
    const targetId = ids[targetIndex];
    if (!currentId || !targetId) return;
    ids[currentIndex] = targetId;
    ids[targetIndex] = currentId;
    onReorder(ids);
  }

  return (
    <div
      className={styles.listContainer}
      role="group"
      aria-label="Ordered question list"
    >
      {displayedQuestions.length > 0 ? (
        <>
          <ol
            className={styles.questionList}
            aria-label="Questions in visitor order"
          >
            {displayedQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                questionCount={questions.length}
                editor={editor}
                readOnly={readOnly}
                onEdit={onEdit}
                onDelete={onDelete}
                onDragStart={(questionId) => {
                  if (!readOnly) setDraggedId(questionId);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDropTargetId(null);
                }}
                onDragOver={(questionId) => {
                  if (!readOnly) setDropTargetId(questionId);
                }}
                onDrop={dropQuestion}
                onMove={moveQuestion}
              />
            ))}
          </ol>
          {!readOnly && !editor?.isCreating ? (
            <button
              className={styles.addQuestionButton}
              type="button"
              disabled={questions.length >= 100}
              title={
                questions.length >= 100
                  ? "This letter can contain at most 100 questions"
                  : undefined
              }
              onClick={onAddQuestion}
            >
              {questions.length >= 100
                ? "Question limit reached"
                : "Add another question"}
            </button>
          ) : null}
        </>
      ) : (
        <div className={styles.emptyQuestionList}>
          <p className={styles.emptyTitle}>No questions yet</p>
          <p className={styles.emptyDescription}>
            Add a question to start a clear sequence for visitors.
          </p>
          {!readOnly ? (
            <button
              className={styles.addQuestionButton}
              type="button"
              onClick={onAddQuestion}
            >
              Add your first question
            </button>
          ) : null}
        </div>
      )}
      {!readOnly && dropTargetId ? (
        <p className={styles.dropHint} role="status">
          Release to place the question here.
        </p>
      ) : null}
    </div>
  );
}
