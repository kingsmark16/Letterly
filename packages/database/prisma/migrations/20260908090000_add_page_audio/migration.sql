CREATE TYPE "PageAudioState" AS ENUM ('UPLOADING', 'VERIFYING', 'READY', 'FAILED', 'EXPIRED');

CREATE TABLE "PageAudio" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "state" "PageAudioState" NOT NULL DEFAULT 'UPLOADING',
    "sourceStorageKey" TEXT,
    "sourceMimeType" TEXT NOT NULL,
    "sourceByteSize" INTEGER NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "durationMilliseconds" INTEGER,
    "rightsConfirmedAt" TIMESTAMP(3),
    "rightsStatementVersion" TEXT,
    "failureCode" TEXT,
    "processingLeaseExpiresAt" TIMESTAMP(3),
    "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageAudio_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PageAudio_sourceByteSize_check" CHECK ("sourceByteSize" > 0 AND "sourceByteSize" <= 26214400)
);

ALTER TABLE "Page" ADD COLUMN "currentAudioId" UUID;
CREATE UNIQUE INDEX "Page_currentAudioId_key" ON "Page"("currentAudioId");
CREATE INDEX "PageAudio_pageId_state_updatedAt_idx" ON "PageAudio"("pageId", "state", "updatedAt");
CREATE INDEX "PageAudio_expiresAt_idx" ON "PageAudio"("expiresAt");
ALTER TABLE "PageAudio" ADD CONSTRAINT "PageAudio_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Page" ADD CONSTRAINT "Page_currentAudioId_fkey" FOREIGN KEY ("currentAudioId") REFERENCES "PageAudio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
