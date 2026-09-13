/**
 * UI limits for newly created or edited Secret Letter questions.
 *
 * These limits intentionally live in the creator UI instead of the shared
 * contract for now so existing saved questions remain readable and are not
 * silently truncated.
 */
export const MAX_EDITOR_QUESTION_PROMPT_LENGTH = 150;
export const MAX_EDITOR_CHOICE_LABEL_LENGTH = 150;
