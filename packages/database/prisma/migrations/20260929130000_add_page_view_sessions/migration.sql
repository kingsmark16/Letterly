CREATE TABLE "PageViewSession" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "browserTokenHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageViewSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageViewSession_pageId_startedAt_idx" ON "PageViewSession"("pageId", "startedAt");

ALTER TABLE "PageViewSession" ADD CONSTRAINT "PageViewSession_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
