CREATE TABLE "PageVisit" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "browserTokenHash" TEXT NOT NULL,
    "visitedOn" DATE NOT NULL,
    CONSTRAINT "PageVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageVisit_pageId_browserTokenHash_visitedOn_key" ON "PageVisit"("pageId", "browserTokenHash", "visitedOn");
CREATE INDEX "PageVisit_pageId_visitedOn_idx" ON "PageVisit"("pageId", "visitedOn");
ALTER TABLE "PageVisit" ADD CONSTRAINT "PageVisit_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
