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
              {removal
                ? "Remove question?"
                : saveImpactConfirmation
                  ? "Confirm answer removal?"
                  : editor.isCreating
                    ? "Add question"
                    : "Edit question"}
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
                  <div className={styles.formField}>
                    <label
                      className={styles.fieldLabel}
                      htmlFor={`question-type-${fieldId}`}
                    >
                      Question type
                    </label>
                    <select
                      id={`question-type-${fieldId}`}
                      className={styles.typeSelect}
                      value={editor.draft.type}
                      disabled={isBusy}
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
                  <div className={styles.formField}>
                    <div className={styles.fieldHeader}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor={`question-prompt-${fieldId}`}
                      >
                        Question
                      </label>
                      <span
                        id={`question-prompt-${fieldId}-count`}
                        className={styles.characterCount}
                        aria-live="polite"
                      >
                        {editor.draft.prompt.length} /{" "}
                        {MAX_EDITOR_QUESTION_PROMPT_LENGTH}
                      </span>
                    </div>
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
                  </div>
                  {editor.draft.type === "CHOICE" ? (
                    <fieldset
                      className={styles.choicesFieldset}
                      disabled={isBusy}
                    >
                      <legend className={styles.fieldLabel}>Choices</legend>
                      <div className={styles.choiceList}>
                        {editor.draft.choices.map((choice, index) => (
                          <div
                            className={styles.choiceRow}
                            key={choice.id ?? `new-choice-${index}`}
                          >
                            <div className={styles.choiceInputField}>
                              <div className={styles.fieldHeader}>
                                <label
                                  className={styles.choiceLabel}
                                  htmlFor={`answer-${fieldId}-${index}`}
                                >
                                  Choice {index + 1}
                                </label>
                                <span
                                  id={`answer-${fieldId}-${index}-count`}
                                  className={styles.characterCount}
                                  aria-live="polite"
                                >
                                  {choice.label.length} /{" "}
                                  {MAX_EDITOR_CHOICE_LABEL_LENGTH}
                                </span>
                              </div>
                              <input
                                id={`answer-${fieldId}-${index}`}
                                className={styles.answerLabel}
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
                            </div>
                            {editor.draft.choices.length > 2 ? (
                              <button
                                className={styles.removeAnswer}
                                type="button"
                                onClick={() => editor.onRemoveChoice(index)}
                                aria-label={`Remove choice ${index + 1}`}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {editor.draft.choices.length < 10 ? (
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
