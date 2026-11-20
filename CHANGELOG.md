# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added the dedicated light administration operations console across `/admin/overview`, `/admin/creators`, `/admin/pages`, `/admin/moderation/reports`, `/admin/moderation/appeals`, `/admin/deletions`, and `/admin/moderation/audit`, with scoped admin styling, creator and page search, a dedicated appeal inbox, and accessible recovery states (see `docs/specs/_root/0001-admin-operations-console/index.md`).
- Added confirmed permanent page and creator deletion jobs gated behind `ADMIN_DELETION_ENABLED`, with immediate access barriers, tracked media processing and upload grant ledgers, bounded background cleanup, 730 day retained receipts and evidence, and operator recovery commands (`admin:recover-media-attempt`, `admin:recover-upload-grants`).
- Added transactional UTC daily platform analytics capture (`DailyAdminMetrics` and `AnalyticsCoverage`), the controlled `admin:activate-analytics` command, and the administrator overview with workload counts, current platform totals, lazy loaded trend charts, and exact daily tables.
- Added verified YouTube links as a Secret Letter music source, with the existing vinyl controls and a disclosure before the preloaded player contacts YouTube (see spec 0020).
- Added persisted Secret Letter media records, private upload processing, recovery states, cleanup tracking, owner recovery, and public inline image delivery.
- Added persisted branching questions, visitor submissions, answer snapshots, reports, and the related ownership and uniqueness constraints.
- Added a connected question flow builder with automatic question keys and server assigned creation order, readable branch destinations, explicit journey finish states, and visitor back navigation. Question reordering is disabled so the first question remains the base.
- Added protected owner sharing for published Secret Letters with canonical URLs, browser generated SVG QR codes, copy and download actions, and accessible fallback states (see spec 0007).

### Changed

- Published Secret Letter slugs are now immutable after first publication, including after archive and restore, so printed QR codes remain stable.

### Fixed

- Creator sign out now performs a full document navigation to `/` with shared sign out transition state so the workspace does not flash a sign in prompt or replay a cached authenticated redirect.
- Public image dependency failures now return a safe recoverable `503` response instead of an internal error that could be mistaken for a missing image.
- QR downloads remain available when the SVG preview cannot render, and production app origins reject embedded credentials.
