# Authentication

Letterly supports Google and Facebook OAuth for account creation and sign in in every environment. The browser starts OAuth through Better Auth on the same-origin `/api/auth` route. The API validates trusted origins, handles provider callbacks, creates the Better Auth session, and protects creator operations using the existing session.

## Supported routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/sign-in` | GET | Start Google or Facebook sign in |
| `/sign-up` | GET | Start Google or Facebook account creation |
| `/api/auth/sign-in/social` | POST | Begin provider authorization |
| `/api/auth/callback/:provider` | GET | Complete the OAuth callback |
| `/api/auth/get-session` | GET | Read the current session |
| `/api/auth/sign-out` | POST | Revoke the current session |

Email/password sign in, sign up, verification, recovery, and credential password-management routes return 404 at the API boundary. The former verification and recovery page routes are no longer part of the web application.

## Existing account data

Removing the credential access path does not change the Prisma schema or delete any User, Account, Session, or Verification rows. An account that already has a Google or Facebook identity linked can continue with that provider. An account with only a password credential cannot sign in through Letterly unless an OAuth identity is already linked. This change does not automatically link identities or provide account recovery; users recover their Google or Facebook account with that provider.

## Configuration

No authentication mail settings or credential-authentication switch are used. Configure a complete server-side client ID and secret pair for each enabled OAuth provider:

| Setting | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Enable Google OAuth |
| `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` | Enable Facebook OAuth |
| `APP_ORIGIN` | Approved browser origin and OAuth return-path base |
| `BETTER_AUTH_URL` | Better Auth service URL |
| `BETTER_AUTH_SECRET` | Session and OAuth state signing secret |

Provider secrets stay on the API server. The OAuth proxy configuration is used only where the deployment requires the existing cross-host provider redirect relay. The shared rate-limit store remains configured as described in the API environment guide.

## Related decision

The current behavior is specified in [OAuth only authentication](specs/0024-oauth-only-authentication.md). That decision supersedes the earlier [email password verification and recovery design](specs/0018-email-password-verification-and-recovery.md).
