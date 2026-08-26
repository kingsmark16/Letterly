# Letterly privacy notice (draft)

**Status: draft — legal and privacy review required before publication.**

Letterly stores the account information needed to sign in, creator-authored
letter pages and media, private visitor responses, moderation reports, and
security records. Visitors do not need an account. Letterly does not attach a
visitor name, account, or raw IP address to a response. Reports contain a
reason and an optional message so the moderation team can review a public page.

Creator dashboards, drafts, locked pages, visitor responses, sessions, and
administration records are private. Public pages expose only the content the
creator publishes. Letterly uses Cloudflare R2 for media storage, Neon
PostgreSQL for application records, Better Auth for sessions, and Redis or
Valkey for short-lived rate-limit state. Operational monitoring receives only
allowlisted route, operation, outcome, stable error code, provider, release,
and environment values.

Moderation reports, actions, appeals, and audit events have a 730-day target.
Short-lived administration idempotency records expire after 24 hours. Other
records are retained only as needed to provide the service, meet security
requirements, resolve disputes, or comply with law. A creator may request
account or page support through the configured support contact. The final
published notice must add the applicable legal rights, controller identity,
jurisdiction, and contact details after review.
