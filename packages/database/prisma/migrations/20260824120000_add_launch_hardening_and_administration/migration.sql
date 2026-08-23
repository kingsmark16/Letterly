-- Launch hardening and administration data model.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('PAGE', 'USER', 'REPORT', 'APPEAL');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('REPORT_REVIEW', 'REPORT_DISMISS', 'REPORT_REOPEN', 'PAGE_DISABLE', 'PAGE_RESTORE', 'USER_DISABLE', 'USER_RESTORE', 'APPEAL_CREATE', 'APPEAL_ACCEPT', 'APPEAL_REJECT');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('PAGE', 'USER', 'REPORT', 'APPEAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('AUTH_SIGN_IN_SUCCEEDED', 'AUTH_SIGN_IN_DENIED', 'ADMIN_BOOTSTRAPPED', 'REPORT_CREATED', 'REPORT_REVIEWED', 'REPORT_DISMISSED', 'REPORT_REOPENED', 'PAGE_DISABLED', 'PAGE_RESTORED', 'USER_DISABLED', 'USER_RESTORED', 'APPEAL_CREATED', 'APPEAL_ACCEPTED', 'APPEAL_REJECTED', 'RETENTION_SUCCEEDED', 'RETENTION_FAILED');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'CONFLICT', 'FAILURE');

-- CreateEnum
CREATE TYPE "RetentionRecordType" AS ENUM ('PAGE_REPORT', 'MODERATION_ACTION', 'APPEAL', 'AUDIT_EVENT', 'ADMIN_IDEMPOTENCY');

-- AlterTable
ALTER TABLE "user"
ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "disabledReason" TEXT,
ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "moderationVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CREATOR';

-- AlterTable
ALTER TABLE "Page"
ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "disabledReason" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "moderationVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PageReport"
ADD COLUMN "moderationVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" UUID NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "pageId" UUID,
    "userId" TEXT,
    "reportId" UUID,
    "appealId" UUID,
    "actorId" TEXT,
    "actionType" "ModerationActionType" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "note" TEXT,
    "previousState" TEXT NOT NULL,
    "resultingState" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" UUID NOT NULL,
    "originalActionId" UUID NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'REQUESTED',
    "externalReference" TEXT NOT NULL,
    "reasonCode" "PageReportReason" NOT NULL,
    "moderationVersion" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "targetType" "AuditTargetType",
    "targetId" TEXT,
    "requestId" TEXT,
    "outcome" "AuditOutcome" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminIdempotencyRecord" (
    "id" UUID NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "resultSnapshot" JSONB NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionClaim" (
    "id" UUID NOT NULL,
    "recordType" "RetentionRecordType" NOT NULL,
    "recordId" TEXT NOT NULL,
    "claimToken" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimExpiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailureCode" TEXT,

    CONSTRAINT "RetentionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLease" (
    "id" UUID NOT NULL,
    "jobName" TEXT NOT NULL,
    "leaseToken" TEXT NOT NULL,
    "leasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationAction_targetType_targetId_createdAt_id_idx" ON "ModerationAction"("targetType", "targetId", "createdAt", "id");
CREATE INDEX "ModerationAction_actorId_createdAt_id_idx" ON "ModerationAction"("actorId", "createdAt", "id");
CREATE INDEX "ModerationAction_reportId_createdAt_id_idx" ON "ModerationAction"("reportId", "createdAt", "id");
CREATE UNIQUE INDEX "Appeal_originalActionId_key" ON "Appeal"("originalActionId");
CREATE INDEX "Appeal_status_requestedAt_id_idx" ON "Appeal"("status", "requestedAt", "id");
CREATE INDEX "AuditEvent_targetType_targetId_createdAt_id_idx" ON "AuditEvent"("targetType", "targetId", "createdAt", "id");
CREATE INDEX "AuditEvent_actorId_createdAt_id_idx" ON "AuditEvent"("actorId", "createdAt", "id");
CREATE INDEX "AuditEvent_eventType_createdAt_id_idx" ON "AuditEvent"("eventType", "createdAt", "id");
CREATE INDEX "AdminIdempotencyRecord_expiresAt_idx" ON "AdminIdempotencyRecord"("expiresAt");
CREATE UNIQUE INDEX "AdminIdempotencyRecord_actorId_operation_targetType_targetI_key" ON "AdminIdempotencyRecord"("actorId", "operation", "targetType", "targetId", "key");
CREATE INDEX "RetentionClaim_claimExpiresAt_idx" ON "RetentionClaim"("claimExpiresAt");
CREATE UNIQUE INDEX "RetentionClaim_recordType_recordId_key" ON "RetentionClaim"("recordType", "recordId");
CREATE UNIQUE INDEX "JobLease_jobName_key" ON "JobLease"("jobName");
CREATE INDEX "JobLease_leaseExpiresAt_idx" ON "JobLease"("leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "Appeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_originalActionId_fkey" FOREIGN KEY ("originalActionId") REFERENCES "ModerationAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminIdempotencyRecord" ADD CONSTRAINT "AdminIdempotencyRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce nonnegative concurrency tokens and bounded moderation notes.
ALTER TABLE "user" ADD CONSTRAINT "user_moderation_version_nonnegative_check" CHECK ("moderationVersion" >= 0);
ALTER TABLE "Page" ADD CONSTRAINT "Page_moderation_version_nonnegative_check" CHECK ("moderationVersion" >= 0);
ALTER TABLE "PageReport" ADD CONSTRAINT "PageReport_moderation_version_nonnegative_check" CHECK ("moderationVersion" >= 0);
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_moderation_version_nonnegative_check" CHECK ("moderationVersion" >= 0);
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_note_length_check" CHECK ("note" IS NULL OR char_length("note") <= 500);
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_external_reference_length_check" CHECK (char_length("externalReference") BETWEEN 1 AND 120);

-- Every moderation action has exactly one typed target, and its logical target id
-- must agree with the corresponding foreign key.
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_target_shape_check" CHECK (
    ("targetType" = 'PAGE' AND "pageId" IS NOT NULL AND "targetId" = "pageId"::text AND "userId" IS NULL AND "reportId" IS NULL AND "appealId" IS NULL)
 OR ("targetType" = 'USER' AND "userId" IS NOT NULL AND "targetId" = "userId" AND "pageId" IS NULL AND "reportId" IS NULL AND "appealId" IS NULL)
 OR ("targetType" = 'REPORT' AND "reportId" IS NOT NULL AND "targetId" = "reportId"::text AND "pageId" IS NULL AND "userId" IS NULL AND "appealId" IS NULL)
 OR ("targetType" = 'APPEAL' AND "appealId" IS NOT NULL AND "targetId" = "appealId"::text AND "pageId" IS NULL AND "userId" IS NULL AND "reportId" IS NULL)
);
