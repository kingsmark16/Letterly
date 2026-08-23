-- Journey revisions and their root question form a required reference cycle.
-- Deferring these foreign keys lets one transaction insert a complete
-- immutable revision before the pointers are finalized.
ALTER TABLE "PageJourney"
  DROP CONSTRAINT "PageJourney_draftRevisionId_fkey",
  DROP CONSTRAINT "PageJourney_publishedRevisionId_fkey";

ALTER TABLE "PageJourneyGraphRevision"
  DROP CONSTRAINT "PageJourneyGraphRevision_journeyId_fkey",
  DROP CONSTRAINT "PageJourneyGraphRevision_rootQuestionId_fkey";

ALTER TABLE "PageJourneyQuestion"
  DROP CONSTRAINT "PageJourneyQuestion_revisionId_fkey";

ALTER TABLE "PageJourneyChoice"
  DROP CONSTRAINT "PageJourneyChoice_questionId_fkey",
  DROP CONSTRAINT "PageJourneyChoice_nextQuestionId_fkey",
  DROP CONSTRAINT "PageJourneyChoice_outcomeId_fkey";

ALTER TABLE "PageJourneyOutcome"
  DROP CONSTRAINT "PageJourneyOutcome_revisionId_fkey";

ALTER TABLE "PageJourney"
  ADD CONSTRAINT "PageJourney_draftRevisionId_fkey"
    FOREIGN KEY ("draftRevisionId") REFERENCES "PageJourneyGraphRevision"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "PageJourney_publishedRevisionId_fkey"
    FOREIGN KEY ("publishedRevisionId") REFERENCES "PageJourneyGraphRevision"("id")
    ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "PageJourneyGraphRevision"
  ADD CONSTRAINT "PageJourneyGraphRevision_journeyId_fkey"
    FOREIGN KEY ("journeyId") REFERENCES "PageJourney"("id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "PageJourneyGraphRevision_rootQuestionId_fkey"
    FOREIGN KEY ("rootQuestionId") REFERENCES "PageJourneyQuestion"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "PageJourneyQuestion"
  ADD CONSTRAINT "PageJourneyQuestion_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "PageJourneyGraphRevision"("id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "PageJourneyChoice"
  ADD CONSTRAINT "PageJourneyChoice_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "PageJourneyQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "PageJourneyChoice_nextQuestionId_fkey"
    FOREIGN KEY ("nextQuestionId") REFERENCES "PageJourneyQuestion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "PageJourneyChoice_outcomeId_fkey"
    FOREIGN KEY ("outcomeId") REFERENCES "PageJourneyOutcome"("id")
    ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "PageJourneyOutcome"
  ADD CONSTRAINT "PageJourneyOutcome_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "PageJourneyGraphRevision"("id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
