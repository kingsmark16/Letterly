export interface SecretLetterTemplateIdentity {
  registryKey: string;
  version: number;
  capabilities: readonly string[];
}

interface QuestionCandidate {
  id?: unknown;
  type: string;
  prompt: unknown;
  displayOrder: unknown;
  choices?: unknown;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function hasContiguousDisplayOrder(values: readonly number[]): boolean {
  return [...values]
    .sort((left, right) => left - right)
    .every((value, index) => value === index);
}

/** A malformed stored question must never make anonymous responses available. */
export function isValidSecretLetterQuestion(
  question: unknown,
): question is QuestionCandidate {
  if (!isRecord(question)) return false;
  const candidate = question as unknown as QuestionCandidate;
  if ('id' in candidate && !isUuid(candidate.id)) return false;
  if (!isNonNegativeInteger(candidate.displayOrder)) return false;
  if (
    (candidate.type !== 'CHOICE' && candidate.type !== 'PLAIN_MESSAGE') ||
    typeof candidate.prompt !== 'string' ||
    candidate.prompt.trim().length === 0 ||
    candidate.prompt.trim().length > 2_000
  ) {
    return false;
  }

  if (candidate.type === 'PLAIN_MESSAGE') {
    return (
      candidate.choices === undefined ||
      (Array.isArray(candidate.choices) && candidate.choices.length === 0)
    );
  }

  if (
    !Array.isArray(candidate.choices) ||
    candidate.choices.length < 2 ||
    candidate.choices.length > 10
  ) {
    return false;
  }

  const ids = new Set<string>();
  const labels = new Set<string>();
  const displayOrders: number[] = [];
  return (
    candidate.choices.every((choice) => {
      if (
        !isRecord(choice) ||
        !isUuid(choice.id) ||
        typeof choice.label !== 'string' ||
        !isNonNegativeInteger(choice.displayOrder)
      ) {
        return false;
      }
      const label = choice.label.trim();
      const normalizedLabel = label.toLocaleLowerCase();
      if (
        label.length === 0 ||
        label.length > 500 ||
        ids.has(choice.id) ||
        labels.has(normalizedLabel)
      ) {
        return false;
      }
      ids.add(choice.id);
      labels.add(normalizedLabel);
      displayOrders.push(choice.displayOrder);
      return true;
    }) && hasContiguousDisplayOrder(displayOrders)
  );
}

/** The complete stored question collection must have a valid zero based order. */
export function areValidSecretLetterQuestions(
  questions: readonly unknown[],
): boolean {
  if (
    !Array.isArray(questions) ||
    !questions.every(isValidSecretLetterQuestion)
  ) {
    return false;
  }

  const displayOrders: number[] = [];
  for (const question of questions) {
    if (!isRecord(question) || !isNonNegativeInteger(question.displayOrder)) {
      return false;
    }
    displayOrders.push(question.displayOrder);
  }

  return hasContiguousDisplayOrder(displayOrders);
}

/**
 * Secret Letter response availability is derived from the trusted template
 * definition and the number of valid current questions. Persisted settings
 * are deliberately not part of this policy.
 */
export function resolveSecretLetterResponseAvailability(input: {
  template: SecretLetterTemplateIdentity;
  validQuestionCount: number;
}): boolean {
  return (
    input.template.registryKey === 'confession.secret-letter' &&
    input.template.version > 0 &&
    input.template.capabilities.includes('questions') &&
    input.validQuestionCount > 0
  );
}
