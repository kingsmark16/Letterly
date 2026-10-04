ALTER TABLE "VisitorSubmission" ADD COLUMN "journeyAnswerCount" INTEGER;

ALTER TABLE "VisitorSubmission" ADD CONSTRAINT "VisitorSubmission_journeyAnswerCount_nonnegative"
  CHECK ("journeyAnswerCount" IS NULL OR "journeyAnswerCount" >= 0);
