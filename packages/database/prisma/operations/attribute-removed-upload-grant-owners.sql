-- Provide page_id and creator_id as psql variables from the reviewed database restore.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10s';

WITH owner AS MATERIALIZED (
  SELECT "id" FROM "user" WHERE "id" = :'creator_id' FOR UPDATE
), verified AS MATERIALIZED (
  SELECT "id" FROM owner
  WHERE NOT EXISTS (SELECT 1 FROM "Page" WHERE "id" = :'page_id'::uuid)
    AND NOT EXISTS (
      SELECT 1 FROM "PageUploadGrant"
      WHERE "pageId" = :'page_id'::uuid AND "creatorId" IS NOT NULL
        AND "creatorId" <> owner."id"
    )
), candidates AS MATERIALIZED (
  SELECT grant_row."id", verified."id" AS creator_id
  FROM "PageUploadGrant" grant_row CROSS JOIN verified
  WHERE grant_row."pageId" = :'page_id'::uuid AND grant_row."creatorId" IS NULL
  ORDER BY grant_row."id" LIMIT 100
), updated AS (
  UPDATE "PageUploadGrant" grant_row SET "creatorId" = candidates.creator_id
  FROM candidates WHERE grant_row."id" = candidates."id" AND grant_row."creatorId" IS NULL
  RETURNING grant_row."id"
)
SELECT count(*) AS attributed FROM updated;
COMMIT;
