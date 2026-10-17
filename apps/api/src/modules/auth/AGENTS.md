# Authentication module

## Overview

This module owns the Better Auth instance and its NestJS route boundary. The application supports Google and Facebook OAuth sign in, OAuth account creation, and sign out. Email/password, email verification, and password recovery are not supported in any environment. OAuth client secrets remain server side.

## Key files

| File                            | Owns                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `infrastructure/better-auth.ts` | Better Auth Prisma adapter, OAuth providers, rate limits, and trusted-origin configuration |
| `auth.controller.ts`            | `/api/auth/*` request handoff to Better Auth          |
| `auth.module.ts`                | NestJS module registration                            |

## Conventions

- Use the shared validated configuration package for `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_ORIGIN`, `REDIS_URL`, and OAuth credentials.
- Keep Google and Facebook credentials out of browser code and logs.
- Reject credential sign in, sign up, verification, recovery, and credential password-management paths at the API boundary in every environment.
- Keep OAuth sign in and account creation, trusted origins, CSRF checks, secure cookies, shared rate-limit storage, and protected-resource session checks enabled.
- Development trusts localhost and IPv4 loopback aliases on the configured APP_ORIGIN port alongside the configured origins. Production does not add these aliases.
- Do not configure transactional authentication email or retain an environment switch for credential authentication.
- Preserve existing User, Account, Session, and Verification rows. Password-only accounts have no supported sign-in until an OAuth provider is already linked; this feature does not link accounts.
- Add authorization guards and ownership policies at the API boundary as creator features are added.

## Agent skills


## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
