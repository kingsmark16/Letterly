# 0021. Published letter overview

**Date:** 2026-09-29
**Status:** Accepted

## Decision

The editor shows **Overview** first when a letter is published. Draft and archived letters do not show the tab. The existing **Review & share** section keeps its route and publishing controls. The old **Responses** editor tab is replaced; the full private inbox remains at its existing route. Old `section=viewers` links open the published Overview.

## Analytics definitions

- A view is one public opening of an unlocked letter. Repeated openings increment the view count on the page, browser, and UTC day record. A visitor is one browser token per page per UTC day. The API stores only a page-scoped HMAC of that token, never its raw value or an IP address in the visit table.
- The owner can select the last 7, 30, or 90 UTC days. Views, distinct browser visitors, non-deleted responses, and the chart use that same period. The chart groups activity by UTC day.
- Unread totals cover all time and exclude soft-deleted submissions. Recent response rows use the existing private owner submission projection and support All and Unread filters, which carry through to the full inbox.
- Time on page has its own chart beside Activity on wide screens and below it on narrow screens. Each point shows the mean visible-tab time for views that reported at least one second that day; days without measured views have gaps. The panel also shows the overall mean across timed views in the selected period, the sample count, and a dash when there are none. Time is capped at 30 minutes per view, and historical views without duration reports are excluded.
- Visitor tracking starts when this change is deployed; historical page opens are unavailable and are not estimated.
- Visits are recorded from the public page after its unlocked content renders. Metadata fetches, locked pages, private previews, and unavailable pages do not count.

## Boundaries

- Only the authenticated page owner can read analytics. Published ownership is checked in the repository query, and the response is private and uncached.
- The public visit endpoint checks publication, availability, password unlock, browser cookie, and the existing public rate limit before recording. A unique database constraint maintains one record per browser per UTC day while repeated opens increment its view count. The client avoids duplicate effect calls for the same mounted page.
- The visit table cascades on page deletion. Raw browser cookies and visitor identities never appear in the owner response or client chart data.
- Each public opening receives an unguessable view ID. Duration updates require the same browser cookie, a currently available and unlocked page, the view ID, and the public rate limit. Updates only increase bounded active seconds; background-tab time is excluded. The session table cascades on page deletion.
- Both charts use the source-owned shadcn chart component with Recharts and the existing Letterly color tokens. Mobile stacks the charts and private response list; the summary remains compact.

## Deployment

Apply the `20260929110000_add_page_visits`, `20260929120000_count_page_views`, and `20260929130000_add_page_view_sessions` Prisma migrations before serving the new analytics routes. Existing visit rows receive one view each; earlier visitor history and time cannot be backfilled.
