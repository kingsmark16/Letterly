# Landing catalog category growth verification

Date: 2026-10-04

The landing server read had a launch specific `categoryKey=confession` filter even though the gallery already rendered its category links from the catalog response. This hid every other category's templates from the landing page. The reader now delegates to the existing `getCatalog` operation, which fetches categories and templates in parallel, validates both responses, and keeps requests uncached.

The web unit test supplies two categories and two template families. Both families use the same template key under different categories, with distinct family and version IDs. It verifies that the reader makes an unfiltered templates request and returns both category and template responses with their original identities.

The long content browser fixture now contains two categories and three template families. The landing gallery test checks the second category link and its template card, in addition to the existing Confession cards. This fixture is gated by `LETTERLY_UI_TEST_FIXTURES=1`; it does not add a category or template to the active catalog.

The empty state copy no longer names the launch category. The narrow viewport overflow assertion ignores descendants of an `aria-hidden` subtree because their boxes can extend beyond the viewport while their parent intentionally clips them. It checks both edges of visible content. The existing document scroll width checks remain.

The web unit suite passed 104 tests. The landing suite passed 24 desktop/touch Chromium cases and 72 Chromium, Firefox, and WebKit cases at compact and desktop widths. Both performance profiles passed with 305,500 CSS bytes, 1,184,306 client JavaScript bytes, CLS 0, and 10 font requests totaling 428,152 bytes. The immutable performance baseline was not changed. The normal production build and root unit suite pass.

This verifies data driven landing composition and a small multi category fixture. It does not measure database pagination, catalog query capacity, or production activation of a second category. Those remain separate repository growth requirements.
