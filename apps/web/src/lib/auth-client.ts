import { createAuthClient } from "better-auth/react";

const authBaseUrl =
  process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3000/api/auth";

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
});
