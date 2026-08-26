-- Distinguish an explicit journey finish from the existing automatic order.
ALTER TABLE "PageQuestion"
ADD COLUMN "endsJourney" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PageChoice"
ADD COLUMN "endsJourney" BOOLEAN NOT NULL DEFAULT false;
