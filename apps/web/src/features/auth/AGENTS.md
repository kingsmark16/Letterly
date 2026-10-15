# Web authentication feature

## Overview

This feature owns Google and Facebook OAuth entry screens. The public sign in and sign up routes create or open accounts through OAuth only. Credential and recovery screens do not exist. It calls the API through the same origin `/api/auth` path and does not contain provider secrets or authorization rules.

## Key files

| File                                 | Owns                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| `components/sign-in-form.tsx`        | OAuth provider actions, auth mode shell, loading state, and safe error state |
| `components/sign-in-form.module.css` | Sign in and sign up presentation using Letterly tokens     |

## Conventions

- Public sign in and sign up render Google and Facebook actions only. Do not restore email/password credential or recovery flows without a new product decision and superseding spec.
- Sign in and sign up use the compact footer and viewport height responsive social layout. Keep controls at least 44 pixels tall, check short landscape screens and provider errors, and preserve natural overflow for content that cannot fit at extreme zoom.
- Keep provider sign in actions in client components and use the shared `src/lib/auth-client.ts` instance.
- Public catalog draft controls use `use-auth-session.ts` to preserve a pending server snapshot during hydration even when the browser session store has already resolved. The hook preserves the Better Auth result after hydration and does not fetch or persist another session.
- OAuth account creation and sign in share the existing safe return-path handling and provider error states.
- Redirect callbacks must use safe same origin paths.
- Keep the sign in page keyboard accessible, provide visible focus states, and respect reduced motion.
- Never persist sessions or provider credentials in local storage.

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
