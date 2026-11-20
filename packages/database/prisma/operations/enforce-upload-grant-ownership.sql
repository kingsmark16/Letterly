-- Apply only after the restricted deletion release record is approved.
-- This stage is intentionally outside automatic Prisma migration deployment.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE "PageUploadGrant" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PageUploadGrant" WHERE "creatorId" IS NULL)
    OR EXISTS (
      SELECT 1 FROM "PageUploadGrant" grant_row LEFT JOIN "user" owner ON owner."id" = grant_row."creatorId"
      WHERE owner."id" IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM "PageUploadGrant" GROUP BY "pageId"
      HAVING count(DISTINCT "creatorId") > 1
    )
    OR EXISTS (
      SELECT 1 FROM "PageUploadGrant" grant_row JOIN "Page" page ON page."id" = grant_row."pageId"
      WHERE grant_row."creatorId" <> page."creatorId"
    )
  THEN
    RAISE EXCEPTION 'Creator grant ownership reconciliation is incomplete';
  END IF;
END $$;

ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" SET NOT NULL;
COMMIT;
