ALTER TABLE "PageQuestion"
ADD CONSTRAINT "PageQuestion_displayOrder_check"
CHECK ("displayOrder" >= 0);

ALTER TABLE "PageChoice"
ADD CONSTRAINT "PageChoice_displayOrder_check"
CHECK ("displayOrder" >= 0);

ALTER TABLE "VisitorAnswer"
ADD CONSTRAINT "VisitorAnswer_one_answer_form_check"
CHECK (
  ("choiceId" IS NOT NULL AND "textAnswer" IS NULL)
  OR ("choiceId" IS NULL AND "textAnswer" IS NOT NULL AND char_length(btrim("textAnswer")) > 0)
);

ALTER TABLE "VisitorMessage"
ADD CONSTRAINT "VisitorMessage_message_length_check"
CHECK (char_length(btrim("message")) BETWEEN 1 AND 2000);

ALTER TABLE "PageReport"
ADD CONSTRAINT "PageReport_message_length_check"
CHECK ("message" IS NULL OR char_length("message") <= 1000);
