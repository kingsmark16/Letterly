# Authentication module

## Overview

This module owns the Better Auth instance and its NestJS route boundary. The first release supports email/password sign in, sign up, and sign out alongside Google and Facebook sign in. OAuth client secrets remain server side.

## Key files

| File                            | Owns                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `infrastructure/better-auth.ts` | Better Auth Prisma adapter, credential policy, rate limits, validation hook, and provider configuration |
| `infrastructure/auth-mail.ts`   | Resend verification and password reset delivery with bounded retries and safe logging |
| `auth.controller.ts`            | `/api/auth/*` request handoff to Better Auth          |
| `auth.module.ts`                | NestJS module registration                            |

## Conventions

- Use the shared validated configuration package for `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_ORIGIN`, `REDIS_URL`, and OAuth credentials.
- Keep Google and Facebook credentials out of browser code and logs.
- Keep email/password validation in the shared `@letterly/contracts/auth` schemas and keep sign up generic for existing email addresses with `autoSignIn: false`.
- Keep email/password rate limits on the shared atomic store so production instances enforce one policy across the deployment.
- Keep CSRF, trusted origins, secure cookies, and Better Auth rate limits enabled.
- Require verified email before credential sign in, use fixed same origin verification and email only reset callbacks, and never auto sign in credential accounts.
- Queue verification and reset delivery after the Better Auth response. Provider failures preserve account state, return generic messages, and log only safe allowlisted metadata.
- Add authorization guards and ownership policies at the API boundary as creator features are added.

## Agent skills

- [email-and-password-best-practices](../../../../../.agents/skills/email-and-password-best-practices/): `better-auth/skills`, email verification, password reset, password policy, and credential hashing guidance
- [email-best-practices](../../../../../.agents/skills/email-best-practices/): `resend/email-best-practices`, transactional email safety, deliverability, and compliance
- [resend](../../../../../.agents/skills/resend/): `resend/resend-skills`, Resend API delivery, retries, idempotency, and webhooks

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
