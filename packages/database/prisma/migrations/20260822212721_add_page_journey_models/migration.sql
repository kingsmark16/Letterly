-- AlterTable
ALTER TABLE "VisitorSubmission" ADD COLUMN     "journeySnapshot" JSONB;

-- CreateTable
CREATE TABLE "PageJourney" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "draftRevisionId" UUID NOT NULL,
    "publishedRevisionId" UUID,
    "nextRevisionNumber" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageJourneyGraphRevision" (
    "id" UUID NOT NULL,
    "journeyId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "rootQuestionId" UUID NOT NULL,
    "maxDepth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageJourneyGraphRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageJourneyQuestion" (
    "id" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageJourneyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageJourneyChoice" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "nextQuestionId" UUID,
    "outcomeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageJourneyChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageJourneyOutcome" (
    "id" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "resultMessage" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageJourneyOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageJourney_pageId_key" ON "PageJourney"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourney_draftRevisionId_key" ON "PageJourney"("draftRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourney_publishedRevisionId_key" ON "PageJourney"("publishedRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyGraphRevision_rootQuestionId_key" ON "PageJourneyGraphRevision"("rootQuestionId");

-- CreateIndex
CREATE INDEX "PageJourneyGraphRevision_journeyId_createdAt_idx" ON "PageJourneyGraphRevision"("journeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyGraphRevision_journeyId_revisionNumber_key" ON "PageJourneyGraphRevision"("journeyId", "revisionNumber");

-- CreateIndex
CREATE INDEX "PageJourneyQuestion_revisionId_displayOrder_idx" ON "PageJourneyQuestion"("revisionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyQuestion_revisionId_key_key" ON "PageJourneyQuestion"("revisionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyQuestion_revisionId_displayOrder_key" ON "PageJourneyQuestion"("revisionId", "displayOrder");

-- CreateIndex
CREATE INDEX "PageJourneyChoice_questionId_displayOrder_idx" ON "PageJourneyChoice"("questionId", "displayOrder");

-- CreateIndex
CREATE INDEX "PageJourneyChoice_nextQuestionId_idx" ON "PageJourneyChoice"("nextQuestionId");

-- CreateIndex
CREATE INDEX "PageJourneyChoice_outcomeId_idx" ON "PageJourneyChoice"("outcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyChoice_questionId_key_key" ON "PageJourneyChoice"("questionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyChoice_questionId_displayOrder_key" ON "PageJourneyChoice"("questionId", "displayOrder");

-- CreateIndex
CREATE INDEX "PageJourneyOutcome_revisionId_displayOrder_idx" ON "PageJourneyOutcome"("revisionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyOutcome_revisionId_key_key" ON "PageJourneyOutcome"("revisionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PageJourneyOutcome_revisionId_displayOrder_key" ON "PageJourneyOutcome"("revisionId", "displayOrder");

-- AddForeignKey
ALTER TABLE "PageJourney" ADD CONSTRAINT "PageJourney_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourney" ADD CONSTRAINT "PageJourney_draftRevisionId_fkey" FOREIGN KEY ("draftRevisionId") REFERENCES "PageJourneyGraphRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourney" ADD CONSTRAINT "PageJourney_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "PageJourneyGraphRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyGraphRevision" ADD CONSTRAINT "PageJourneyGraphRevision_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "PageJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyGraphRevision" ADD CONSTRAINT "PageJourneyGraphRevision_rootQuestionId_fkey" FOREIGN KEY ("rootQuestionId") REFERENCES "PageJourneyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyQuestion" ADD CONSTRAINT "PageJourneyQuestion_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "PageJourneyGraphRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyChoice" ADD CONSTRAINT "PageJourneyChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PageJourneyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyChoice" ADD CONSTRAINT "PageJourneyChoice_nextQuestionId_fkey" FOREIGN KEY ("nextQuestionId") REFERENCES "PageJourneyQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyChoice" ADD CONSTRAINT "PageJourneyChoice_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "PageJourneyOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageJourneyOutcome" ADD CONSTRAINT "PageJourneyOutcome_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "PageJourneyGraphRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
