import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const browserCookieName = "letterly_browser";
const browserCookieMaxAgeSeconds = 365 * 24 * 60 * 60;

function addAuthPrivacyHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function moveResetTokenToFragment(
  request: NextRequest,
): NextResponse | undefined {
  if (request.nextUrl.pathname !== "/reset-password") {
    return undefined;
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return undefined;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.search = "";
  redirectUrl.hash = new URLSearchParams({ token }).toString();

  return addAuthPrivacyHeaders(NextResponse.redirect(redirectUrl));
}

function hasUsableBrowserCookie(request: NextRequest): boolean {
  const value = request.cookies.get(browserCookieName)?.value;
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

export function proxy(request: NextRequest): NextResponse {
  const resetTokenRedirect = moveResetTokenToFragment(request);
  if (resetTokenRedirect) {
    return resetTokenRedirect;
  }

  if (hasUsableBrowserCookie(request)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: browserCookieName,
    value: crypto.randomUUID(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: browserCookieMaxAgeSeconds,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/p/:path*", "/reset-password"],
};
