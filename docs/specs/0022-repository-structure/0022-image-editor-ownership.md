# 0022. Image editor ownership

**Date**: 2026-10-05
**Status**: Implemented

## Summary

Separate the image editor's pure payload transformations and preview retry component from upload orchestration. This is a local implementation of the parent repository ownership decision, authorized by automatic continuation. It introduces no new product behavior or provider choice.

## Requirements

- **AC-1**: `image-editor-state.ts` owns `EditablePageImage`, `saveableImages`, `sameImagePayload`, `fromOwnerImage`, and `displayState`. Preserve their types and function bodies exactly, apart from exports needed by direct consumers. It imports only contract types.
- **AC-2**: `resilient-image-preview.tsx` owns the existing preview component, URL helper, three attempt limit, and 250 millisecond exponential retry delay. Preserve the component body, cleanup, source fallback, image attributes, and caller key exactly.
- **AC-3**: `ImageEditor` retains upload authorization, completion recovery, replacement, ordering, object URL lifecycle, and reconciliation. Preserve its function body. Migrate every consumer directly, without a compatibility barrel.
- **AC-4**: Verify a saved image renders, a failed media read retries within the existing bound, and a caption saves as a trimmed payload without image bytes. Run the production browser checks at desktop and mobile sizes across Chromium, Firefox, and WebKit, plus web unit tests, build, and the root commit gate.

## Decision

Use two focused owners beside `image-editor.tsx`. The state module remains framework independent. The preview module keeps its own React state and timeout cleanup. The editor imports both directly; draft saving and private preview import the state module directly. Existing styles stay beside the upload editor.

Keeping all code in one file leaves pure payload consumers coupled to a client component. Extracting upload hooks would move interdependent state and cleanup across more boundaries without a clear benefit. This smaller extraction separates independent responsibilities while preserving the current upload owner.

## Value sourcing

| Value | Existing source |
| --- | --- |
| Included image identities, order, and captions | Current editable owner image values and existing `saveableImages` derivation |
| Owner image state labels | Existing `displayState` branches |
| Preview source and fallback | Existing local object URL and API media URL props |
| Preview retry count and delay | Existing constants, three attempts and 250 milliseconds times two to the current attempt |
| Component reset | Existing caller key containing image identity and source |

## Build plan

1. Extract the existing declarations and migrate direct imports. Compare TypeScript syntax trees before and after, allowing only export modifiers.
2. Add fixture browser coverage for preview and payload behavior, using the existing authenticated editor support and synthetic image bytes.
3. Run the required checks, obtain the requested Luna review, update the parent pointer and feature context, and commit the verified milestone.

## Consequences

Pure image payload consumers no longer import upload presentation. Preview retry cleanup has one focused owner. This adds two small files and does not reduce the complexity of the upload lifecycle itself.

## References

- Parent repository structure specification and pages feature `AGENTS.md`.
- Blueprint working reference, frontend, media, testing, and delivery rules.
- Vercel React skill, direct imports and state ownership guidance.
