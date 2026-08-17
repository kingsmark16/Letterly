# Web authentication feature

## Overview

This feature provides the Letterly sign in surface for Google and Facebook. It calls the API through the same origin `/api/auth` path and does not contain provider secrets or authorization rules.

## Key files

| File                                 | Owns                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| `components/sign-in-form.tsx`        | OAuth provider actions, loading state, and safe error state |
| `components/sign-in-form.module.css` | Sign in page presentation using Letterly tokens             |

## Conventions

- Keep provider sign in actions in client components and use the shared `src/lib/auth-client.ts` instance.
- Redirect callbacks must use safe same origin paths.
- Keep the sign in page keyboard accessible, provide visible focus states, and respect reduced motion.
- Never persist sessions or provider credentials in local storage.

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
