-- Deleted submissions remain as tombstones for creator history, but their
-- visitor supplied uniqueness keys must not reserve a future response.
UPDATE "VisitorSubmission"
SET
  "idempotencyKey" = 'deleted:idempotency:' || "id"::text,
  "browserTokenHash" = 'deleted:browser:' || "id"::text
WHERE "deletedAt" IS NOT NULL;
