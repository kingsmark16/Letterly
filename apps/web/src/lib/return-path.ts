const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createTemplateStartPath(templateVersionId: string): string {
  if (!uuidPattern.test(templateVersionId)) {
    return "/templates";
  }

  const encodedVersionId = encodeURIComponent(templateVersionId);
  return `/templates?templateVersionId=${encodedVersionId}#template-${encodedVersionId}`;
}

export function getTemplateVersionIdFromStartPath(
  value: string | undefined,
): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  try {
    const url = new URL(value, "http://letterly.local");
    const templateVersionId = url.searchParams.get("templateVersionId");

    if (
      url.origin !== "http://letterly.local" ||
      url.pathname !== "/templates" ||
      !templateVersionId ||
      !uuidPattern.test(templateVersionId)
    ) {
      return undefined;
    }

    return templateVersionId;
  } catch {
    return undefined;
  }
}

export function parseSafeReturnPath(value: string | undefined): string {
  if (!value || value === "/") {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(value, "http://letterly.local");
    const isWorkspacePath =
      url.origin === "http://letterly.local" &&
      (url.pathname === "/templates" ||
        url.pathname === "/dashboard/pages" ||
        url.pathname.startsWith("/dashboard/pages/") ||
        url.pathname.startsWith("/dashboard/letters/"));

    if (isWorkspacePath) {
      return value;
    }

    if (url.pathname !== "/create" || url.searchParams.size !== 1) {
      return "/";
    }

    const templateVersionId = url.searchParams.get("templateVersionId");

    if (!templateVersionId || !uuidPattern.test(templateVersionId)) {
      return "/";
    }

    return createTemplateStartPath(templateVersionId);
  } catch {
    return "/";
  }
}

export function createSignInPath(returnTo: string): string {
  return `/sign-in?returnTo=${encodeURIComponent(parseSafeReturnPath(returnTo))}`;
}
