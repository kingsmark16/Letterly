# Large owner cohesion review, c1db226, 2026-10-05

**Reviewed by**: GPT-6 Luna (author on GPT-6)
**Scope**: 50 tracked production TypeScript/TSX/CSS files over 400 lines under `apps/*/src`, `apps/*/app`, and `packages/*/src`; read-only current-state review at `c1db226`
**Verdict**: Approve with nits

## Summary

The large owners reviewed generally have coherent boundaries: API controllers and Nest modules remain transport/composition owners, page persistence adapters keep transaction and aggregate behavior together, editor components orchestrate one feature workflow, and template files preserve template-specific rendering and art. No blocker or major issue was found, and the inspected API application code does not import framework or persistence implementations. Two bounded maintenance opportunities remain: exact duplicate declarations in CSS modules and generic media-cleanup queue methods on the image repository.

## Minor

### Separate the media cleanup queue port from the image repository, `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts:713`

**Problem**: `PrismaPageMediaRepository` owns image preparation, upload lifecycle, owner/public reads, and expiration, then also implements generic cleanup-task claiming and completion/failure updates. The latter methods serve `MediaCleanupService` and the queue handles media from more than the image workflow. The application port exposes those worker operations alongside image operations in `apps/api/src/modules/pages/application/page-media.repository.ts:129`.

**Why it matters**: The cleanup worker depends on an image-named repository abstraction even though it processes the shared media cleanup queue. That couples queue processing and its tests/mocks to image persistence changes, and obscures the independently run cleanup-work contract.

**Suggested fix**: At a future bounded persistence cleanup, define a focused cleanup-task repository port and move claim/success/failure persistence to its adapter. Keep image lifecycle methods and enqueueing of image cleanup keys in the image repository; preserve the existing queue lease, retry, and transaction behavior. This is a maintainability recommendation, not evidence of a current runtime failure.

### Remove only exact duplicate CSS declarations, `apps/web/src/templates/secret-letter/renderer.module.css:2021`

**Problem**: A PostCSS comparison found exact repeated declarations under the same selector and ancestor condition path in six stylesheet owners: `renderer.module.css` (101), `landing/page.module.css` (43), `landing/components/template-showcase.module.css` (39), `pages/editor/draft-editor.module.css` (16), `features/pages/public/visitor-response-form.module.css` (7), and `features/landing/components/frequently-asked-questions.module.css` (9). For example, `.root[data-locked="true"] .envelopeOverlay` repeats `align-items: center` at renderer lines 2021 and 3346 and `justify-items: center` at 2022 and 3347. The FAQ stylesheet is below the 400-line threshold and is supplemental to the 50-file inventory. `auth/components/sign-in-form.module.css` was checked and had no exact duplicates in this scan.

**Why it matters**: These duplicates do not alter the computed cascade, but they make the final style harder to inspect and maintain. Later exact copies look like purposeful overrides even though they add no behavior.

**Suggested fix**: Consolidate only declarations whose selector, ancestor conditions, property, value, and importance are identical. Keep all differing-value overrides, art-direction rules, state selectors, media-query boundaries, and declaration order unchanged; do not use this audit to flatten the intentional template or landing cascades.

## Strengths

- API transport and framework wiring are kept at the presentation/module edges. The large application service uses ports; the inspected repositories own Prisma transaction details rather than leaking them into application code.
- Large React units mostly coordinate one user-facing workflow and delegate specialized work to named child owners. In particular, the Secret Letter editor coordinates shared page-version state while question, image, audio, settings, and response features retain separate component owners.
- Template renderer, player, reader, and their styles remain template-specific. Their length reflects the locked/unlocked states, responsive layout, playback, measurement, and authored visual treatment; splitting by line count risks losing the local behavior and art context.

## Test coverage

This was a static cohesion and boundary review; no code or runtime behavior changed, and no tests were run. The conclusions are limited to the 48 enumerated production files and the supplemental six-stylesheet duplicate scan. This does not establish whole-repository correctness, runtime dependency-injection behavior, or visual equivalence for a future stylesheet cleanup.

## Large-file inventory and disposition

“Retain” means the owner is cohesive at its current boundary; it is not a claim that the file cannot be improved. CSS files with exact duplicate declarations are marked `Retain; bounded exact-dedup opportunity` and covered by the finding above. The media repository is marked as the cleanup-port candidate.

| File | Disposition and boundary evidence |
|---|---|
| `apps/api/src/modules/admin/infrastructure/prisma-admin-moderation.repository.ts` | Retain: protected moderation persistence and its transactional idempotency/audit invariants are kept together. |
| `apps/api/src/modules/admin/presentation/admin.controller.ts` | Retain: one protected admin transport family with shared validation and error mapping; no Prisma work in controller. |
| `apps/api/src/modules/auth/infrastructure/auth-mail.ts` | Retain: one Resend delivery adapter owns timeout, retry, classification, and safe logging around a single provider. |
| `apps/api/src/modules/auth/infrastructure/better-auth.ts` | Retain: one provider integration owns Better Auth configuration, callbacks, email/reset guards, and provider-facing middleware in infrastructure. |
| `apps/api/src/modules/pages/application/page.service.ts` | Retain: draft and lifecycle operations plus public projection/retry use the same Page ports and application boundary; public read is a distinct method but no framework/persistence concern crosses into the service. Reconsider only if read and owner command dependencies diverge. |
| `apps/api/src/modules/pages/infrastructure/prisma-page-audio.repository.ts` | Retain: audio upload/read/retry/ready/failure/removal/expiry form one audio-media lifecycle adapter. |
| `apps/api/src/modules/pages/infrastructure/prisma-page-media.repository.ts` | Cleanup-port candidate: image persistence is coherent; shared cleanup queue claim/outcome operations are a distinct worker contract (finding above). |
| `apps/api/src/modules/pages/infrastructure/prisma-page-questions.repository.ts` | Retain: question/answer CRUD, ordering, and related transactional persistence are one question aggregate. |
| `apps/api/src/modules/pages/infrastructure/prisma-page-submissions.repository.ts` | Retain: visitor submission writes and owner response access operate on the same submission aggregate and page-scope rules. |
| `apps/api/src/modules/pages/infrastructure/prisma-pages.repository.ts` | Retain: Page persistence and lifecycle transitions share transaction/slug/version invariants; splitting would risk scattering those boundaries. |
| `apps/api/src/modules/pages/pages.module.ts` | Retain: Nest composition root wires the Page feature's controllers, services, ports, and adapters. |
| `apps/api/src/modules/pages/presentation/owner-pages.controller.ts` | Retain: one owner page lifecycle route family with shared DTO and error mapping; no persistence implementation leaks. |
| `apps/web/src/features/admin/admin-report-console.tsx` | Retain: one report moderation workflow coordinates queue/detail, filters, actions, retry identity, appeals, and focus restoration; detail/dialog presentation is already delegated. |
| `apps/web/src/features/auth/components/auth-recovery-page.tsx` | Retain: one recovery/verification route owner; it shares the auth form visual system without mixing in unrelated features. |
| `apps/web/src/features/auth/components/sign-in-form.module.css` | Retain: shared auth forms and their responsive states are one visual owner; no exact duplicate declarations were found. |
| `apps/web/src/features/landing/components/hero-context-section.module.css` | Retain: context card, connector SVG styling, keyframes, responsive states, and reduced-motion behavior are scoped to one landing section component. |
| `apps/web/src/features/landing/components/how-letterly-works.module.css` | Retain: section-specific landing presentation. |
| `apps/web/src/features/landing/components/template-showcase.module.css` | Retain; bounded exact-dedup opportunity: showcase cards, gallery states, and template art are one owner. |
| `apps/web/src/features/landing/page.module.css` | Retain; bounded exact-dedup opportunity: route-wide landing composition and responsive/art-direction modes belong to the page. |
| `apps/web/src/features/legal/legal-page.module.css` | Retain: shared legal document presentation. |
| `apps/web/src/features/pages/dashboard/draft-dashboard.module.css` | Retain: dashboard-specific layout and responsive states. |
| `apps/web/src/features/pages/dashboard/how-letterly-works.module.css` | Retain: dashboard help-section presentation. |
| `apps/web/src/features/pages/dashboard/workspace-home.module.css` | Retain: workspace home composition. |
| `apps/web/src/features/pages/dashboard/workspace-navigation.module.css` | Retain: navigation states, including responsive navigation behavior, have a single owner. |
| `apps/web/src/features/pages/editor/draft-editor.module.css` | Retain; bounded exact-dedup opportunity: shared editor shell styles serve the existing editor subfeatures and preserve their common layout contract. |
| `apps/web/src/features/pages/editor/editor-analytics.module.css` | Retain: analytics/recent-response dashboard presentation. |
| `apps/web/src/features/pages/editor/editor-analytics.tsx` | Retain: analytics and recent response activity are composed as one editor overview and response-dialog flow. |
| `apps/web/src/features/pages/editor/editor-letter-preview.module.css` | Retain: responsive device-frame and preview-stage visual owner. |
| `apps/web/src/features/pages/editor/editor-letter-preview.tsx` | Retain: preview sizing and same-origin frame messaging belong to the live preview boundary. |
| `apps/web/src/features/pages/editor/editor-settings.module.css` | Retain: settings and destructive-action presentation. |
| `apps/web/src/features/pages/editor/editor-settings.tsx` | Retain: password, URL, unpublish, and danger-zone actions are one page-settings workflow. |
| `apps/web/src/features/pages/editor/publish-controls.tsx` | Retain: shared letter/journey publishing, unpublishing, slug confirmation, link actions, and private preview are one lifecycle-control surface used by both editor callers; the journey condition changes content-specific copy and preview affordance within that shared flow. |
| `apps/web/src/features/pages/editor/question-editor.module.css` | Retain: question authoring list/form layout. |
| `apps/web/src/features/pages/editor/question-editor.tsx` | Retain: create/edit/delete/reorder and confirmation flows are one question-authoring owner. |
| `apps/web/src/features/pages/editor/secret-letter-draft-editor.tsx` | Retain: central autosave/version state and section navigation coordinate child media/question/settings owners without reimplementing their features. |
| `apps/web/src/features/pages/media/audio-editor.module.css` | Retain: audio editor panel states. |
| `apps/web/src/features/pages/media/audio-editor.tsx` | Retain: file upload and YouTube source are alternate inputs to one audio attachment workflow. |
| `apps/web/src/features/pages/media/image-editor.module.css` | Retain: image upload, ordered gallery, and carousel presentation share one media panel. |
| `apps/web/src/features/pages/media/image-editor.tsx` | Retain: image validation/upload/retry/removal/order and preview form one owner workflow, with state/preview helpers already extracted. |
| `apps/web/src/features/pages/public/visitor-response-form.module.css` | Retain; bounded exact-dedup opportunity: question stages and their public response controls are one form visual owner. |
| `apps/web/src/features/pages/public/visitor-response-form.tsx` | Retain: visitor answer, navigation, and idempotent submission state form one response journey. |
| `apps/web/src/features/pages/responses/response-dashboard.tsx` | Retain: private response list/detail/read/delete/retry and focus restoration form one owner inbox. |
| `apps/web/src/features/pages/responses/submission-response-dialog.module.css` | Retain: response detail dialog presentation. |
| `apps/web/src/templates/choose-your-heart/editor.tsx` | Retain: template-specific graph editing stays isolated from generic page persistence and other template behavior. |
| `apps/web/src/templates/secret-letter/audio-player.module.css` | Retain: player/disc art and playback states are template-specific. |
| `apps/web/src/templates/secret-letter/audio-player.tsx` | Retain: one optional player owns playback controls and synchronized disc motion across its supported audio sources; provider loading and motion child concerns are delegated. |
| `apps/web/src/templates/secret-letter/message-reader.tsx` | Retain: measured reader pagination and reveal state are one template presentation unit; pagination arithmetic is delegated to a helper. |
| `apps/web/src/templates/secret-letter/renderer.module.css` | Retain; bounded exact-dedup opportunity: locked/unlocked envelope, letter, and template art are one renderer visual owner; preserve differing state rules. |
| `apps/web/src/templates/secret-letter/renderer.tsx` | Retain: the Secret Letter template entry point composes its own sections and template-specific child interactions. |
| `packages/contracts/src/pages.ts` | Retain: shared Page transport schemas/types form one contract surface and contain no app framework or persistence code. |

## Completion-audit cross-check

The additive completion audit and its JSON evidence consistently keep the repository goal open: they state completion is unproven, preserve the 0009/shared UI and contract questions as pending, and say the remaining parent boxes are not checked. The inventory arithmetic matches the evidence: 1,183 current tracked paths versus 1,158 prior paths; 52 changes comprise 27 modifications and 25 additions, with no removals. The report limits its import result to 645 code files and 1,605 resolved relative imports, and explicitly excludes semantic review of every line, transitive wrappers, and binary assets. It also scopes the 54 shared UI uses to direct named JSX consumers in 15 files, records the skipped original DOCX comparison and unchanged 19 baseline migration blobs, and distinguishes the fresh 944-test run from unobserved remote CI. The additive 0022 index pointer preserves the same In Progress/open-work status. This was a consistency check of the written report and evidence, not an independent rerun of the inventory or test gates.
