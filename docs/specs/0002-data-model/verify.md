# 0002. Data model verification

Use this checklist after implementation and before `/check verify` is complete.

## Schema checks

1. Run the database package validation command.
2. Generate Prisma Client from the checked in schema.
3. Read the migration SQL before applying it.
4. Confirm foreign keys exist for owner, category, template version, page, slug reservations, media, questions, choices, submissions, answers, visitor messages, and reports.
5. Confirm unique constraints exist for current normalized slugs, permanent slug reservations, template keys, template versions, page question keys, choice keys, browser tokens, idempotency keys, one visitor message per submission, and one attachment per page and media asset.
6. Confirm no password, raw IP, unlock proof, or executable template code is stored in a public projection.

## Behavior checks

1. Create one Secret Letter draft and reopen it through the API.
2. Attempt a stale save from a second client and confirm `409 Conflict`.
3. Publish, unpublish, archive, restore, and delete a page while checking allowed transitions and preserved transition timestamps.
4. Try to attach an unsupported image, audio file, question, or visitor message to a template that does not declare the capability.
5. Change a slug concurrently from two sessions, confirm only one reservation succeeds, and confirm old reservations cannot be reused.
6. Process valid and invalid images and audio files, including expired uploads, missing objects, MIME spoofing, checksum mismatch, duplicate completion, worker retry, cleanup, and permanent failure.
7. Build a choice branch and a plain message follow up, then confirm that a nested question has only one parent, roots are ordered, and cycles are rejected.
8. Edit a question with answers and confirm the server requires an explicit confirmation retry before transactional deletion. Confirm empty submissions are removed when no answer or message remains.
9. Submit one visitor response, retry the same idempotency key with the same payload, then retry with a different payload and confirm the correct result in each case.
10. Unlock a password protected page, confirm the page scoped cookie and Redis proof, rotate the encryption key, then change the password and confirm the old proof fails.
11. Block cookies and confirm response submission is rejected safely. Request another creator’s page, media, question, and response and confirm safe `404` results.
12. Confirm public pages send `no-store` and no index headers, and that state changes do not leave stale content.
13. Submit a public report, confirm no raw IP or visitor identity is stored, and confirm the report rate limit works.
14. Confirm missing template registry entries fail startup validation and unsupported capabilities fail without partial records.

## Required test layers

1. Prisma and domain invariant unit tests.
2. NestJS API integration tests with Supertest.
3. Media worker tests for validation, retries, cleanup, and output metadata.
4. Playwright journeys for creator draft creation, public unlock, visitor response, and dashboard response reading.
5. Configuration and logging tests for rate limits, encryption key versions, error codes, and sensitive value redaction.
