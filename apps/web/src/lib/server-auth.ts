import { cookies } from "next/headers";
import { getApiOrigin } from "./server-config";

export async function isServerAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const hasSessionCookie =
    cookieStore.has("better-auth.session_token") ||
    cookieStore.has("__Secure-better-auth.session_token") ||
    cookieStore
      .getAll()
      .some((cookie) => cookie.name.includes("session_token"));

  if (!hasSessionCookie) {
    return false;
  }

  const cookieHeader = cookieStore.toString();
  try {
    const response = await fetch(`${getApiOrigin()}/api/auth/get-session`, {
      headers: {
        Accept: "application/json",
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as {
      session?: { id?: string } | null;
      user?: { id?: string } | null;
    } | null;

    return Boolean(data?.session?.id || data?.user?.id);
  } catch {
    return false;
  }
}
