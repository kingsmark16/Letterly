# Administrator report composition verification

Date: 2026-10-05

The report console now owns queries, URL state, mutation attempts, appeal intake, and focus coordination. The existing confirmation dialog and report detail presentation have separate owners beside it. `moderation-presentation.ts` owns their shared types, labels, predicates, and the identical formatters previously repeated in the audit console. The report console decreased from 1,165 to 654 lines. This is a cohesion change, not a performance claim or a new remote state boundary.

## Preservation evidence

The initial extraction preserved the complete report and audit console declarations after normalizing line endings. A final TypeScript declaration comparison checked 24 declarations against the previous commit. Moved component declarations and props, shared types and helpers, query setup, appeal mutation, confirmation attempt handling, navigation, and the complete audit console remain identical. The action mutation differs only in its focus closure calls. Imports and owners changed; HTTP paths, payloads, version checks, idempotency snapshots, safe data projection, and CSS values did not.

The Vercel React guidance is applied through direct imports, existing client boundaries, and retained remote state ownership. There is no bundle or render speed claim.

## Focus repair

A stale mutation browser probe reproduced lost focus with the committed console before extraction. The zero delay timer tried to restore focus before mutation pending state had settled. The trigger remained connected and enabled afterward, but focus was on the document body.

Focus restoration now uses a request consumed by an effect after the dialog closes and mutation pending state settles. Successful and stale actions also wait for the selected detail refresh. A successful action can disable its original trigger after that refresh, so the existing queue heading is the fallback when the trigger cannot receive focus. Cancellation does not wait for a background detail refresh.

The first repair passed 18 browser checks. A further successful action case exposed the disabled trigger timing issue, which the final refresh wait resolves. No API or mutation payload repair was required.

## Verification

- All 24 confirmation checks passed across Chromium, Firefox, and WebKit at 390 and 1,440 pixel widths. They cover locked pending controls, Escape behavior, retry with the exact payload and idempotency key, stale recovery with a fresh version and key, keyboard cancellation, restored trigger focus, and heading fallback.
- Eight existing administrator compatibility checks passed on desktop and mobile, covering canonical controls, keyboard focus, safe content, layout, and audit filters.
- All 121 web unit tests passed.
- The production fixture build and root lint passed. The final commit gate checks lint, formatting, and types.
- [GPT-6 Luna reviewed the final implementation](2026-10-05-admin-report-composition-luna.md) and approved it with no findings.

Browser writes were intercepted fixtures. These results do not establish live administrator authorization, real database moderation behavior, or remote CI success. The existing API remains the security boundary.

## Durable context

The administrator AGENTS.md now identifies each owner and records the focus lifecycle and remote state convention. No new dependency, context directory, or generic helper layer was added. The broader repository migration remains in progress. The separate YouTube behavior conflict recorded in the audio provider review remains unresolved and is outside this change.
