import { createAuthClient } from "better-auth/react";

const authBaseUrl =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3000/api/auth")
    : `${window.location.origin}/api/auth`;

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
});
