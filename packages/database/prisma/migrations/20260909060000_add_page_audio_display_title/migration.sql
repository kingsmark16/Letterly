ALTER TABLE "PageAudio"
ADD COLUMN "displayTitle" TEXT NOT NULL DEFAULT 'Untitled song';

ALTER TABLE "PageAudio"
ALTER COLUMN "displayTitle" DROP DEFAULT;
