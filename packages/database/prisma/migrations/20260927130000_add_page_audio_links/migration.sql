CREATE TYPE "PageAudioLinkProvider" AS ENUM ('YOUTUBE');

CREATE TABLE "PageAudioLink" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "provider" "PageAudioLinkProvider" NOT NULL DEFAULT 'YOUTUBE',
    "videoId" VARCHAR(11) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageAudioLink_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Page" ADD COLUMN "currentAudioLinkId" UUID;
CREATE UNIQUE INDEX "Page_currentAudioLinkId_key" ON "Page"("currentAudioLinkId");
CREATE UNIQUE INDEX "PageAudioLink_pageId_key" ON "PageAudioLink"("pageId");
CREATE INDEX "PageAudioLink_videoId_idx" ON "PageAudioLink"("videoId");

ALTER TABLE "PageAudioLink"
ADD CONSTRAINT "PageAudioLink_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Page"
ADD CONSTRAINT "Page_currentAudioLinkId_fkey"
FOREIGN KEY ("currentAudioLinkId") REFERENCES "PageAudioLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Page"
ADD CONSTRAINT "Page_one_current_audio_source_check"
CHECK ("currentAudioId" IS NULL OR "currentAudioLinkId" IS NULL);
