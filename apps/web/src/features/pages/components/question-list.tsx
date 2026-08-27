"use client";

import type { PageQuestion } from "@letterly/contracts/questions";
import { useState } from "react";
import styles from "./question-editor.module.css";

interface QuestionListProps {
  questions: PageQuestion[];
  editor: QuestionListEditor | null;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
  onReorder: (questionIds: string[]) => void;
}

export type QuestionListType = "CHOICE" | "PLAIN_MESSAGE";

export interface QuestionListChoiceDraft {
  key: string;
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
      key: choice.key,
      label: choice.label,
      creatorMessage: choice.creatorMessage,
    })),
  };
}

function QuestionCard({
  question,
  index,
  total,
  editor,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  question: PageQuestion;
  index: number;
  total: number;
  editor: QuestionListEditor | null;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDragStart: (questionId: string) => void;
  onDragEnd: () => void;
  onDragOver: (questionId: string) => void;
  onDrop: (questionId: string) => void;
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
        event.preventDefault();
        onDragOver(question.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(question.id);
      }}
    >
      <article className={styles.questionCard}>
        <header className={styles.questionHeader}>
          <div className={styles.questionHeading}>
            <span className={styles.questionNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className={styles.questionEyebrow}>
                {index === 0 ? "First question" : `Question ${index + 1}`}
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
          {!isDraft ? (
            <button
              className={styles.dragHandle}
              type="button"
              draggable
              onDragStart={() => onDragStart(question.id)}
              onDragEnd={onDragEnd}
              aria-label={`Drag question ${index + 1} to reorder`}
              title="Drag to reorder"
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
          ) : null}
        </header>

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
                      <div className={styles.choiceRow} key={choice.key}>
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
                      + Add another answer
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
                <details className={styles.choiceDisclosure}>
                  <summary className={styles.choiceSummary}>
                    Show {question.choices.length} answer choices
                  </summary>
                  <ul
                    className={styles.savedChoices}
                    aria-label="Answer choices"
                  >
                    {question.choices.map((choice) => (
                      <li key={choice.id}>{choice.label}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <div className={styles.cardActions}>
                <button type="button" onClick={() => onEdit(question)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(question)}>
                  Delete
                </button>
                <span className={styles.moveActions}>
                  <button
                    type="button"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move question ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, 1)}
                    disabled={index === total - 1}
                    aria-label={`Move question ${index + 1} down`}
                  >
                    ↓
                  </button>
                </span>
              </div>
            </>
          )}
        </div>
      </article>
    </li>
  );
}

export function QuestionList({
  questions,
  editor,
  onEdit,
  onDelete,
  onAddQuestion,
  onReorder,
}: QuestionListProps): React.JSX.Element {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const displayedQuestions = editor?.isCreating
    ? [
        ...questions,
        {
          id: "__draft-question__",
          pageId: "__draft-page__",
          key: "__draft-question__",
          type: editor.draft.type,
          prompt: editor.draft.prompt,
          displayOrder: questions.length,
          config: null,
          choices: editor.draft.choices.map((choice, index) => ({
            id: `__draft-choice-${index}`,
            key: choice.key,
            label: choice.label,
            displayOrder: index,
            creatorMessage: choice.creatorMessage ?? null,
          })),
        } satisfies PageQuestion,
      ]
    : questions;

  function moveQuestion(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const ids = questions.map((question) => question.id);
    const currentId = ids[index];
    const nextId = ids[nextIndex];
    if (!currentId || !nextId) return;
    ids[index] = nextId;
    ids[nextIndex] = currentId;
    onReorder(ids);
  }

  function dropQuestion(targetId: string): void {
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
                total={questions.length}
                editor={editor}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={moveQuestion}
                onDragStart={(questionId) => setDraggedId(questionId)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDropTargetId(null);
                }}
                onDragOver={(questionId) => setDropTargetId(questionId)}
                onDrop={dropQuestion}
              />
            ))}
          </ol>
          {!editor?.isCreating ? (
            <button
              className={styles.addQuestionButton}
              type="button"
              onClick={onAddQuestion}
            >
              Add another question
            </button>
          ) : null}
        </>
      ) : (
        <div className={styles.emptyQuestionList}>
          <p className={styles.emptyTitle}>No questions yet</p>
          <p className={styles.emptyDescription}>
            Add a question to start a clear sequence for visitors.
          </p>
          <button
            className={styles.addQuestionButton}
            type="button"
            onClick={onAddQuestion}
          >
            Add your first question
          </button>
        </div>
      )}
      {dropTargetId ? (
        <p className={styles.dropHint} role="status">
          Release to place the question here.
        </p>
      ) : null}
    </div>
  );
}
