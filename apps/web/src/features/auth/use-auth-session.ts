"use client";

import { useSyncExternalStore } from "react";
import { authClient } from "../../lib/auth-client";

const subscribe = (): (() => void) => () => {};
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;

export function useAuthSession(): ReturnType<typeof authClient.useSession> {
  const session = authClient.useSession();
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );

  // A resolved browser store must not replace the server's pending snapshot during hydration.
  return hydrated
    ? session
    : { ...session, data: null, error: null, isPending: true };
}
