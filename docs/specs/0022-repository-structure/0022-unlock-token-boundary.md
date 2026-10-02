# 0022. Unlock token application boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: Controllers parse page scoped cookies. PagePasswordService verifies a plain token and imports no HTTP infrastructure. Token creation and hashing retain their existing algorithms in a feature owned plain helper.
* AC-2: Public page orchestration selects the protected page ID from its existing repository lookup and passes it to an optional request supplied token reader. The controller supplies the reader using the existing cookie parser. Preserve lookup counts, proof verification order, safe locked projections, and unavailable errors.
* AC-3: Preserve cookie names, first matching cookie behavior, decoding, the 512 character bound, options, one day proof lifetime, password versions, page scoped keys, and revocation comparisons. Existing submission, analytics, media, QR, and public read guards continue to verify proofs before exposing content.
* AC-4: Cover transport parsing, controller to token handoff, application page selection, absent proofs, wrong versions, revocation, and store failures. Lint prohibits production pages application/domain imports from HTTP infrastructure. Repository gates and API integration checks pass.

## Sources and implementation

The existing cookie parser supplies the token value. The existing protection lookup supplies the trusted page ID and password version. The proof store remains the source of proof lifetime and revocation state. The application chooses the page ID before calling the controller supplied reader, avoiding an additional query and preserving the existing page specific parsing behavior. UnlockTokenReader is a synchronous function over plain strings, with no Request or HTTP header type. Password verification continues to use the same hashed key, stored proof, and safe configuration error.

This is the next bounded implementation of the parent specification's inward dependency rule. Routes, schema, providers, encryption, and product behavior stay unchanged. Remaining Nest decorators and other framework dependencies are further migration work.
