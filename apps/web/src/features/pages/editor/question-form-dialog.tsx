"use client";

import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MAX_EDITOR_CHOICE_LABEL_LENGTH,
  MAX_EDITOR_QUESTION_PROMPT_LENGTH,
} from "./question-limits";
import styles from "./question-editor.module.css";

export type QuestionFormType = "CHOICE" | "PLAIN_MESSAGE";

export interface QuestionChoiceDraft {
  id?: string;
  label: string;
  creatorMessage?: string | null;
}

export interface QuestionFormState {
  editingId: string | null;
  isCreating: boolean;
  draft: {
    type: QuestionFormType;
    prompt: string;
    choices: QuestionChoiceDraft[];
  };
  isSaving: boolean;
  canSave: boolean;
  onPromptChange: (value: string) => void;
  onTypeChange: (type: QuestionFormType) => void;
  onChoiceChange: (index: number, patch: Partial<QuestionChoiceDraft>) => void;
  onAddChoice: () => void;
  onRemoveChoice: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

interface QuestionFormDialogProps {
  editor: QuestionFormState;
  feedback: ReactNode;
  isRemoving: boolean;
  removal: {
    prompt: string;
    requiresResponseDeletionConfirmation: boolean;
    returnToEditor: boolean;
  } | null;
  saveImpactConfirmation: boolean;
  onConfirmRemoval: () => void;
  onCancelRemoval: () => void;
  onConfirmSaveImpact: () => void;
  onCancelSaveImpact: () => void;
  onRemove?: () => void;
}

export function QuestionFormDialog({
  editor,
  feedback,
  isRemoving,
  removal,
  saveImpactConfirmation,
  onConfirmRemoval,
  onCancelRemoval,
  onConfirmSaveImpact,
  onCancelSaveImpact,
  onRemove,
}: QuestionFormDialogProps): React.JSX.Element {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const confirmationCancelRef = useRef<HTMLButtonElement>(null);
  const removeQuestionButtonRef = useRef<HTMLButtonElement>(null);
  const saveQuestionButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<"remove" | "save" | null>(null);
  const wasConfirmingSaveImpact = useRef(false);
  const [returnFocusElement] = useState(() =>
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const isBusy = editor.isSaving || isRemoving;
  const fieldId = editor.editingId ?? "new-question";

  useEffect(() => {
    if (removal) {
      confirmationCancelRef.current?.focus();
    } else if (saveImpactConfirmation) {
      wasConfirmingSaveImpact.current = true;
      confirmationCancelRef.current?.focus();
    } else if (returnFocusTo.current === "remove") {
      removeQuestionButtonRef.current?.focus();
      returnFocusTo.current = null;
    } else if (
      returnFocusTo.current === "save" ||
      wasConfirmingSaveImpact.current
    ) {
      saveQuestionButtonRef.current?.focus();
      returnFocusTo.current = null;
      wasConfirmingSaveImpact.current = false;
    }
  }, [removal, saveImpactConfirmation]);

  function cancelRemoval(): void {
    returnFocusTo.current = removal?.returnToEditor ? "remove" : null;
    onCancelRemoval();
  }

  function cancelSaveImpact(): void {
    returnFocusTo.current = "save";
    onCancelSaveImpact();
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !isBusy) editor.onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content
          className={styles.dialogContent}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            promptRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!isRemoving && returnFocusElement?.isConnected) {
              returnFocusElement.focus();
            } else {
              document
                .querySelector<HTMLButtonElement>("button[data-add-question]")
                ?.focus();
            }
          }}
        >
          <div className={styles.dialogHeader}>
            <Dialog.Title className={styles.dialogTitle}>
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#ba1a1a] to-[#8c1d40] text-white shadow-sm"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
              <span>
                {removal
                  ? "Remove question?"
                  : saveImpactConfirmation
                    ? "Confirm answer removal?"
                    : editor.isCreating
                      ? "Add question"
                      : "Edit question"}
              </span>
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {removal
                ? "Confirm whether to remove this question from the letter."
                : saveImpactConfirmation
                  ? "Confirm whether to save changes that will remove existing answers."
                  : "Choose a question type and enter the question and its choices."}
            </Dialog.Description>
            <Dialog.Close
              className={styles.dialogClose}
              disabled={isBusy}
              aria-label="Close question form"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Dialog.Close>
          </div>
          <form
            className={styles.dialogForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (isBusy) return;
              if (removal) onConfirmRemoval();
              else if (saveImpactConfirmation) onConfirmSaveImpact();
              else editor.onSave();
            }}
          >
            <div className={styles.formScroll}>
              {feedback}
              {removal ? (
                <div className={styles.destructiveConfirmation}>
                  <p className={styles.confirmationPrompt}>{removal.prompt}</p>
                  <p className={styles.confirmationMessage}>
                    {removal.requiresResponseDeletionConfirmation
                      ? "This question has responses. Removing it will also permanently delete the answers tied to it."
                      : "This question will be permanently removed from the letter."}
                  </p>
                </div>
              ) : saveImpactConfirmation ? (
                <div className={styles.destructiveConfirmation}>
                  <p className={styles.confirmationPrompt}>
                    {editor.draft.prompt}
                  </p>
                  <p className={styles.confirmationMessage}>
                    Saving these changes will remove existing answers tied to
                    this question.
                  </p>
                </div>
              ) : (
                <div className={styles.questionForm}>
                  {/* Segmented type switcher */}
                  <div
                    className={styles.typeSwitcher}
                    role="group"
                    aria-label="Question type"
                  >
                    <button
                      type="button"
                      className={`${styles.typeButton} ${
                        editor.draft.type === "CHOICE"
                          ? styles.typeButtonActive
                          : ""
                      }`}
                      onClick={() => editor.onTypeChange("CHOICE")}
                      disabled={isBusy}
                    >
                      <span
                        className={styles.typeButtonIcon}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      <span>Choices</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeButton} ${
                        editor.draft.type === "PLAIN_MESSAGE"
                          ? styles.typeButtonActive
                          : ""
                      }`}
                      onClick={() => editor.onTypeChange("PLAIN_MESSAGE")}
                      disabled={isBusy}
                    >
                      <span
                        className={styles.typeButtonIcon}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </span>
                      <span>Written note</span>
                    </button>

                    <select
                      id={`question-type-${fieldId}`}
                      className="sr-only"
                      value={editor.draft.type}
                      disabled={isBusy}
                      tabIndex={-1}
                      aria-hidden="true"
                      onChange={(event) =>
                        editor.onTypeChange(
                          event.target.value as QuestionFormType,
                        )
                      }
                    >
                      <option value="CHOICE">Multiple choice</option>
                      <option value="PLAIN_MESSAGE">Written answer</option>
                    </select>
                  </div>

                  {/* Question prompt */}
                  <div className={styles.promptField}>
                    <div className={styles.promptWrapper}>
                      <textarea
                        ref={promptRef}
                        id={`question-prompt-${fieldId}`}
                        className={styles.promptEditor}
                        value={editor.draft.prompt}
                        maxLength={MAX_EDITOR_QUESTION_PROMPT_LENGTH}
                        aria-describedby={`question-prompt-${fieldId}-count`}
                        disabled={isBusy}
                        onChange={(event) =>
                          editor.onPromptChange(event.target.value)
                        }
                        placeholder="What should visitors answer?"
                        aria-label="What should visitors answer?"
                        rows={2}
                      />
                      <span
                        id={`question-prompt-${fieldId}-count`}
                        className={styles.promptCounter}
                        aria-live="polite"
                      >
                        {editor.draft.prompt.length} /{" "}
                        {MAX_EDITOR_QUESTION_PROMPT_LENGTH}
                      </span>
                    </div>
                  </div>

                  {/* Choices list or note preview */}
                  {editor.draft.type === "CHOICE" ? (
                    <fieldset
                      className={styles.choicesFieldset}
                      disabled={isBusy}
                    >
                      <legend className="sr-only">Choices</legend>
                      <div className={styles.choiceList}>
                        {editor.draft.choices.map((choice, index) => (
                          <div
                            className={styles.choiceRowModern}
                            key={choice.id ?? `new-choice-${index}`}
                          >
                            <span
                              className={styles.choicePillBadge}
                              aria-hidden="true"
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className={styles.choiceInputWrap}>
                              <input
                                id={`answer-${fieldId}-${index}`}
                                className={styles.answerLabelModern}
                                value={choice.label}
                                maxLength={MAX_EDITOR_CHOICE_LABEL_LENGTH}
                                aria-describedby={`answer-${fieldId}-${index}-count`}
                                onChange={(event) =>
                                  editor.onChoiceChange(index, {
                                    label: event.target.value,
                                  })
                                }
                                placeholder={`Choice ${index + 1}`}
                                aria-label={`Choice ${index + 1} label`}
                              />
                              <span
                                id={`answer-${fieldId}-${index}-count`}
                                className={styles.choiceCounter}
                                aria-live="polite"
                              >
                                {choice.label.length} /{" "}
                                {MAX_EDITOR_CHOICE_LABEL_LENGTH}
                              </span>
                            </div>
                            {editor.draft.choices.length > 2 ? (
                              <button
                                className={styles.removeChoiceBtn}
                                type="button"
                                onClick={() => editor.onRemoveChoice(index)}
                                aria-label={`Remove choice ${index + 1}`}
                                title={`Remove choice ${index + 1}`}
                              >
                                <svg
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {editor.draft.choices.length < 10 ? (
                        <button
                          className={styles.addChoiceBtn}
                          type="button"
                          onClick={editor.onAddChoice}
                          aria-label="Add another choice"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Add another choice</span>
                        </button>
                      ) : null}
                    </fieldset>
                  ) : (
                    <div className={styles.writtenPreviewCard}>
                      <div
                        className={styles.writtenPreviewIcon}
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                      <p className={styles.writtenPreviewText}>
                        Visitors will write their private reflection.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {removal || saveImpactConfirmation ? (
              <div
                className={`${styles.editingActions} ${styles.dialogActions} ${styles.confirmationActions}`}
              >
                <button
                  type="button"
                  ref={confirmationCancelRef}
                  onClick={removal ? cancelRemoval : cancelSaveImpact}
                  disabled={isBusy}
                >
                  {removal ? "Cancel" : "Go back to edit"}
                </button>
                <button
                  className={styles.confirmDestructiveButton}
                  type="submit"
                  disabled={isBusy}
                >
                  {removal
                    ? isRemoving
                      ? "Removing..."
                      : removal.requiresResponseDeletionConfirmation
                        ? "Remove question and answers"
                        : "Remove question"
                    : editor.isSaving
                      ? "Saving..."
                      : "Save and remove answers"}
                </button>
              </div>
            ) : (
              <div
                className={`${styles.editingActions} ${styles.dialogActions} ${onRemove ? styles.editingExistingActions : ""}`}
              >
                <button
                  type="submit"
                  ref={saveQuestionButtonRef}
                  disabled={!editor.canSave || isBusy}
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
                  disabled={isBusy}
                >
                  Cancel
                </button>
                {onRemove ? (
                  <button
                    className={styles.removeQuestionButton}
                    type="button"
                    ref={removeQuestionButtonRef}
                    onClick={onRemove}
                    disabled={isBusy}
                  >
                    {isRemoving ? "Removing..." : "Remove question"}
                  </button>
                ) : null}
              </div>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
