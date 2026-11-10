# 0025. Birthday Wish template

**Date**: 2026-11-10
**Status**: Accepted

## Summary

Birthday Wish (`birthday.birthday-wish` version 1) is the first template in the active Birthday (`birthday`) category. It lets an authenticated creator write a personal birthday letter, attach up to 10 photo memories with captions, attach one optional music track or YouTube song, and optionally protect the published page with a password and QR code, without questions or visitor replies. Visitors are greeted on a velvet berry and luminous rose stage by a glowing birthday candle that they blow out by click, tap, or keyboard to unfold an engraved rose gold keepsake card with paginated pink letter pages, the photo memory gallery, and manual vinyl music controls.

## Requirements

**User stories**:

1. As a visitor or creator browsing the landing gallery, templates catalog, or workspace home, I want the Birthday category and Birthday Wish template to be active so that I can discover, preview, and start a Birthday Wish draft.
2. As an authenticated creator, I want to edit a Birthday Wish draft with a title, recipient name, main birthday message, sender sign off, up to 10 photo memories, optional music, and optional password protection, without seeing question or visitor reply tabs.
3. As a visitor opening a published Birthday Wish link, I want to blow out a glowing birthday candle by click, tap, or keyboard to make a wish and unfold the keepsake card.
4. As a visitor reading the unfolded keepsake card, I want to read the paginated birthday letter on pink stationery, browse any attached photo memories, and play attached music manually.
5. As a visitor using a keyboard, screen reader, narrow screen, reduced motion preference, or a browser without JavaScript, I want the entire Birthday Wish card to remain readable, operable, and accessible at WCAG AA contrast.

**Acceptance criteria**:

1. **AC-1**: The `birthday` category in `@letterly/templates` is `ACTIVE`, `workspace-home.tsx` marks `birthday` available, and `birthday.birthday-wish` version 1 (`renderer.key: "birthday-wish"`) is registered in `templateDefinitions` as `ACTIVE` with capabilities `["images", "audio", "passwordProtection"]` and `audioCapability: "optional"`.
2. **AC-2**: `birthday.birthday-wish` version 1 uses the shared letter content schema (`title` optional up to 60 graphemes, `recipientName` required up to 120 graphemes, `mainMessage` required up to 20,000 graphemes, `creatorName` optional up to 120 graphemes) and letter settings schema, requires `recipientName` and `mainMessage` for publishing, and passes the exhaustive `@letterly/templates` contract suite.
3. **AC-3**: API draft creation, draft persistence, owner projection, publish policy, publication adapter, and both public projection adapters register `birthday.birthday-wish` version 1. Public projections always resolve `response` to `{ enabled: false }` and return `template.key: "birthday-wish"` and `template.registryKey: "birthday.birthday-wish"`.
4. **AC-4**: Because `birthday.birthday-wish` omits `questions` and `visitorMessage` from its capabilities, question mutations and public visitor submissions against a Birthday Wish page are rejected by existing capability guards.
5. **AC-5**: The creator draft editor for `birthday.birthday-wish` provides the Words, Photos, and Music tabs plus live preview, review and share, overview analytics when published, and settings, while omitting the Questions tab and Responses navigation link.
6. **AC-6**: The public and preview `Birthday Wish` renderer uses a velvet berry and luminous rose palette with pink letter paper, engraved rose gold botanical frame details, and a golden birthday candle ritual. Before opening, the visitor can blow out the candle via click, tap, or keyboard (`Enter` or `Space`) on a button with at least a 44 by 44 pixel hit target and visible focus ring.
7. **AC-7**: Blowing out the candle triggers a celebratory shimmer and unfolds the keepsake card, transferring keyboard focus to the revealed letter region. The unfolded card reuses paginated letter reading, the accessible photo memory gallery when images are attached, and the manual vinyl audio player when audio or a YouTube link is attached.
8. **AC-8**: When `prefers-reduced-motion: reduce` is active, `skipOpening` is set, or JavaScript is disabled, the birthday letter and any attached memories remain immediately readable without blocking motion, while keeping a replay or open control accessible when interactive.
9. **AC-9**: Web catalog registration, thumbnail rendering, lazy preview modal dialog, full page `/preview/birthday-wish` route, and `/editor-preview/birthday-wish` live preview frame resolve `birthday.birthday-wish` version 1 without falling back to `Secret Letter`.
10. **AC-10**: Unit tests, API projection tests, and Playwright browser checks verify Birthday category discovery, Birthday Wish preview, draft creation, editor tabs, candle opening ritual, keyboard and reduced motion behavior, and mobile and desktop layout stability without horizontal overflow.

## Decision

**Chosen option**: Register `birthday.birthday-wish` version 1 as an independent letter family template that shares the proven `Page.content` and `Page.settings` persistence envelope, media pipeline, and password protection rules while owning its own registry identity, API adapters, editor configuration, and celebratory candle renderer.

The database schema requires no new tables or destructive migrations because `Page.content`, `Page.settings`, `PageImage`, `PageAudio`, and `PageAudioLink` already store letter content, up to 10 images, and optional audio for any template version. Cataloging `birthday` and `birthday.birthday-wish` version 1 as `ACTIVE` allows the existing transactional catalog seed and browser fixtures to provision the category and template automatically.

**Implementation skills**: `ui-ux-pro-max` (`.agents/skills/ui-ux-pro-max/`) · `vercel-react-best-practices` (`.agents/skills/vercel-react-best-practices/`) · `nestjs-best-practices` (`.agents/skills/nestjs-best-practices/`) · `web-design-guidelines` (`.agents/skills/web-design-guidelines/`)

## Feature design

**Registry and contract sketch**:

- `packages/templates/src/category-definitions.ts`: set `birthday` status to `"ACTIVE"`.
- `packages/templates/src/birthday-wish.ts`: export `birthdayWishTemplate` with `registryKey: "birthday.birthday-wish"`, `version: 1`, `capabilities: ["images", "audio", "passwordProtection"]`, `audioCapability: "optional"`, `contentSchema: secretLetterContentSchema`, `settingsSchema: secretLetterSettingsSchema`, `publishRequirements: { requiredContentFields: ["recipientName", "mainMessage"] }`, `questionRules: { required: false }`, and `renderer: { key: "birthday-wish" }`.
- `packages/contracts/src/pages.ts`: allow `publicSecretLetterProjectionSchema` (the shared public letter projection contract) to accept `key: z.enum(["secret-letter", "birthday-wish"])` so both letter family templates validate cleanly across the API and web transport boundary.

**API surface**:

| Endpoint                                                   | Method   | Behavior for Birthday Wish                                                                                                                                                       |
| ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/categories`                                       | GET      | Includes active `birthday` category in display order                                                                                                                             |
| `/api/v1/catalog/overview` and `/api/v1/catalog/templates` | GET      | Includes `Birthday Wish` under `birthday` with capabilities `["images", "audio", "passwordProtection"]`                                                                          |
| `/api/v1/pages`                                            | POST     | Creates a `birthday.birthday-wish` draft using `birthdayWishDraftPolicy` and `birthdayWishDraftPersistenceAdapter`                                                               |
| `/api/v1/pages/:pageId`                                    | GET, PUT | Reads and saves letter content, images, audio, and settings for `birthday.birthday-wish`                                                                                         |
| `/api/v1/pages/:pageId/publish`                            | POST     | Validates non empty `recipientName` and `mainMessage` plus shared audio readiness before publishing                                                                              |
| `/api/v1/public/pages/:slug`                               | GET      | Returns safe public letter projection with `template.key: "birthday-wish"`, `template.registryKey: "birthday.birthday-wish"`, attached media, and `response: { enabled: false }` |

**Value sourcing**:

| Action                 | Value produced or displayed                                                     | Source                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Browse catalog         | Category name, description, thumbnail, and Birthday Wish card                   | `categoryDefinitions`, `templateDefinitions`, and `categoryThumbnails.birthday`                                    |
| Create draft           | Initial empty content and default settings                                      | `birthdayWishTemplate.defaultContent` and `birthdayWishTemplate.defaultSettings`                                   |
| Edit draft             | Words, Photos, and Music workspaces                                             | `OwnerPageProjection` and template capability check (`capabilities` excludes `questions`)                          |
| Public candle ritual   | Recipient greeting, candle flame state, and wish prompt                         | Validated `SecretLetterRenderModel` and `useBirthdayWishOpening` hook                                              |
| Unfolded keepsake card | Title, recipient, paginated message, sign off, memory gallery, and audio player | `SecretLetterRenderModel`, `SecretLetterMessageReader`, `SecretLetterMemoryGallery`, and `SecretLetterAudioPlayer` |

**Key invariants**:

- `birthday.birthday-wish` version 1 is immutable and resolved by exact registry key and version across every API and web registry.
- Public projections for `birthday.birthday-wish` never enable visitor responses or expose private settings.
- All user text renders as plain text, never raw HTML.
- The candle wish button has a minimum 44 by 44 pixel hit area, clear keyboard focus, and `aria-expanded` state.
- Reduced motion or disabled JavaScript never hides the birthday message or photo memories.

**Security model**:

Existing Better Auth session guards, page ownership checks, capability checks, password unlock tokens, rate limits, and private R2 media delivery govern Birthday Wish pages without weakening any boundary.

**Configuration required**:

No new environment variables, external services, or database schema migrations are required. Running `pnpm --filter @letterly/database seed` provisions the active `birthday` category and `birthday.birthday-wish` template in a database environment.

**Critical test scenarios**:

- Template contract suite verifies schema defaults, optional fields, capabilities, identity, and grapheme limits for `birthday.birthday-wish` version 1.
- API unit and integration tests verify repository and transport public projections for `birthday.birthday-wish` version 1.
- Browser tests verify Birthday category filtering, Birthday Wish preview dialog, candle wish opening by pointer and keyboard, reduced motion rendering, and creator editor tabs without Questions or Responses.

## Build plan

1. **Slice 1: Template registry and shared contracts**. Add `packages/templates/src/birthday-wish.ts`, export it from `@letterly/templates`, activate `birthday` and register `Birthday Wish` in `packages/templates/src/catalog.ts`, update `publicSecretLetterProjectionSchema` in `packages/contracts/src/pages.ts`, and extend `packages/templates/src/template-contract.test.ts` and catalog tests. Covers **AC-1** and **AC-2**.
2. **Slice 2: API policies and projection adapters**. Register `birthday.birthday-wish` version 1 in `draft-policies.ts`, `publish-policies.ts`, `publication-adapters.ts`, `draft-persistence-adapters.ts`, `owner-projection-adapters.ts`, infrastructure `public-projection-adapters.ts`, and application `public-projection-adapters.ts`, plus unit tests in both public projection spec suites. Covers **AC-3** and **AC-4**.
3. **Slice 3: Birthday Wish renderer, preview, thumbnail, and editor integration**. Create the `Birthday Wish` renderer, candle opening hook, styles, preview, and thumbnail under `apps/web/src/templates/birthday-wish/`. Register web metadata, thumbnail, preview dialog loader, public presentation boundary, live editor preview, and capability aware `SecretLetterDraftEditor` workspace tabs, and mark `birthday` available in `workspace-home.tsx`. Covers **AC-5**, **AC-6**, **AC-7**, **AC-8**, and **AC-9**.
4. **Slice 4: Verification and browser tests**. Update catalog fixtures and run unit, typecheck, lint, format, and Playwright browser tests for the Birthday category and Birthday Wish template. Covers **AC-10**.

## Consequences

**Positive**:

- Activates the second product category (`Birthday`) with a cohesive celebratory template while reusing Letterly's hardened media, audio, and password infrastructure.
- Keeps template implementations strictly isolated in `@letterly/templates`, API adapter registries, and `apps/web/src/templates/birthday-wish/`.

**Negative and tradeoffs**:

- Every exhaustive template map in API and web must include `birthday.birthday-wish` version 1, which TypeScript enforces at compile time.

**Neutral**:

- Existing `confession.secret-letter` and `confession.choose-your-heart` pages remain untouched.

## Follow-up

- [ ] Consider adding a branching Birthday trivia or milestone timeline template in a future slice once `Birthday Wish` is live.

## Rationale

Reusing the letter content and media persistence envelope lets creators upload photos, attach music, and protect links immediately without duplicating storage or lifecycle tables, while a dedicated template identity, capability set, and candle ritual renderer give Birthday pages their own distinct visitor experience.
