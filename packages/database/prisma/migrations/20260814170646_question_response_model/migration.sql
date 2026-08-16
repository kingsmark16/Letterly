-- CreateEnum
CREATE TYPE "PageQuestionType" AS ENUM ('CHOICE', 'PLAIN_MESSAGE');

-- CreateEnum
CREATE TYPE "VisitorSubmissionReadState" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "PageReportReason" AS ENUM ('INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SPAM', 'PERSONAL_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PageReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "PageQuestion" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" "PageQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "config" JSONB,
    "nextQuestionId" UUID,

    CONSTRAINT "PageQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageChoice" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "creatorMessage" TEXT,
    "nextQuestionId" UUID,

    CONSTRAINT "PageChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSubmission" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "browserTokenHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "idempotencyPayloadHash" TEXT NOT NULL,
    "readState" "VisitorSubmissionReadState" NOT NULL DEFAULT 'UNREAD',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorAnswer" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "choiceId" UUID,
    "textAnswer" TEXT,
    "promptSnapshot" TEXT NOT NULL,
    "choiceLabelSnapshot" TEXT,

    CONSTRAINT "VisitorAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorMessage" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "promptSnapshot" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageReport" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "reason" "PageReportReason" NOT NULL,
    "message" TEXT,
    "status" "PageReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageQuestion_pageId_displayOrder_idx" ON "PageQuestion"("pageId", "displayOrder");

-- CreateIndex
CREATE INDEX "PageQuestion_nextQuestionId_idx" ON "PageQuestion"("nextQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "PageQuestion_pageId_key_key" ON "PageQuestion"("pageId", "key");

-- CreateIndex
CREATE INDEX "PageChoice_questionId_displayOrder_idx" ON "PageChoice"("questionId", "displayOrder");

-- CreateIndex
CREATE INDEX "PageChoice_nextQuestionId_idx" ON "PageChoice"("nextQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "PageChoice_questionId_key_key" ON "PageChoice"("questionId", "key");

-- CreateIndex
CREATE INDEX "VisitorSubmission_pageId_readState_submittedAt_idx" ON "VisitorSubmission"("pageId", "readState", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSubmission_pageId_browserTokenHash_key" ON "VisitorSubmission"("pageId", "browserTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSubmission_pageId_idempotencyKey_key" ON "VisitorSubmission"("pageId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "VisitorAnswer_questionId_idx" ON "VisitorAnswer"("questionId");

-- CreateIndex
CREATE INDEX "VisitorAnswer_choiceId_idx" ON "VisitorAnswer"("choiceId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorAnswer_submissionId_questionId_key" ON "VisitorAnswer"("submissionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorMessage_submissionId_key" ON "VisitorMessage"("submissionId");

-- CreateIndex
CREATE INDEX "PageReport_pageId_status_createdAt_idx" ON "PageReport"("pageId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "PageQuestion" ADD CONSTRAINT "PageQuestion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageQuestion" ADD CONSTRAINT "PageQuestion_nextQuestionId_fkey" FOREIGN KEY ("nextQuestionId") REFERENCES "PageQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageChoice" ADD CONSTRAINT "PageChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PageQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageChoice" ADD CONSTRAINT "PageChoice_nextQuestionId_fkey" FOREIGN KEY ("nextQuestionId") REFERENCES "PageQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSubmission" ADD CONSTRAINT "VisitorSubmission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorAnswer" ADD CONSTRAINT "VisitorAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "VisitorSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorAnswer" ADD CONSTRAINT "VisitorAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PageQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorAnswer" ADD CONSTRAINT "VisitorAnswer_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "PageChoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorMessage" ADD CONSTRAINT "VisitorMessage_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "VisitorSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageReport" ADD CONSTRAINT "PageReport_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
