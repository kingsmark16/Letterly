# Letterly product blueprint reference

This is a concise working reference for `Letterly_Confession_Platform_Blueprint_v3_2.docx`.

The original DOCX is authoritative. This file exists so implementation work can quickly recover the main product rules without replacing the source document.

## Product scope

Letterly is a secure publishing platform for personal confession pages. A creator chooses an independent template, customizes its supported content, saves a draft, previews it, publishes it, and shares its canonical link or QR code. A public page may be password protected. Visitors do not need an account.

The first release has exactly one active category, Confession, and exactly two launch templates:

1. Secret Letter
2. Choose Your Heart

Complete Secret Letter end to end before building the second template. Do not add a third template before publishing, media ownership, password protection, QR sharing, and private response handling are complete.

## Core journeys

Creators can authenticate, browse Confession templates, inspect supported capabilities, create a page, edit and save a draft, preview it, choose a slug, optionally add a password, publish it, share its link or QR code, view responses, and later edit, unpublish, archive, or delete it.

Visitors can open a link or scan a QR code, unlock a protected page, view the confession without an account, start supported interactive content, play music after a deliberate action, submit a private response when enabled, and receive a clear success or failure state.

## Monorepo and folder structure

The repository is a monorepo with `apps/web` for Next.js, `apps/api` for NestJS, `packages/contracts` for shared Zod schemas and API types, and shared configuration packages. Infrastructure scripts and deployment files belong in dedicated infrastructure folders when they are introduced.

The planned Next.js structure is:

```text
apps/web/src/
  app/                       route entries and layouts
  features/                  auth, categories, templates, pages, responses, and media
  templates/                 independent template implementations
  components/                shared interface components
  lib/                       API, query, and auth helpers
  stores/                    limited cross editor UI state
  types/                     web only types
```

The planned NestJS structure is:

```text
apps/api/src/
  modules/                   feature modules
  common/                    decorators, guards, filters, interceptors, pipes, constants
  config/                    API configuration
  database/                  API database infrastructure when needed
  generated/                 generated API artifacts
  main.ts                    application entry point
```

Feature modules should keep controllers, services, repositories, DTOs, policies, mappers, and tests close to the feature. Avoid generic folders that collect unrelated helpers. The current scaffold keeps Next.js `app` at the workspace root. Do not move existing routes during unrelated work. A move to `src/app` requires a separate migration with route, import, build, and browser verification.

## Domain rules

Every page belongs to one creator and one immutable template version. Template capabilities determine which fields, validation rules, media, questions, and public components are available.

Templates are independent. Each template owns its schema, defaults, capabilities, editor, preview, renderer, and visitor experience. Database records store trusted template metadata and version identifiers. They never store executable React, JavaScript, or arbitrary HTML.

Only the page owner or an administrator may modify a page. A page is publicly available only when it is published, not expired, and not disabled. Public responses must be safe projections and must never expose creator identity, private media keys, passwords, dashboard data, or another visitor's response.

Visitor responses remain private to the page creator. Visitors do not become registered users. Passwords are never stored as plain text. QR codes point to the canonical public URL and are not an access control mechanism.

## Technology boundaries

The product uses a TypeScript monorepo with Next.js App Router for web rendering and interaction, NestJS for authentication integration and business rules, Better Auth for email/password plus Google and Facebook sign in, PostgreSQL on Neon through Prisma, Cloudflare R2 for media, and Redis or Valkey for shared rate limits and short lived state in staging and production.

Next.js owns rendering, route composition, forms, template preview, and public display. NestJS owns authentication verification, authorization, validation, page lifecycle, persistence, upload authorization, rate limits, and response storage. The browser is never an authorization boundary.

## Secret Letter rules

Secret Letter supports recipient information, a readable main message, optional images, optional music or voice content, optional questions, optional private visitor messages, and optional password protection. Optional sections disappear completely when not configured.

The public experience may use an envelope opening, wax seal, paper depth, restrained petals, and subtle sound or motion. The main letter must remain readable and usable without animation, music, video, or 3D. Music must have visible visitor controls and must not depend on audible autoplay.

## Security and privacy

Keep creator dashboards, sessions, drafts, locked content, passwords, private responses, and personalized API data out of shared caches. Use safe error messages, ownership checks, request limits, duplicate submission protection, and no sensitive content in logs or analytics.

Public unlock, visitor response, upload authorization, authentication, and creator mutation routes need route specific limits. Rate limit keys and private cache keys must be namespaced by environment and must not expose raw credentials or sensitive content.

## Performance and media

Public media uses immutable, content changing keys. Images are validated, oriented, resized into bounded responsive variants, compressed, and lazy loaded when below the fold. Process large files with bounded memory and small concurrency. Prioritize only the actual opening or largest content image.

Keep public catalog data and safe public projections cacheable only when explicitly configured. Never cache locked page bodies, drafts, sessions, creator dashboards, visitor responses, or unlock proofs in shared caches.

## Explicit non goals

The MVP does not include payments, subscriptions, page credits, unrestricted custom code or CSS, a drag and drop website builder, AI generated layouts, custom domains, native mobile apps, microservices, Kubernetes, Kafka, event sourcing, or a requirement that every template share one universal content schema.

## Delivery rule

Build one narrow tracer bullet path through database, API, web interface, and user experience. Work in bounded milestones. Review every changed file, run the relevant checks manually, explain request flow and security assumptions, and do not accept code that cannot be understood and maintained.

## Mandatory engineering sections

The following rules are transcribed from sections 13 through 19 of the original blueprint. They are mandatory for implementation. The original DOCX remains the full source when details are omitted here.

### 13. Frontend engineering rules

Use Server Components for initial public and route data. Use TanStack Query for interactive authenticated data. Use TanStack Query mutations for API writes. Derive display values during render, use React Hook Form for dependent form behavior, use Zod for template validation, use Next.js routing primitives for route changes, and use search parameters for URL filters.

Use `useEffect` only when synchronizing with a real external system or initializing a client only library that requires it. Every such effect needs explicit cleanup where applicable. Do not use it for ordinary data derivation or request orchestration.

Centralize Axios configuration with the API base URL, credentials, timeout, and safe error normalization. Use stable query key factories, cancellation signals, targeted invalidation, and no automatic infinite mutation retries. Do not duplicate TanStack Query data in Zustand or persist sessions, drafts, dashboard data, visitor responses, password unlock proofs, or other sensitive query data in local storage.

Keep state ownership clear: remote API data belongs to TanStack Query, form input belongs to React Hook Form, template validation belongs to Zod, route state belongs to Next.js URL state, small interface state belongs to React state, and cross editor interaction state belongs to Zustand only when necessary.

Keep template specific animations and heavy dependencies inside each template folder. Lazy load heavy templates. Public templates must be mobile first, accessible, responsive, and tested with empty, short, long, and malformed content.

Use explicit media dimensions or aspect ratios, responsive variants, and correct `srcset` or Next.js Image configuration. Prioritize only the actual above the fold hero image. Lazy load gallery media. Pause nonessential animation and media when the page is hidden or reduced motion is requested.

### 14. NestJS engineering rules

Use feature modules and constructor dependency injection. Keep controllers thin and delegate to application services. Use DTOs or shared contract adapters at the HTTP boundary. Apply global validation with whitelist and safe transformation. Use guards and policy services for authentication, roles, and ownership.

Use exception filters for consistent error envelopes. Use interceptors for request IDs, timing, and response concerns, not business logic. Use Prisma transactions for multi write invariants. Never instantiate Prisma Client inside feature services. Use strict startup configuration validation, structured logging, health and readiness endpoints, and Swagger or OpenAPI for the protected API contract.

Keep provider integrations behind adapters such as storage and authentication services. Rate limit public unlock, response, authentication, and upload authorization routes. In-memory limits are local development only. Staging and production need shared Redis or Valkey storage.

Use stable safe errors such as `SLUG_ALREADY_TAKEN` and `RATE_LIMITED`, include request IDs and retry timing where relevant, and never reveal whether an account, email, or page password exists. Handle trusted proxy headers only from configured trusted proxies.

### 15. API design

The planned API surface includes Better Auth routes; category catalog routes; template detail and preview data; creator page create, list, detail, update, delete, publish, unpublish, and archive routes; slug availability; media upload authorization, completion, and deletion; public page read and unlock; public submissions; creator submission listing and status updates; QR generation; admin moderation; and live and ready health endpoints.

The public page endpoint must return a discriminated response for locked metadata, unavailable state, or safe public render payload. Never send private page content before successful unlock.

Request flow should remain explicit: authentication guard, DTO or contract validation, ownership policy, template capability validation, template content schema validation, repository or Prisma transaction, then a creator safe or public safe mapper.

### 16. Environments and configuration

Development, staging, and production use separate web and API deployments, databases or Neon branches, R2 buckets or prefixes, OAuth applications where needed, and monitoring configuration. Never share a database between staging and production. Never use production R2 prefixes during development.

Validate required environment values at startup. Only deliberate `NEXT_PUBLIC_` values may reach browser code, and they must never contain secrets. Use deployment secret stores, never committed `.env` files. Maintain `.env.example` files with placeholders and descriptions. Run `prisma migrate deploy` during controlled staging and production releases.

Use environment specific CORS, trusted origins, cache namespaces, and rate limit services. Local in memory services are allowed only for development convenience. Staging and production use shared Redis or Valkey with separated namespaces and managed TLS where applicable.

### 17. Security and privacy

Use HTTPS outside local development, HttpOnly and Secure session cookies with appropriate scope, explicit CORS origins, credential handling, and CSRF protections compatible with Better Auth. Hash page passwords and rely on the authentication provider for account password handling.

Rate limit authentication, unlock, public submissions, slug checks, uploads, and creator mutations. Use a content security policy compatible with template media and animation. Never log secrets, private content, cookies, tokens, or passwords. Minimize IP storage and hash it when abuse protection requires it.

Render user text as text, never raw HTML. Validate media ownership on attach and delete. Support creator deletion, response deletion, reporting, and administrator disable controls. Publish privacy, acceptable use, and copyright policies before public launch. User uploaded music must be creator owned or properly licensed.

### 18. Testing strategy

Unit tests must cover template capability validation, slug generation and reserved words, page lifecycle transitions, password hashing and unlock helpers, question answer validation, and public projection mappers.

API integration tests must cover ownership isolation, active category and template rules, unsupported questions, publishing validation and unique slugs, locked content protection, safe rate limited password errors, exact public submission validation, creator only response access, media type and size limits, and authenticated provider sessions.

Playwright journeys must cover email and password authentication, Google and Facebook flows where feasible, Secret Letter draft and preview, image upload, publish and QR target, anonymous public viewing, wrong and correct password unlock, Choose Your Heart private submission, and disabled response forms.

Every template must pass a shared contract suite for valid defaults, long content, missing optional media, mobile layout, reduced motion, and unsupported capabilities.

### 19. CI/CD and deployment

Pull requests must run frozen installation, lint, type checking, tests, Prisma validation, build, integration tests with an isolated database, and practical Playwright smoke tests.

Deployment order is backup or restore point, `prisma migrate deploy`, NestJS deployment with readiness checks, Next.js deployment, smoke tests for authentication, public pages, R2 media, and submissions, then log and Sentry monitoring.

Roll back application code when needed and use forward database migrations instead of destructive ad hoc changes. Use separate environment resources and intentional, auditable production releases.
