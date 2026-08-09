const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createTemplateStartPath(templateVersionId: string): string {
  if (!uuidPattern.test(templateVersionId)) {
    return '/sign-in';
  }

  return `/create?templateVersionId=${encodeURIComponent(templateVersionId)}`;
}

export function parseSafeReturnPath(value: string | undefined): string {
  if (!value || value === '/') {
    return '/';
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  try {
    const url = new URL(value, 'http://letterly.local');

    if (url.pathname !== '/create' || url.searchParams.size !== 1) {
      return '/';
    }

    const templateVersionId = url.searchParams.get('templateVersionId');

    if (!templateVersionId) {
      return '/';
    }

    return createTemplateStartPath(templateVersionId);
  } catch {
    return '/';
  }
}

export function createSignInPath(returnTo: string): string {
  return `/sign-in?returnTo=${encodeURIComponent(parseSafeReturnPath(returnTo))}`;
}
