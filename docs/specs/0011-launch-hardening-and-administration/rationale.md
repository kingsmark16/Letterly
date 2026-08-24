# 0011. Launch hardening and administration, rationale

## Context

The private beta needs a way to respond to abusive or invalid content without giving operators unrestricted access to sensitive letters and visitor responses. Public reporting already exists as a small anonymous write path, but there is no administrator role, moderation state, review queue, audit history, reversible account action, or tested recovery process.

The product supports users of any age and stores personal writing. A page can be published, protected, unhidden, or disabled while visitors and creators are making requests. The system therefore needs strong server side authorization, conditional state changes, shared rate limits, safe projections, and privacy safe observability. The existing monolith, Better Auth sessions, Prisma model, Neon database, Redis or Valkey limits, and Next.js interface are already the project boundary.

This topic spans four independently buildable decisions. The umbrella keeps their contracts aligned, while child documents separate the moderation model, API, interface, and operations. The first release does not need automated moderation, a separate support service, public search, notifications, or a full appeal inbox.

## Options considered

### Option 1: Integrated launch administration in the modular monolith

Add administrator role and policy checks to the existing API, persist moderation and audit state in PostgreSQL, and build the queue in the existing web application.

**Pros**:

1. One authorization boundary controls public, creator, and administrator behavior.
2. Existing transactions, rate limits, contracts, and design primitives are reused.
3. The small team can run one deployment and one recovery process.

**Cons**:

1. Page and user queries must carry new moderation predicates.
2. The API and web application take on operational work that a service could otherwise own.

### Option 2: External moderation service

Forward reports and page identifiers to a hosted moderation or support platform and keep only a local status mirror.

**Pros**:

1. A ready made queue and operator interface could arrive quickly.
2. Some support workflow features would not need to be built locally.

**Cons**:

1. Sensitive report text and page identifiers would cross a new provider boundary.
2. Reconciliation, webhook security, provider outages, and cross system authorization would add risk before beta.

### Option 3: Database only administration

Keep administrators out of the application and operate through SQL scripts or a database console.

**Pros**:

1. It has the fewest application changes.
2. It avoids a new user interface.

**Cons**:

1. It is difficult to audit consistently and easy to bypass application invariants.
2. It cannot provide safe report handling or accessible recovery states for operators.

### Option 4: Automated moderation first

Classify reports or page content automatically and disable content without a human queue.

**Pros**:

1. It could reduce manual review volume at larger scale.
2. It might detect repeated abuse patterns early.

**Cons**:

1. False positives would affect sensitive personal writing and users of any age.
2. It introduces model privacy, evaluation, appeal, and explainability work before the basic control plane exists.

## Rationale

Option 1 fits the existing product forces. The API already owns authentication, ownership, page availability, rate limits, and private projections. Keeping moderation there means a disabled page cannot be reached through a forgotten route, and a session revocation can be made atomic with the user state change. PostgreSQL gives the required relationships, conditional updates, indexes, and audit retention without a new service.

The design deliberately keeps administrator reads narrower than creator reads. Operators can review why a page was reported and what action was taken, but they cannot browse the letter or visitor responses. Reversible state, append only actions, bounded audit metadata, and Neon restore drills provide safety without pretending that an automated classifier or a permanent deletion workflow is ready.

The data model uses a separate appeal aggregate because an appeal has its own concurrency version and lifecycle. Creator requests arrive through the published support contact in this slice, and an administrator records the external reference before deciding it. Idempotency is a database record, not a browser convention, so a lost response can be replayed safely. Public availability is one predicate that includes publication, expiry, creator state, page state, and unlock proof, which prevents a cached or already unlocked page from bypassing a new disable. Page deletion keeps the existing cascade for content and moderation rows, while logical audit identifiers remain until retention removes them.
