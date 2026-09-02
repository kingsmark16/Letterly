export interface SecretLetterTemplateIdentity {
  registryKey: string;
  version: number;
  capabilities: readonly string[];
}

interface QuestionCandidate {
  id?: unknown;
  type: string;
  prompt: unknown;
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

/** A malformed stored question must never make anonymous responses available. */
export function isValidSecretLetterQuestion(
  question: unknown,
): question is QuestionCandidate {
  if (!isRecord(question)) return false;
  const candidate = question as unknown as QuestionCandidate;
  if ('id' in candidate && !isUuid(candidate.id)) return false;
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
  return candidate.choices.every((choice) => {
    if (
      !isRecord(choice) ||
      !isUuid(choice.id) ||
      typeof choice.label !== 'string'
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
    return true;
  });
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
