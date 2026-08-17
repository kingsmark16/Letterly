-- CreateEnum
CREATE TYPE "PageImageState" AS ENUM ('UPLOADING', 'VERIFYING', 'SANITIZING', 'READY', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaCleanupStatus" AS ENUM ('PENDING', 'REVIEW');

-- CreateTable
CREATE TABLE "PageImage" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "state" "PageImageState" NOT NULL DEFAULT 'UPLOADING',
    "attachedAt" TIMESTAMP(3),
    "storageKey" TEXT,
    "sourceStorageKey" TEXT,
    "sourceMimeType" TEXT NOT NULL,
    "sourceByteSize" INTEGER NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "outputByteSize" INTEGER,
    "outputSha256" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER,
    "caption" TEXT,
    "replaceImageId" UUID,
    "failureCode" TEXT,
    "processingLeaseExpiresAt" TIMESTAMP(3),
    "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PageImage_sourceByteSize_check" CHECK ("sourceByteSize" > 0 AND "sourceByteSize" <= 10485760),
    CONSTRAINT "PageImage_sortOrder_check" CHECK ("sortOrder" IS NULL OR ("sortOrder" >= 0 AND "sortOrder" <= 9)),
    CONSTRAINT "PageImage_caption_check" CHECK ("caption" IS NULL OR char_length("caption") <= 500)
);

-- CreateTable
CREATE TABLE "MediaCleanup" (
    "id" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "status" "MediaCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastFailureCode" TEXT,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaCleanup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MediaCleanup_attempts_check" CHECK ("attempts" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "PageImage_pageId_sortOrder_key" ON "PageImage"("pageId", "sortOrder");

-- CreateIndex
CREATE INDEX "PageImage_pageId_state_updatedAt_idx" ON "PageImage"("pageId", "state", "updatedAt");

-- CreateIndex
CREATE INDEX "PageImage_pageId_attachedAt_sortOrder_idx" ON "PageImage"("pageId", "attachedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "PageImage_expiresAt_idx" ON "PageImage"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaCleanup_objectKey_key" ON "MediaCleanup"("objectKey");

-- CreateIndex
CREATE INDEX "MediaCleanup_status_nextRetryAt_idx" ON "MediaCleanup"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "MediaCleanup_leaseExpiresAt_idx" ON "MediaCleanup"("leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "PageImage" ADD CONSTRAINT "PageImage_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
