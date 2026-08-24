# 0010. Choose Your Heart template, rationale

## Context

Letterly has one launch template, Secret Letter, and its page lifecycle, public projection, question response, and creator dashboard paths are already shipped. The next scope slice must add Choose Your Heart without making Secret Letter depend on its branching rules.

The product need is a guided emotional journey. A creator authors questions and choices, every terminal path has a result, and a visitor may send a private response after seeing that result. The launch private beta has a small bounded graph, anonymous visitors, users of any age, and the existing privacy and rate limit boundary.

The project uses a monorepo with Next.js and React in `apps/web`, NestJS in `apps/api`, shared Zod contracts, Prisma 7 with PostgreSQL on Neon, Better Auth, Redis, and the existing page and response services. The recorded delivery approach is Tracer Bullet.

> Premise note: An atomic full graph save keeps publication safe, but it means an incomplete editor graph cannot be persisted as a draft. The editor must hold incomplete changes only in current page state. The trusted registry therefore supplies a valid starter graph, and the first slice makes refresh loss of later unsaved edits an explicit tradeoff rather than an accidental behavior.

## Options considered

### Independent relational template records

One journey owns immutable relational graph revisions. Each revision owns question, choice, and outcome records, while the journey points to its current draft and published revision. The API can enforce ownership, ordering, foreign keys, graph validation, and stable published reads. The cost is a migration and more repository code.

### Reuse generic page question records

Existing question and choice records would be extended for outcomes. This minimizes tables, but it couples two templates to one schema and makes template specific validation and rendering harder to keep independent.

### One JSON graph on the page

The complete graph would be stored in one validated JSON document. This is quick to prototype, but it weakens relational constraints, makes owner queries and answer snapshots less precise, and increases the risk that a future editor or migration rewrites unrelated content.

### Separate public and submission services

A dedicated public route and submission path could isolate the template. It would also duplicate page protection, visitor identity, rate limits, idempotency, error mapping, and privacy rules that are already sensitive and tested.

## Rationale

Independent records are the best fit for the requirement that the two templates remain independently validated and rendered. The relational shape makes the graph boundary explicit, supports transactionally creating a complete draft revision, and permits stable private answer snapshots after later edits. Immutable revisions avoid deleting rows referenced by historical answers and make a published graph version explicit. The bounded graph does not need a graph database or a new service.

The atomic page nested API is intentionally smaller than a set of record CRUD routes. A creator save is one graph decision, so validation and version checks happen once, inside one transaction. The existing public page and submission routes remain the security boundary, which avoids a second implementation of protected links, password unlock, browser identity, rate limits, idempotency, and private response handling.

The visitor journey stays in memory and uses the current design system. This follows the project rule that sessions, drafts, visitor responses, and sensitive query data are not persisted in browser storage. The result is a clean privacy boundary at the cost of restarting after refresh.

The registry supplies a valid starter graph so page creation and the no incomplete persistence rule are compatible. Saves create a new immutable revision, published pages continue to use their published pointer until explicit republish, and public submissions include the published revision number. The existing public boundary remains `no-store`; adding a version cache would introduce a new privacy and invalidation decision that this slice does not need.

No new provider or library was selected. Plain TypeScript domain validation with existing Zod contracts is sufficient for a graph limited to 12 questions and outcomes. A React reducer is sufficient for the small editor and visitor state machine; adding a graph library or state machine library would add setup and bundle cost without solving a current problem.
