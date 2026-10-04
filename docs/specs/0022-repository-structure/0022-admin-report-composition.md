# Administrator report presentation ownership

Date: 2026-10-05

**Status**: Accepted

## Contract

Move the existing confirmation dialog to `admin-confirmation-dialog.tsx` and report detail presentation to `admin-report-detail.tsx`, beside the report console. They keep their current names, props, markup, control states, callbacks, and keyboard behavior. These components already have stable module level definitions; this extraction creates owners without new state or rendering boundaries.

`moderation-presentation.ts` owns the existing report status, reason, operation, confirmation union, reason labels, formatters, and filter predicates shared by these components. Report and audit consoles reuse the identical `humanize` and `formatDate` functions through direct imports. Keep different safe error copy local. No generic helper directory or barrel is added.

`AdminReportConsole` remains the owner of URL filters, query cancellation, query keys, pagination, mutations, exact confirmation attempt snapshots, idempotency keys, stale version recovery, invalidation, appeal intake state, and restored trigger or heading focus. Preserve that orchestration except for the explicit focus repair below. No API route, contract, authorization rule, or CSS value changes.

The baseline stale mutation probe reproduced lost focus before extraction. Replace the zero delay timer with a focus restoration request consumed by an effect after the dialog closes and mutation pending state settles. Mutation completion also waits for the selected detail refresh so a now disabled action cannot receive focus briefly and lose it. Cancellation does not wait for that refresh. Restore the connected trigger when it can receive focus, otherwise use the existing heading fallback. This synchronizes with the DOM and preserves payload and retry semantics.

## Verification

Compare normalized declaration source for the moved components, shared helpers, and audit console. The initial extraction preserved the entire report console; its final diff must contain only the specified focus repair beyond imports and moved definitions. Update source ownership assertions to inspect their actual owners. Run affected browser suites through the existing fixture servers and production build. Confirmation regression cases must verify payload preservation on retry, locked fields, stale recovery, keyboard cancellation, and focus restoration using intercepted fixture mutations. Run web units and the root lint, format, and type gates.

## Rationale

The current 1,165 line report console combines remote state orchestration with two already isolated presentation components. Their reasons to change differ. Separate files make dialog and safe detail changes reviewable without opening mutation code. The audit console has identical label and date formatting; one feature owner avoids repeated implementations while preserving localized browser date output.

This is a local implementation of the authorized feature ownership migration. Sources for all values and behaviors remain current contracts, query data, React state, URL parameters, and existing callbacks. The existing same model cross check choice applies. There is no new load bearing product decision, dependency, or provider.
