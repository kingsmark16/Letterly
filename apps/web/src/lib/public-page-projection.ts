import {
  publicSecretLetterProjectionSchema,
  publicSecretLetterLockedProjectionSchema,
  type PublicSecretLetterProjection,
} from "@letterly/contracts/pages";
import {
  pageJourneyPublicPageProjectionSchema,
  type PageJourneyPublicPageProjection,
} from "@letterly/contracts/page-journeys";
import { getPublicWebTemplate } from "../templates/registration";

export class PublicPageUnavailableError extends Error {
  constructor() {
    super("This letter is not available");
    this.name = "PublicPageUnavailableError";
  }
}

export function parsePublicPageProjection(
  payload: unknown,
): PublicSecretLetterProjection | PageJourneyPublicPageProjection {
  const letter = publicSecretLetterProjectionSchema.safeParse(payload);
  const result =
    typeof payload === "object" && payload !== null && "state" in payload
      ? publicSecretLetterLockedProjectionSchema.safeParse(payload)
      : letter.success
        ? letter
        : pageJourneyPublicPageProjectionSchema.safeParse(payload);
  if (!result.success || !getPublicWebTemplate(result.data.template))
    throw new PublicPageUnavailableError();
  return result.data;
}
