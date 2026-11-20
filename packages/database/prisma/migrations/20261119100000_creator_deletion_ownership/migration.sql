ALTER TABLE "PageUploadGrant" ADD COLUMN "creatorId" TEXT;
CREATE INDEX "PageUploadGrant_creatorId_pageId_id_idx" ON "PageUploadGrant"("creatorId", "pageId", "id");

ALTER TABLE "DeletionJob"
  ADD COLUMN "discoverPagesAfterId" UUID,
  ADD COLUMN "creatorDiscoveryCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "detachedPage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retryChildrenRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retryChildrenById" TEXT,
  ADD CONSTRAINT "DeletionJob_detached_page_check"
    CHECK (NOT "detachedPage" OR ("targetType" = 'PAGE' AND "parentJobId" IS NOT NULL));

CREATE INDEX "MediaCleanup_page_namespace_idx" ON "MediaCleanup" (lower(split_part("objectKey", '/', 2)), "id")
  WHERE split_part("objectKey", '/', 1) = 'pages' AND strpos(substring("objectKey" from 7), '/') > 0;
