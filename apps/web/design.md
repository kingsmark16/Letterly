# Letterly design system

**Status:** Internal design source for implementation

**Applies to:** Landing page, creator dashboard, editor preview, and public templates

## 1. Product character

Letterly gives heartfelt words a place that feels more meaningful than an ordinary message. The product should feel romantic, personal, modern, emotionally warm, and carefully made.

The visual language combines editorial stationery with a clear modern web application. Romantic details support the content. They never compete with readability or make the product feel like a wedding invitation.

The dashboard should feel calm and useful. Public templates may be more expressive, animated, and cinematic while still sharing the same typography, colors, controls, and accessibility rules.

## 2. Design source

This document is the internal visual and interaction source for implementation. No external screenshot or Stitch mockup is required.

When a page implementation needs a decision, preserve the product behavior, accessibility, optional content rules, and performance limits recorded here and in the Letterly blueprint reference.

## 3. Core principles

1. The message is always the main content.
2. Romantic details are restrained and intentional.
3. Every optional feature disappears cleanly when it is not configured.
4. Motion adds emotion and feedback. It never blocks reading or interaction.
5. Public pages feel immersive. Creator tools feel calm and efficient.
6. Privacy is explained with plain language, not security imagery.
7. Mobile is a complete experience, not a reduced desktop layout.
8. All controls meet WCAG AA and remain usable without animation, music, video, or 3D support.

## 4. Avoided patterns

Do not use purple, blue, violet, indigo, cyan, or cool gray as primary colors.

Do not use gradients, glassmorphism, neon, glowing blobs, random sparkles, generic 3D hearts, heavy shadows, excessive rounded cards, a pill for every control, decorative bento grids, floating dashboard cards, fake charts, fake statistics, fake testimonials, fake logos, confetti, wedding invitation clichés, or decorative signatures.

Do not place animation over readable text. Do not animate every element at once.

## 5. Color tokens

| Token                 |     Value | Use                               |
| --------------------- | --------: | --------------------------------- |
| `color-canvas`        | `#FAF6F0` | Main warm ivory background        |
| `color-surface`       | `#FFFDFC` | Cards, letter paper, dialogs      |
| `color-surface-muted` | `#F2E9DF` | Quiet section background          |
| `color-ink`           | `#2B211D` | Primary text                      |
| `color-ink-muted`     | `#6E5D54` | Supporting text                   |
| `color-wine`          | `#7A2E3A` | Primary actions and focus accents |
| `color-wine-hover`    | `#642631` | Primary action hover              |
| `color-rose`          | `#C97D77` | Restrained romantic accent        |
| `color-sand`          | `#D9B89C` | Warm neutral decoration           |
| `color-olive`         | `#6B6A45` | Success and natural accent        |
| `color-border`        | `#D8CCC0` | Default borders and dividers      |
| `color-error`         | `#9B3F35` | Error text and borders            |
| `color-warning`       | `#9A642A` | Warning text and borders          |
| `color-focus`         | `#7A2E3A` | Keyboard focus ring               |

Text and controls must meet WCAG AA contrast. Status must never rely on color alone.

## 6. Typography

Use no more than two font families across the Letterly application.

| Role                           | Family   |     Weight | Notes                                                         |
| ------------------------------ | -------- | ---------: | ------------------------------------------------------------- |
| Display and emotional headings | Fraunces | 500 to 650 | Modern romantic serif, limited to headings and short emphasis |
| Interface and body             | Manrope  | 400 to 700 | Navigation, controls, forms, body copy, dashboard data        |

Do not use cursive for interface text. Secret Letter may use the display serif for recipient names and selected short quotations. Long messages remain readable and use a controlled line width.

### Type scale

| Token             | Desktop | Mobile | Line height |
| ----------------- | ------: | -----: | ----------: |
| `type-display`    |   64 px |  42 px |        1.02 |
| `type-h1`         |   48 px |  36 px |        1.08 |
| `type-h2`         |   36 px |  30 px |        1.15 |
| `type-h3`         |   24 px |  22 px |        1.25 |
| `type-body-large` |   18 px |  17 px |         1.7 |
| `type-body`       |   16 px |  16 px |         1.6 |
| `type-small`      |   14 px |  14 px |         1.5 |
| `type-label`      |   13 px |  13 px |         1.3 |

## 7. Spacing and layout

Use a 4 px base unit.

| Token     | Value |
| --------- | ----: |
| `space-1` |  4 px |
| `space-2` |  8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-5` | 24 px |
| `space-6` | 32 px |
| `space-7` | 48 px |
| `space-8` | 64 px |
| `space-9` | 96 px |

Desktop content width is at most 1200 px. Long letter text is at most 720 px. Dashboard table content may use the full application width.

Use 20 to 24 px page padding on mobile, 32 to 48 px on tablet, and 64 to 80 px on desktop.

## 8. Shape, border, and elevation

| Token            |                                Value | Use                                                    |
| ---------------- | -----------------------------------: | ------------------------------------------------------ |
| `radius-small`   |                                 8 px | Inputs, small controls                                 |
| `radius-medium`  |                                12 px | Cards, drawers                                         |
| `radius-large`   |                                16 px | Dialogs, page previews                                 |
| `radius-round`   |                               999 px | Icon controls only when a circular shape is meaningful |
| `border-default` |            1 px solid `color-border` | Most surfaces                                          |
| `shadow-low`     |  `0 2px 12px rgba(43, 33, 29, 0.06)` | Raised cards                                           |
| `shadow-medium`  | `0 14px 40px rgba(43, 33, 29, 0.12)` | Dialogs and letter layers                              |

Use shadows only when depth communicates hierarchy. Use borders, spacing, and typography for most separation.

## 9. Interaction and motion tokens

| Token              |                            Value | Use                                 |
| ------------------ | -------------------------------: | ----------------------------------- |
| `motion-fast`      |                           120 ms | Pressed and hover feedback          |
| `motion-standard`  |                           220 ms | Drawers, menus, form feedback       |
| `motion-slow`      |                           420 ms | Section reveal and page transitions |
| `motion-cinematic` |                  2000 to 4000 ms | Secret Letter opening sequence only |
| `ease-standard`    | `cubic-bezier(0.2, 0.8, 0.2, 1)` | General movement                    |
| `ease-gentle`      | `cubic-bezier(0.22, 1, 0.36, 1)` | Paper and letter movement           |

Hover may move a card by no more than 2 px. Focus rings use a 2 px wine outline with a 2 px offset. Pressed states use a small scale change no lower than `0.98`.

Reduced motion replaces spatial movement, parallax, particle effects, and 3D unfolding with short opacity transitions.

## 10. Iconography and assets

Use one consistent thin stroke icon family. Icons support text labels and do not replace important words.

Suitable decorative assets include paper texture, an envelope fold, a wax seal, a pressed flower, a quiet postage mark, a ribbon, a candlelight loop, and subtle distant petals.

Decorative assets must not cover text or controls. Decorative video is muted and has a poster frame. Creator uploaded video is not part of the product model.

## 11. Shared components

### Buttons

Primary buttons use wine red, white text, a modest radius, and a minimum height of 44 px. Secondary buttons use a warm surface with a visible border. Tertiary actions use text with an underline or icon when useful.

Every button has default, hover, focus, pressed, loading, disabled, and error recovery states.

### Inputs

Inputs use visible labels above the field. Placeholder text never replaces a label. Errors appear below the field and are linked with `aria-describedby`.

Text areas show character counts when limited. Password fields include reveal and hide controls with accessible names.

### Cards

Cards use borders and spacing before shadows. Template cards include a real preview, name, short description, restrained capability information, Preview, and Use this template actions.

### Dialogs and drawers

Dialogs trap focus, close with Escape, return focus to their trigger, and include a visible close button. Template preview uses a side drawer on desktop and a full screen dialog on mobile.

### Status treatments

Draft, Published, Unpublished, Archived, Read, and Unread use text plus an icon or shape. Status labels should not all become rounded pills.

### Music control

Visitors always see Play or Pause and the current music state. The compact control area also provides Replay opening, Reduce motion, and Page menu actions.

## 12. Landing page

### Navigation

Show the Letterly wordmark, Templates, How it works, Privacy and safety, Sign in, and the primary Create a page action.

### Hero

Use the headline “Say what your heart has been holding.”

Use the supporting copy “Create a personal page for the words, memories, and questions that deserve more than an ordinary message.”

Primary action is Create a letter. Secondary action is Explore templates. Include the trust statement “Private by default. Share only when you are ready.”

Show a real Secret Letter product preview. Do not use a generic floating browser frame.

### Template discovery

Show the Confession category and the available templates from the catalog API.

Secret Letter uses the line “For the words you want someone to keep.”

Choose Your Heart uses the line “Turn a heartfelt question into an interactive journey.”

Selecting Preview opens a detailed preview. Selecting Use this template begins the creator flow.

### How it works

Show Choose a template, Make it yours, and Preview and share as a progressive interactive preview. Avoid three identical icon cards.

### Optional capabilities

Explain that images, music, questions, private visitor messages, and password protection are optional and depend on the selected template.

### Privacy and safety

Explain creator publishing control, optional passwords, private visitor responses, no account requirement for visitors, reporting, and the product intent to avoid search indexing of sensitive pages.

### Questions and final action

Use concise expandable questions followed by “Some words deserve their own place.” The primary action is Create your Letterly page.

Never add fake testimonials, fake usage numbers, or fake company logos.

## 13. Creator dashboard

Desktop uses a restrained side navigation. Mobile uses a compact menu or bottom navigation.

Navigation includes Overview, My pages, Responses, Templates, Settings, and Account.

The overview includes a personal greeting, Create a page, compact totals for pages, published pages, drafts, and unread responses, My pages, Recent responses, and quick template selection.

My pages includes title, template, status, last edited date, response count, Preview, Edit, Share, and More actions. Filters support status and template.

Recent responses show page title, submission date, read state, a short answer summary, and Open response. Visitors remain anonymous.

Provide purposeful empty states for no pages, no published pages, no responses, no search results, and catalog unavailable. Empty states explain the next useful action and avoid generic illustrations.

Do not add analytics charts unless real historical data exists.

## 14. Secret Letter content contract

All sections after the main letter are optional. Missing content removes its section and spacing completely.

| Source value                | Public presentation                                                        |
| --------------------------- | -------------------------------------------------------------------------- |
| `recipientName`             | Recipient introduction, such as “For Mia”                                  |
| `mainMessage`               | Main readable letter content                                               |
| Ordered content sections    | Stable message, image, question, visitor message, and postscript placement |
| Image attachments           | Memory gallery with required descriptions                                  |
| Uploaded or YouTube music   | Persistent visitor music control                                           |
| `autoPlayMusic`             | Attempts playback at the allowed start point                               |
| Choice question             | 2 to 10 choices                                                            |
| Choice creator message      | Optional response revealed for that selected choice                        |
| Choice next question        | Optional selected branch continuation                                      |
| Plain message question      | Labeled visitor text answer                                                |
| Plain message next question | Optional continuation after text submission                                |
| Visitor message setting     | Separate optional private message section                                  |
| Password setting            | Unlock experience before any private content appears                       |

Do not display a sender signature. Do not invent a sender name.

## 15. Secret Letter visitor flow

### Locked state

When password protection is enabled, show only a calm unlock screen with the recipient safe title, password input, reveal control, Unlock letter action, loading state, and safe error. Do not reveal letter text, imagery, or private settings behind the screen.

### Opening state

After unlock, or after load when no password exists, show a sealed envelope in a warm cinematic paper environment. The visitor activates Open your letter. The wax seal releases, the envelope opens, the letter unfolds, and the main content appears within 2 to 4 seconds.

Always provide Skip animation. The page menu provides Replay opening.

### Reading state

The recipient introduction leads into the main message. The first paragraph may reveal gently. Later paragraphs remain stable while scrolling.

### Memory gallery

Support up to 10 optimized images. Present them as carefully arranged prints with restrained depth. The full screen viewer supports keyboard, swipe, previous, next, descriptions, and close.

### Questions

Choice questions reveal the selected creator message and only the selected follow up branch. Visitors may return to an earlier choice and update the visible branch.

Plain message questions use a labeled text area. An optional follow up appears after text submission.

Questions feel conversational, not like a survey.

### Separate visitor message

Use the heading “Would you like to leave a private message?” and the explanation “Only the creator of this page will be able to read it.”

This message is separate from question answers. It includes a label, text area, character count, privacy reminder, and optional status.

### Submission and confirmation

The Send privately action submits question answers and the separate visitor message together. Preserve entered content on failure and prevent duplicate submission.

Confirmation uses “Your response has been sent privately.” A restrained animation may fold the reply into a small envelope beside the original letter. Do not use confetti or an oversized success icon.

### Footer

Show the private response explanation, Report this page, Privacy, and Return to Letterly. Never expose creator identity, passwords, private settings, storage paths, internal identifiers, or visitor responses.

## 16. Music behavior

Music is optional. The creator can enable or disable autoplay.

On a protected page, playback may begin only after successful unlock. On an unprotected page, playback may be attempted after load. Browser autoplay rules always apply.

When playback is blocked, show Play music. Visitors always retain Play and Pause controls. Never autoplay audible decorative video.

## 17. Secret Letter motion and 3D

The envelope and unfolding paper are the single primary 3D centerpiece.

Supporting motion may include a pressed flower beside the letter, small distant petals, soft paper depth, subtle photo parallax, a warm candlelight loop, quiet dust in the opening scene, and a ribbon or wax seal divider.

Keep the reading surface stable. Pause decorative motion outside the viewport and when the browser tab is hidden.

### Opening storyboard

| Frame      | Visual                                                                   |           Duration |
| ---------- | ------------------------------------------------------------------------ | -----------------: |
| Sealed     | Envelope rests in a warm paper environment                               |        500 ms hold |
| Invitation | Open your letter control receives focus                                  | Visitor controlled |
| Release    | Wax seal loosens with depth and tactile sound only when sound is allowed |             500 ms |
| Unfold     | Envelope flap and letter use gentle 3D transforms                        |    1000 to 1800 ms |
| Reveal     | Letter settles and recipient content fades in                            |      500 to 900 ms |

Sound effects are optional, muted by default, and separate from creator music.

## 18. Video and performance

Decorative video is muted, short, looped, and used only where pre-rendered motion is cheaper than live rendering. Use WebM or MP4 with a poster frame, static fallback, viewport based loading, and pause outside the viewport.

Prioritize recipient name and main letter content. Do not block them on music, 3D, video, images, or questions.

Use responsive images and modern formats. Lazy load below the fold assets. Prefer transforms and opacity for motion. Avoid continuous JavaScript animation when CSS is enough.

The experience must remain usable when JavaScript motion fails, music cannot play, video cannot load, 3D is unsupported, or the connection is slow.

## 19. Responsive behavior

| Surface               | Desktop                                | Mobile                                           |
| --------------------- | -------------------------------------- | ------------------------------------------------ |
| Navigation            | Full navigation                        | Compact menu                                     |
| Landing hero          | Text and product preview composition   | Single column, preview after actions             |
| Dashboard             | Side navigation and wide content       | Compact navigation and stacked content           |
| Template preview      | Side drawer                            | Full screen dialog                               |
| Secret Letter opening | Centered cinematic scene               | Full width scene with safe touch controls        |
| Letter                | Layered paper surface, max 720 px text | Edge aware paper surface with 20 px page padding |
| Gallery               | Print composition and viewer           | Swipe viewer with visible controls               |
| Music controls        | Compact corner or lower control group  | Sticky bottom control bar                        |
| Questions             | Centered conversational block          | Full width controls with 44 px targets           |

Design at 1440 px desktop and 390 px mobile. Check intermediate widths at 768 px and 1024 px.

## 20. Accessibility

1. Meet WCAG AA contrast.
2. Keep every interactive element keyboard accessible.
3. Use visible focus rings.
4. Keep touch targets at least 44 px.
5. Use semantic headings and labeled inputs.
6. Link errors to fields with `aria-describedby`.
7. Announce music state, branch updates, submission progress, and errors through appropriate live regions.
8. Do not communicate state through color alone.
9. Hide decorative 3D and video assets from screen readers.
10. Respect `prefers-reduced-motion` and provide a visitor motion control.

## 21. Required states

Stitch designs must cover normal, loading, empty, error, disabled, focus, hover, and reduced motion states where applicable.

Secret Letter requires separate references for incorrect password, unavailable page, opening scene, opened letter, image failure, music unavailable, choice before and after selection, plain message, visitor message, submission failure, cookies blocked, already submitted, successful response, reduced motion, and creator preview.

## 22. Creator preview mode

Preview mode includes a clear Preview mode indicator, desktop and mobile viewport switch, Replay opening, music testing, password unlock testing without exposing the saved password, question branch testing, and Exit preview.

Preview interactions never create real visitor responses.

## 23. Implementation handoff

Build one screen at a time, beginning with the desktop landing page at 1440 px and checking the mobile layout at 390 px. Then build the dashboard and the Secret Letter renderer.

Use realistic Letterly copy. Mark example names, messages, and images as replaceable creator content.

Produce buildable React and CSS interfaces, not abstract concept art. Preserve all optional content, accessibility, responsive, privacy, and performance rules in this document.

# Secret Letter editor: Stitch-scoped visual override

The Secret Letter creator editor is a deliberate, feature-scoped exception to
the quieter global Letterly surface rules. Its source of truth is Stitch project
`5426653796818726204`, screen `c10bad44861346f983e82585f865e4ca` (Variant 4:
Blush Rose Romantic Neumorphic). This exception does not apply to public
letters, authentication, the dashboard, or other templates.

- Use Geist throughout the editor, with `#fbf9f5` canvas, `#f5f3ef` raised
  surfaces, `#efeeea` inset surfaces, `#9b3a50` accent, `#1b1c1a` primary ink,
  and `#6a5c52` secondary ink.
- Raised editor cards use soft paired shadows (`6px 6px 12px #e5e1d8` and
  `-6px -6px 12px #fff`). Inputs, tab rails, image rows, and question rows use
  paired inset shadows (`inset 4px 4px 8px #e5e1d8` and
  `inset -4px -4px 8px #fff`).
- Desktop uses a wide two-column composition: editor controls on the left and
  a sticky live preview on the right. Below the desktop breakpoint, columns
  stack and the preview remains available after the controls.
- Neumorphism never replaces state communication. Interactive controls retain
  visible labels, WCAG AA contrast, a clear wine focus ring, keyboard support,
  at least 44px targets, and reduced-motion behavior.

# Public Secret Letter: romantic glass studio override

The public and preview Secret Letter renderer is a feature-scoped expressive
exception governed by spec 0016. It does not change dashboards, authentication,
creator editors, or other templates.

- Use a warm pastel pink and cream studio gradient with restrained translucent
  shapes, glossy CSS hearts, light particles, and abstract ribbons.
- Present the opened letter on an airy white glass-paper stage with strong text
  contrast, soft ambient shadows, and stable reading surfaces.
- Present sequential visitor questions inside a centered floating glass quiz
  labeled `choose`; use crimson and deep-magenta pill choices with a subtle
  metallic highlight and visible keyboard focus.
- Concentrate GSAP motion in the envelope reveal, ambient pointer depth, and
  state transitions. Frequent controls use short CSS feedback. Reduced motion
  removes spatial and decorative movement without hiding content.
- Decorative depth never delays the recipient message, intercepts input, or
  weakens password privacy, accessibility, responsive behavior, or the
  no-JavaScript reading path.
