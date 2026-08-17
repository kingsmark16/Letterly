-- Preserve anonymous duplicate protection after content deletion and make
-- submitted answer order explicit for owner projections.
ALTER TABLE "VisitorSubmission"
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "VisitorAnswer"
ADD COLUMN "answerOrder" INTEGER;

WITH ordered_answers AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "submissionId"
      ORDER BY "id" ASC
    ) - 1 AS "answerOrder"
  FROM "VisitorAnswer"
)
UPDATE "VisitorAnswer" AS answer
SET "answerOrder" = ordered_answers."answerOrder"
FROM ordered_answers
WHERE answer."id" = ordered_answers."id";

ALTER TABLE "VisitorAnswer"
ALTER COLUMN "answerOrder" SET NOT NULL;

ALTER TABLE "VisitorAnswer"
ADD CONSTRAINT "VisitorAnswer_answerOrder_check"
CHECK ("answerOrder" >= 0);

DROP INDEX IF EXISTS "VisitorSubmission_pageId_readState_submittedAt_idx";

CREATE INDEX "VisitorSubmission_pageId_submittedAt_id_idx"
ON "VisitorSubmission"("pageId", "submittedAt", "id");

CREATE INDEX "VisitorSubmission_pageId_readState_submittedAt_id_idx"
ON "VisitorSubmission"("pageId", "readState", "submittedAt", "id");

CREATE INDEX "VisitorAnswer_submissionId_answerOrder_idx"
ON "VisitorAnswer"("submissionId", "answerOrder");
