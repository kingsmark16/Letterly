# 0022. Image processing application port

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: Application owns a plain sanitize input/output contract, ImageProcessingError, and IMAGE_PROCESSOR token. PageMediaService imports no concrete infrastructure processor and receives the port by token.
* AC-2: The existing ImageProcessor class implements that port. Keep Sharp, file type detection, hashes, image limits, MIME/checksum checks, rotation, WebP conversion, and error codes in infrastructure without behavior changes.
* AC-3: PagesModule retains one processor provider and binds the port with useExisting. Preserve completion claims, processing slots, cleanup, storage writes, ready/failed transitions, and safe error mapping.
* AC-4: Existing image validation/conversion tests exercise the port through a real Nest binding, and service tests resolve a mocked port without concrete processor casts. Enforce the boundary with lint. Repository gates, integration checks, and production builds pass.

## Decision and sources

Continue the established application port pattern. The existing sanitize method supplies every input field and SanitizedImage supplies every output field. The existing ImageProcessingError definition supplies safe failure metadata. Preserve the infrastructure class name and implementation; only its interface import and method signature change. A plain Symbol token follows the existing repository/media storage port convention, with the Nest binding owned by composition code.

No new processing algorithm, dependency, HTTP contract, provider instance, media rule, migration, or deployment is part of this slice. Unlock-cookie transport dependencies and remaining application framework coupling remain further work.
