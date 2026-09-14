# Web authentication feature

## Overview

This feature provides the Letterly sign in and email/password sign up surfaces, alongside the existing Google and Facebook actions. It calls the API through the same origin `/api/auth` path and does not contain provider secrets or authorization rules.

## Key files

| File                                 | Owns                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| `components/sign-in-form.tsx`        | OAuth provider actions, auth mode shell, loading state, and safe error state |
| `components/email-password-form.tsx` | React Hook Form credential sign in and sign up fields      |
| `components/auth-recovery-page.tsx` | Verification, resend, forgot password, reset states, and token URL cleanup |
| `components/sign-in-form.module.css` | Sign in and sign up presentation using Letterly tokens     |

## Conventions

- Keep provider sign in actions in client components and use the shared `src/lib/auth-client.ts` instance.
- Keep credential forms on the shared `@letterly/contracts/auth` schemas, and map all Better Auth failures to safe user facing messages.
- Sign up must not auto sign in; show a generic completion state and send the creator to the existing sign in route.
- Redirect callbacks must use safe same origin paths.
- Recovery tokens are accepted only transiently from the query or hash, then removed with a same origin history replacement; never store or expose them to referrers or analytics.
- Verification and reset callbacks stay fixed to same origin routes, and unknown account or provider failures use generic user facing states.
- Keep the sign in page keyboard accessible, provide visible focus states, and respect reduced motion.
- Never persist sessions or provider credentials in local storage.

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
