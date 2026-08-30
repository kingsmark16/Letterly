# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added persisted Secret Letter media records, private upload processing, recovery states, cleanup tracking, owner recovery, and public inline image delivery.
- Added persisted branching questions, visitor submissions, answer snapshots, reports, and the related ownership and uniqueness constraints.
- Added a connected question flow builder with automatic question keys and server assigned creation order, readable branch destinations, explicit journey finish states, and visitor back navigation. Question reordering is disabled so the first question remains the base.
- Added protected owner sharing for published Secret Letters with canonical URLs, browser generated SVG QR codes, copy and download actions, and accessible fallback states (see spec 0007).

### Changed

- Published Secret Letter slugs are now immutable after first publication, including after archive and restore, so printed QR codes remain stable.

### Fixed

- Public image dependency failures now return a safe recoverable `503` response instead of an internal error that could be mistaken for a missing image.
- QR downloads remain available when the SVG preview cannot render, and production app origins reject embedded credentials.
