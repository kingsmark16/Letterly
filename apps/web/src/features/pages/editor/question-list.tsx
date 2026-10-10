"use client";

import type { PageQuestion } from "@letterly/contracts/questions";
import { useState } from "react";
import styles from "./question-editor.module.css";

interface QuestionListProps {
  questions: PageQuestion[];
  readOnly?: boolean;
  isReordering?: boolean;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
  onReorder: (questionIds: string[]) => void;
}

interface QuestionCardProps {
  question: PageQuestion;
  index: number;
  readOnly: boolean;
  reorderEnabled: boolean;
  isReordering: boolean;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onDragStart: (questionId: string) => void;
  onDragEnd: () => void;
  onDragOver: (questionId: string) => void;
  onDrop: (questionId: string) => void;
  isDropTarget: boolean;
}

function QuestionCard({
  question,
  index,
  readOnly,
  reorderEnabled,
  isReordering,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDropTarget,
}: QuestionCardProps): React.JSX.Element {
  return (
    <li
      className={styles.questionItem}
      data-reorder-enabled={reorderEnabled ? "true" : undefined}
      data-drop-target={isDropTarget ? "true" : undefined}
      onDragOver={(event) => {
        if (readOnly || isReordering) return;
        event.preventDefault();
        onDragOver(question.id);
      }}
      onDrop={(event) => {
        if (readOnly || isReordering) return;
        event.preventDefault();
        onDrop(question.id);
      }}
    >
      {reorderEnabled ? (
        <button
          className={styles.dragHandle}
          type="button"
          draggable={!isReordering}
          disabled={isReordering}
          onClick={(event) => event.preventDefault()}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            onDragStart(question.id);
          }}
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

      <details className={styles.questionCard}>
        <summary className={styles.questionHeader}>
          <div className={styles.questionHeading}>
            <div>
              <p
                className={styles.questionEyebrow}
              >{`Question ${index + 1}`}</p>
              <h3>{question.prompt || "Untitled question"}</h3>
            </div>
          </div>
          <svg
            className={styles.expandIndicator}
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
          </svg>
        </summary>
        <div className={styles.questionBody}>
          <p className={styles.questionType}>
            <span aria-hidden="true" />
            {question.type === "CHOICE" ? "Multiple choice" : "Written answer"}
          </p>
          {question.type === "CHOICE" ? (
            <ul className={styles.savedChoices} aria-label="Choices">
              {question.choices.map((choice) => (
                <li key={choice.id}>{choice.label}</li>
              ))}
            </ul>
          ) : null}
          {!readOnly ? (
            <div className={styles.cardActions}>
              <button
                type="button"
                disabled={isReordering}
                onClick={() => onEdit(question)}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={isReordering}
                onClick={() => onDelete(question)}
              >
                Remove question
              </button>
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

export function QuestionList({
  questions,
  readOnly = false,
  isReordering = false,
  onEdit,
  onDelete,
  onAddQuestion,
  onReorder,
}: QuestionListProps): React.JSX.Element {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const reorderEnabled = !readOnly && questions.length > 1;

  function dropQuestion(targetId: string): void {
    if (!reorderEnabled || isReordering) return;
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
      aria-busy={isReordering}
    >
      {questions.length > 0 ? (
        <ol
          className={styles.questionList}
          aria-label="Questions in visitor order"
        >
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              readOnly={readOnly}
              reorderEnabled={reorderEnabled}
              isReordering={isReordering}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={(questionId) => {
                if (reorderEnabled && !isReordering) setDraggedId(questionId);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDropTargetId(null);
              }}
              onDragOver={(questionId) => {
                if (reorderEnabled && !isReordering)
                  setDropTargetId(questionId);
              }}
              onDrop={dropQuestion}
              isDropTarget={dropTargetId === question.id}
            />
          ))}
        </ol>
      ) : (
        <div className={styles.emptyQuestionList}>
          <p className={styles.emptyTitle}>No questions yet</p>
          <p className={styles.emptyDescription}>
            Add a question your reader can answer after reading the letter.
          </p>
        </div>
      )}
      {!readOnly ? (
        <button
          className={styles.addQuestionButton}
          type="button"
          data-add-question
          disabled={isReordering || questions.length >= 100}
          title={
            questions.length >= 100
              ? "This letter can contain at most 100 questions"
              : undefined
          }
          onClick={onAddQuestion}
        >
          {questions.length >= 100
            ? "Question limit reached"
            : questions.length > 0
              ? "Add another question"
              : "Add your first question"}
        </button>
      ) : null}
      {!readOnly && dropTargetId ? (
        <p className={styles.dropHint} role="status">
          Release to place the question here.
        </p>
      ) : null}
    </div>
  );
}
