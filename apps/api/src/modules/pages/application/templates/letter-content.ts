import { secretLetterContentSchema } from '@letterly/templates';
import type { DraftContentUpdate } from './draft-policy';

export function updateLetterContent(
  current: unknown,
  input: DraftContentUpdate,
) {
  const content = secretLetterContentSchema.parse(current);
  return {
    ...content,
    ...(input.title !== undefined ? { title: input.title } : {}),
    recipientName: input.recipientName,
    mainMessage: input.mainMessage,
    ...(input.creatorName !== undefined
      ? { creatorName: input.creatorName }
      : {}),
  };
}
