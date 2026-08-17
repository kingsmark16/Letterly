import { headers } from "next/headers";
import { apiErrorEnvelopeSchema } from "@letterly/contracts/errors";
import {
  publicSecretLetterResponseSchema,
  type PublicSecretLetterProjection,
} from "@letterly/contracts/pages";
import { getApiOrigin, getServerConfig } from "./server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "./visitor-identity";

export class PublicPageUnavailableError extends Error {
  constructor() {
    super("This letter is not available");
    this.name = "PublicPageUnavailableError";
  }
}

export async function getPublicPage(
  slug: string,
): Promise<PublicSecretLetterProjection> {
  const config = getServerConfig();
  const requestHeaders = await headers();
  const visitorIdentitySecret =
    config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
  const visitorIdentity = visitorIdentitySecret
    ? createSignedVisitorIdentity(
        getTrustedVisitorAddress(requestHeaders, config.TRUSTED_PROXY_COUNT),
        visitorIdentitySecret,
      )
    : undefined;
  const requestHeaderValues: Record<string, string> = {
    Accept: "application/json",
  };

  const cookieHeader = requestHeaders.get("cookie");
  if (cookieHeader) {
    requestHeaderValues.cookie = cookieHeader;
  }

  if (visitorIdentity) {
    requestHeaderValues[visitorIdentityHeader] = visitorIdentity;
  }

  const response = await fetch(
    `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      headers: requestHeaderValues,
    },
  );

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error = apiErrorEnvelopeSchema.safeParse(body);

    // A public page lookup has only one not found outcome. Keep the status
    // check as the compatibility boundary so a valid API 404 still renders
    // the unavailable page if an older or differently bundled contract
    // rejects an otherwise safe error envelope.
    if (
      response.status === 404 ||
      (error.success && error.data.code === "PAGE_NOT_FOUND")
    ) {
      throw new PublicPageUnavailableError();
    }

    throw new Error("The public letter could not be loaded");
  }

  return publicSecretLetterResponseSchema.parse(await response.json());
}
