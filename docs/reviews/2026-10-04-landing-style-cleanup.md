# Landing stylesheet cleanup verification

Date: 2026-10-04

The landing CSS Module contained many selectors left from earlier compositions. I removed rules only when a TypeScript syntax tree scan found no static reference to any local CSS Module class in that rule. The feature has 11 TypeScript source files, six direct imports of this CSS Module, and 88 referenced class names. None of those imports uses computed access. The stylesheet declared 176 local class names; 89 had no source reference.

The cleanup removed 501 rules. Every local CSS Module class in every selector belonging to a removed rule had no source reference. Rules with a referenced class, global selector, exported value, or no local class were retained. Five empty at rules were removed after their unused rules were removed. Comments outside removed rules, nonempty at rules, global selectors, asset declarations, and all other CSS structure were preserved.

Before editing, the moved stylesheet matched the original file byte for byte. A PostCSS comparison then removed the same 501 candidates in memory and compared the full ordered semantic syntax trees. The comparison includes selectors, declarations, comments, font faces, at rule conditions, nesting context, and rule order. The cleaned file matched that expected tree exactly. SHA 256 of the ordered tree: `f0e08cc3aedd2edd523b0f9e52e6effd7b77933eadeb4c7355cf1efba1a55379`.

An early exploratory selector scan reused a global regular expression and incorrectly marked active `.page` rules as candidates. That result was discarded before editing. The final scan creates a fresh matcher per selector; the syntax tree comparison and browser suites verify the resulting file.

Production browser measurement reports 305,500 CSS bytes on both the 390 px and 1440 px profiles. This is 94,995 bytes (23.72 percent) below the immediately preceding 400,495 byte measurement and 145,879 bytes (32.31 percent) below the immutable 451,379 byte baseline. JavaScript remains 1,184,306 bytes, CLS remains zero, and the page still requests 10 fonts totaling 428,152 bytes. The checked in baseline was not changed.

The normal production build passes, including after the browser suites. The desktop and touch Chromium fixture suite passed 128 cases. The three engine UI suite passed 168 cases across Chromium, Firefox, and WebKit at 390 px and 1440 px. The fixture suite passed for both landing performance profiles. The local commit gate also passed after the cleanup: web lint and TypeScript checks executed, Prettier checked maintained application source and configuration, and unchanged workspace tasks used valid cache entries. The commit hooks will run the gate again when this milestone is committed.

The cascade and declarations of retained rules remain intact, but broader cascade simplification and shared control style ownership are still open. Actual 200 percent browser zoom, live database/provider checks, remote CI, and the repository completion audit remain unverified or in progress.
