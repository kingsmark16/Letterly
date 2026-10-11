# 0022. Page persistence projection ownership

Date: 2026-10-04

## Decision

Keep page database operations and their transaction boundaries in PrismaPagesRepository. Move owner/public record mapping and trusted owner projection resolution into the nearby `infrastructure/page-projections.ts`. Move the existing Prisma select objects into `infrastructure/page-selects.ts`. Keep both files in the pages feature and retain the template adapter registries as the owners of template specific behavior.

## Requirements

1. Preserve every select field, predicate, order, and nested relation limit. Select objects remain literal `as const` definitions, including their existing spreads.
2. Preserve projection function bodies, record input types, registry lookup identities, capability checks, media URLs, retry ordering, expiration filtering, errors, and private settings validation.
3. Preserve every repository method, transaction callback, lock order, retry, query argument, and lifecycle result. No new provider, repository port, dependency, migration, route, or product behavior is introduced.
4. Verify the moved definitions against the prior source with parsed TypeScript AST comparison, ignoring only added export modifiers. Verify repository methods are unchanged. Existing repository units and relevant production module HTTP tests pass, as do build, lint, formatting, and types.
5. Reconcile the pages context and evidence without claiming completion of the remaining repository or browser acceptance work.

## Rationale

The 1,556 line repository combines immutable selection definitions, projection mapping, and persistence transactions. These have separate reasons to change: DTO projections and template adapters evolve independently of locking and persistence. Nearby focused files give those definitions clear owners without adding generic utility folders or scattering transactional operations.

Further splitting lifecycle methods only because of line count would obscure their shared Page aggregate and lock invariants. This milestone moves the two cohesive responsibilities while preserving the existing adapter seams and transaction owner. It follows the NestJS repository and single responsibility guidance and the parent feature ownership convention.

The autonomous restructuring instruction authorizes this engineering slice. The existing same model cross check choice applies; the moved responsibilities, dependency direction, unchanged transaction owner, and direct equivalence checks are specified before implementation.
