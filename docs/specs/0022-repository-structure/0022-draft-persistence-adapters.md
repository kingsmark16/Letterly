# 0022. Template owned draft persistence

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PageService passes canonical registry key and pinned version from its existing trusted active template lookup to the internal repository port. Resolve exact registered persistence adapters with compile time coverage of canonical catalog keys. No HTTP contract change or fallback.
* AC-2: Secret Letter owns content/settings parsing and requires no journey payload. Choose Your Heart owns compatibility content/settings parsing, requires the validated journey input, defers constraints before page creation, and creates its first immutable revision afterwards using only the supplied transaction.
* AC-3: The repository retains generated slugs, five attempts on unique collisions, nested slug reservation, owner selection and mapping, and the page transaction. Verify the created template identity against the trusted input within the transaction before template writes and commit. Preparation or write failures propagate for rollback.
* AC-4: Preserve journey IDs, question/outcome relationships, choice ordering, revision number one, maxDepth, and draft revision selection. Never create a client or use the outer client for adapter writes.
* AC-5: Verify both identities, unsupported versions, malformed and missing payloads, service identity propagation, transaction ordering, supplied transaction ownership, and error propagation. Pass repository gates, integration checks, and builds.

## Sources and decision

Use the parent structure spec's existing registered adapter pattern. Input identity comes from PageService's active TemplateVersionReader result and resolveTemplate, not a browser supplied template key. Content/settings and validated journey/maxDepth come from the registered application draft policy. Generated UUIDs retain their existing Node crypto source. The selected created record supplies the page ID and stored template identity.

Prepared persistence exposes beforePage and afterPage operations. The repository passes the current transaction for every attempt; no operation captures an earlier transaction. Move the existing journey revision writes into the journey adapter without changing their graph semantics. Stored Secret Letter compatibility types and later draft update behavior remain outside this slice.
