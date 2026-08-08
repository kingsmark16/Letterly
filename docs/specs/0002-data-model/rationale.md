# 0002. Flexible template data model, rationale

## Context

> Premise note: This discussion grew beyond a database shape into API, media processing, password access, response privacy, and operational behavior. This spec records the shared contract needed for those slices. Separate feature specs should refine the user interface, authentication implementation, media worker operations, and launch administration before each is built.

Letterly has a relational core, but each template may have different fields and optional capabilities. Secret Letter needs romantic content, images, audio, themes, passwords, and optional questions. Choose Your Heart needs a branching question flow. Future categories such as Birthday and Anniversary must be able to add their own templates without adding category specific columns to the core page table.

The project is a monorepo for one beginner developer. It uses TypeScript, Next.js, NestJS, PostgreSQL on Neon, Prisma 7, Better Auth, Redis, and Cloudflare R2. The delivery approach is Tracer Bullet, so the model must support a narrow draft journey first and grow through real end to end slices.

The current scope document says adults only. The newer product decision allows users of any age. That changes the safety and privacy boundary. Visitor data must be minimized, public responses must remain private, and a minimal report record, rate limits, and abuse controls must exist before a public launch. Automated moderation and administrator audit records remain follow up work.

Passwords are a deliberate exception to normal one way password storage because the creator may reveal the password in their dashboard. The stored value therefore uses AES 256 GCM envelope encryption, an external key and version, masking by default, safe log redaction, and short lived visitor unlock proofs. A one way hash would be simpler and safer, but it would not meet the confirmed dashboard reveal requirement.

## Options considered

### Option 1: Hybrid relational platform with validated template JSON

Shared entities use PostgreSQL tables and foreign keys. Template specific page content uses JSONB validated by a trusted template schema. Questions, media attachments, and responses remain structured because their limits and deletion behavior are important.

**Pros**:

1. Supports different template fields without constant migrations.
2. Preserves relational ownership, uniqueness, pagination, and transactions.
3. Allows precise deletion of question responses and strong media ownership checks.

**Cons**:

1. Developers must understand both JSON validation and relational constraints.
2. Template schema changes require careful versioning and compatibility tests.

### Option 2: Fully relational universal model

Every section, field, question, choice, media attachment, and setting becomes a shared table or column.

**Pros**:

1. Database queries and constraints are explicit.
2. Reporting across common fields is straightforward.

**Cons**:

1. Different templates are forced into a shared shape.
2. New template fields and behaviors create more migrations and coupling.

### Option 3: One JSON document for each page and response

The complete page and visitor submission are stored as JSON documents with minimal relational metadata.

**Pros**:

1. New templates can add fields quickly.
2. The initial schema is small.

**Cons**:

1. Ownership, response deletion, pagination, and uniqueness are harder to enforce.
2. Question branching and response reporting become application only rules.
3. Large unstructured documents make migrations and debugging harder.

## Rationale

Option 1 fits the product forces. The platform has real relationships, ownership rules, lifecycle transitions, unique slugs, response deletion, and cursor pagination, so a relational database must remain authoritative for those concerns. At the same time, the product explicitly requires independent templates with fields that may not exist in other categories. Validated JSON gives each trusted template room to evolve without turning the shared schema into a universal form builder.

The structured question and media records are intentional exceptions to a JSON only approach. Their constraints affect security, storage cost, response privacy, and destructive edit behavior. JSON owns template fields and visual layout only. Structured tables are the one source of truth for questions, media, submissions, answers, visitor messages, and reports. The model also keeps provider clients outside domain code, uses transactions for destructive mutations, and keeps public projections separate from private settings.

Permanent slug reservations resolve a subtle race and privacy problem. A database unique constraint on only the current page slug would allow an old public URL to be claimed by a different page after a slug change or deletion. Keeping a small immutable reservation record makes the old URL unavailable forever and makes concurrent changes safe.

The template registry is a shared trusted package rather than executable database content. This lets the API and web application use the same versioned defaults, schemas, capabilities, publish requirements, and renderer metadata. An idempotent seed script supplies the first catalog records, while future templates can be added without changing the shared page table.

Media uses explicit page attachments because one creator may reuse an asset on multiple pages. Page deletion therefore removes the attachment first and deletes the asset only when no attachment remains. Direct storage operations stay outside database transactions and are reconciled through cleanup jobs, so an R2 or worker failure cannot make an unverified asset publishable.

The design accepts operational cost for asynchronous media processing because image and audio conversion can be slow and memory intensive. The worker is introduced only in the media slice, after the core draft and publishing path is proven. This keeps the Tracer Bullet path understandable while preserving the confirmed launch target.
