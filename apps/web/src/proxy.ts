import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const browserCookieName = "letterly_browser";
const browserCookieMaxAgeSeconds = 365 * 24 * 60 * 60;

function hasUsableBrowserCookie(request: NextRequest): boolean {
  const value = request.cookies.get(browserCookieName)?.value;
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

export function proxy(request: NextRequest): NextResponse {
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
  matcher: ["/p/:path*"],
};
