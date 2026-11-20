-- CreateEnum
CREATE TYPE "DeletionTargetType" AS ENUM ('CREATOR', 'PAGE');

-- CreateEnum
CREATE TYPE "DeletionJobState" AS ENUM ('QUEUED', 'DATABASE_CLEANUP', 'WAITING_FOR_CHILDREN', 'MEDIA_CLEANUP', 'RETRY_WAIT', 'NEEDS_ATTENTION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MediaProcessingState" AS ENUM ('IDLE', 'RUNNING', 'QUIESCED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "StorageWriteState" AS ENUM ('NONE', 'IN_FLIGHT', 'SETTLED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "UploadMediaType" AS ENUM ('IMAGE', 'AUDIO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'DELETION_REQUESTED';
ALTER TYPE "AuditEventType" ADD VALUE 'DELETION_COMPLETED';
ALTER TYPE "AuditEventType" ADD VALUE 'DELETION_RETRY_REQUESTED';
ALTER TYPE "AuditEventType" ADD VALUE 'DELETION_ATTENTION_REQUIRED';
ALTER TYPE "AuditEventType" ADD VALUE 'PROCESSOR_RECOVERY_RECORDED';
ALTER TYPE "AuditEventType" ADD VALUE 'UPLOAD_SETTLEMENT_RECORDED';
ALTER TYPE "AuditEventType" ADD VALUE 'DELETION_CHILD_ATTACHED';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PageImage" ADD COLUMN     "attemptToken" UUID,
ADD COLUMN     "outputManifest" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "processingHostIdentity" JSONB,
ADD COLUMN     "processingInstanceId" UUID,
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "processingState" "MediaProcessingState" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "storageWriteState" "StorageWriteState" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "PageAudio" ADD COLUMN     "attemptToken" UUID,
ADD COLUMN     "outputManifest" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "processingHostIdentity" JSONB,
ADD COLUMN     "processingInstanceId" UUID,
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "processingState" "MediaProcessingState" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "storageWriteState" "StorageWriteState" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "DeletionJob" (
    "id" UUID NOT NULL,
    "targetType" "DeletionTargetType" NOT NULL,
    "targetId" VARCHAR(200) NOT NULL,
    "requestedById" TEXT,
    "parentJobId" UUID,
    "reasonCode" "PageReportReason" NOT NULL,
    "note" VARCHAR(500),
    "state" "DeletionJobState" NOT NULL DEFAULT 'QUEUED',
    "resumeState" "DeletionJobState",
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "leaseOwner" UUID,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastFailureCode" VARCHAR(50),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "pagesTotal" INTEGER NOT NULL DEFAULT 0,
    "pagesCompleted" INTEGER NOT NULL DEFAULT 0,
    "databaseBatchesCompleted" INTEGER NOT NULL DEFAULT 0,
    "mediaTotal" INTEGER NOT NULL DEFAULT 0,
    "mediaCompleted" INTEGER NOT NULL DEFAULT 0,
    "uploadsSafeAfter" TIMESTAMP(3),
    "uploadGrantsTotal" INTEGER NOT NULL DEFAULT 0,
    "uploadManifestSha256" VARCHAR(64),
    "uploadsSettledAt" TIMESTAMP(3),
    "retryChildrenAfterId" UUID,

    CONSTRAINT "DeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionJobMedia" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "cleanupTaskId" UUID,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeletionJobMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionAcceptanceReceipt" (
    "id" UUID NOT NULL,
    "actorId" VARCHAR(200) NOT NULL,
    "operation" VARCHAR(30) NOT NULL,
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "canonicalPayloadHash" VARCHAR(64) NOT NULL,
    "jobId" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionAcceptanceReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageUploadGrant" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "mediaType" "UploadMediaType" NOT NULL,
    "mediaId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageUploadGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProcessingRecovery" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "mediaType" "UploadMediaType" NOT NULL,
    "mediaId" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "attemptToken" UUID NOT NULL,
    "processingInstanceId" UUID NOT NULL,
    "operatorId" VARCHAR(200) NOT NULL,
    "manifestSha256" VARCHAR(64) NOT NULL,
    "evidenceSha256" VARCHAR(64) NOT NULL,
    "evidence" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaProcessingRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadGrantSettlement" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "operatorId" VARCHAR(200) NOT NULL,
    "uploadManifestSha256" VARCHAR(64) NOT NULL,
    "evidenceSha256" VARCHAR(64) NOT NULL,
    "evidence" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadGrantSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletionJob_state_nextRetryAt_requestedAt_id_idx" ON "DeletionJob"("state", "nextRetryAt", "requestedAt", "id");

-- CreateIndex
CREATE INDEX "DeletionJob_leaseExpiresAt_idx" ON "DeletionJob"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "DeletionJob_parentJobId_idx" ON "DeletionJob"("parentJobId");

-- CreateIndex
CREATE INDEX "DeletionJob_completedAt_idx" ON "DeletionJob"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeletionJob_targetType_targetId_key" ON "DeletionJob"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "DeletionJobMedia_jobId_idx" ON "DeletionJobMedia"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletionJobMedia_jobId_cleanupTaskId_key" ON "DeletionJobMedia"("jobId", "cleanupTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletionAcceptanceReceipt_actorId_operation_idempotencyKey_key" ON "DeletionAcceptanceReceipt"("actorId", "operation", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PageUploadGrant_pageId_id_idx" ON "PageUploadGrant"("pageId", "id");

-- CreateIndex
CREATE INDEX "PageUploadGrant_mediaType_mediaId_idx" ON "PageUploadGrant"("mediaType", "mediaId");

-- CreateIndex
CREATE INDEX "MediaProcessingRecovery_jobId_idx" ON "MediaProcessingRecovery"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaProcessingRecovery_mediaType_mediaId_attemptToken_key" ON "MediaProcessingRecovery"("mediaType", "mediaId", "attemptToken");

-- CreateIndex
CREATE UNIQUE INDEX "UploadGrantSettlement_jobId_key" ON "UploadGrantSettlement"("jobId");

-- CreateIndex
CREATE INDEX "PageImage_processingInstanceId_processingState_idx" ON "PageImage"("processingInstanceId", "processingState");

-- CreateIndex
CREATE INDEX "PageAudio_processingInstanceId_processingState_idx" ON "PageAudio"("processingInstanceId", "processingState");

-- AddForeignKey
ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "DeletionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionJobMedia" ADD CONSTRAINT "DeletionJobMedia_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeletionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionJobMedia" ADD CONSTRAINT "DeletionJobMedia_cleanupTaskId_fkey" FOREIGN KEY ("cleanupTaskId") REFERENCES "MediaCleanup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionAcceptanceReceipt" ADD CONSTRAINT "DeletionAcceptanceReceipt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeletionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProcessingRecovery" ADD CONSTRAINT "MediaProcessingRecovery_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeletionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadGrantSettlement" ADD CONSTRAINT "UploadGrantSettlement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeletionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_progress_check" CHECK (
  "attempts" >= 0 AND "version" >= 0 AND "databaseBatchesCompleted" >= 0
  AND "pagesTotal" >= 0 AND "pagesCompleted" BETWEEN 0 AND "pagesTotal"
  AND "mediaTotal" >= 0 AND "mediaCompleted" BETWEEN 0 AND "mediaTotal"
  AND "uploadGrantsTotal" >= 0 AND ("parentJobId" IS NULL OR "targetType" = 'PAGE')
  AND ("resumeState" IS NULL OR "resumeState" IN ('DATABASE_CLEANUP', 'WAITING_FOR_CHILDREN', 'MEDIA_CLEANUP'))
);
ALTER TABLE "DeletionJobMedia" ADD CONSTRAINT "DeletionJobMedia_receipt_check"
  CHECK ("completedAt" IS NOT NULL OR "cleanupTaskId" IS NOT NULL);
ALTER TABLE "PageUploadGrant" ADD CONSTRAINT "PageUploadGrant_deadline_check" CHECK ("expiresAt" >= "issuedAt");
ALTER TABLE "PageImage" ADD CONSTRAINT "PageImage_processing_check" CHECK (
  jsonb_typeof("outputManifest") = 'array' AND jsonb_array_length("outputManifest") <= 100
  AND ("processingState" NOT IN ('RUNNING', 'UNCERTAIN') OR
    ("attemptToken" IS NOT NULL AND "processingInstanceId" IS NOT NULL AND "processingHostIdentity" IS NOT NULL AND "processingStartedAt" IS NOT NULL))
);
ALTER TABLE "PageAudio" ADD CONSTRAINT "PageAudio_processing_check" CHECK (
  jsonb_typeof("outputManifest") = 'array' AND jsonb_array_length("outputManifest") <= 100
  AND ("processingState" NOT IN ('RUNNING', 'UNCERTAIN') OR
    ("attemptToken" IS NOT NULL AND "processingInstanceId" IS NOT NULL AND "processingHostIdentity" IS NOT NULL AND "processingStartedAt" IS NOT NULL))
);
