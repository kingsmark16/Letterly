-- Run one batch against the selected application schema with owner removals paused.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10s';

WITH selected_owner AS MATERIALIZED (
  SELECT page."creatorId" AS creator_id
  FROM "PageUploadGrant" grant_row JOIN "Page" page ON page."id" = grant_row."pageId"
  WHERE grant_row."creatorId" IS NULL
  ORDER BY grant_row."id" LIMIT 1
), candidates AS MATERIALIZED (
  SELECT grant_row."id", page."id" AS page_id, page."creatorId" AS creator_id
  FROM "PageUploadGrant" grant_row JOIN "Page" page ON page."id" = grant_row."pageId"
  WHERE grant_row."creatorId" IS NULL
    AND page."creatorId" IN (SELECT creator_id FROM selected_owner)
  ORDER BY grant_row."id" LIMIT 100
), owners AS MATERIALIZED (
  SELECT owner."id" FROM "user" owner
  WHERE owner."id" IN (SELECT creator_id FROM candidates)
  FOR UPDATE
), pages AS MATERIALIZED (
  SELECT page."id", page."creatorId" FROM "Page" page
  WHERE page."id" IN (SELECT page_id FROM candidates)
    AND page."creatorId" IN (SELECT "id" FROM owners)
  ORDER BY page."id" FOR UPDATE
), updated AS (
  UPDATE "PageUploadGrant" grant_row SET "creatorId" = page."creatorId"
  FROM candidates JOIN pages page ON page."id" = candidates.page_id
  WHERE grant_row."id" = candidates."id" AND grant_row."creatorId" IS NULL
    AND page."creatorId" = candidates.creator_id
  RETURNING grant_row."id"
)
SELECT count(*) AS attributed FROM updated;
COMMIT;
