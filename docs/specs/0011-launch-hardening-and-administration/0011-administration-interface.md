# 0011. Administration interface

## Summary

The interface adds a public report form and a private administrator console. The console uses the existing Letterly design source and shared components, with a queue and detail history on desktop and stacked navigation on mobile. Every state has a clear accessible recovery path.

## Requirements

1. The public report entry point has a labeled reason field, optional bounded message, privacy explanation, validation, loading, success, rate limit, unavailable, and retry states.
2. The administrator console has a protected report queue, filters, detail history, action confirmations, page and user controls, appeal state, and audit access.
3. The interface never fetches or renders private page content or visitor responses for administrators.
4. Keyboard focus, live announcements, labels, error descriptions, visible focus, 44 pixel targets, responsive layout, and reduced motion are required.
5. Disabled creators receive a safe unavailable or disabled state and recovery contact path.
6. The administrator routes are `/admin/moderation/reports`, `/admin/moderation/reports/:reportId`, and `/admin/moderation/audit`. Queue state is in URL parameters `status`, `reason`, `pageId`, `userId`, `cursor`, and `size`, with normalized values replacing rather than appending history.
7. A mutation timeout never automatically sends a second request. Retry reuses the same idempotency key and exact payload. A `409` stale version response refreshes the resource and asks for a new confirmation. A successful replay shows the stored result without creating another action.
8. The disabled owner state links to the configured `PUBLIC_SUPPORT_CONTACT_URL`. It never reveals reporter identity, report text, page content, or visitor responses.

## Decision

Use `apps/web/design.md`, existing shared UI primitives, TanStack Query for remote state, URL search parameters for queue filters and cursors, and explicit mutation confirmation. Use server checks for route access and API checks for all authorization. Public and administration data requests use dynamic, no store fetches. Browser Sentry is initialized with URL, form, DOM, breadcrumb, user, slug, and report identifier redaction before an event leaves the browser.

## Page composition

1. Public page report control and dialog.
2. Administrator heading and navigation.
3. Queue filter controls and report list.
4. Report detail with message, safe target identifiers, current states, and action history.
5. Confirmation dialog for each destructive or state changing action.
6. Status, empty, error, retry, disabled, and appeal feedback. Appeal intake and decisions use the same detail route, with external reference and bounded reason only.

Desktop may show queue and detail together. Mobile stacks them and provides clear back navigation. Dialogs trap focus, close with Escape, and return focus to their trigger.

## Build plan

1. Add public report form and safe owner disabled state. Satisfies **AC-3** and **AC-15** of the umbrella.
2. Add protected administrator route, queue, filters, detail, actions, confirmations, and audit view. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, and **AC-14**.
3. Add desktop, mobile, keyboard, reduced motion, loading, empty, and error journeys. Satisfies **AC-14** and **AC-20**.

## Rationale

The existing design source already defines calm dashboard behavior, accessible dialogs, responsive layouts, and privacy language. Reusing it avoids a second visual system and keeps the moderation surface understandable during stressful operator work.
