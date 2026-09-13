-- Preserve existing captions while applying the shorter limit to new and
-- updated rows. Application schemas keep those legacy values readable while
-- the owner editor lets creators shorten them.
ALTER TABLE "PageImage"
  DROP CONSTRAINT "PageImage_caption_check";

ALTER TABLE "PageImage"
  ADD CONSTRAINT "PageImage_caption_check"
  CHECK ("caption" IS NULL OR char_length("caption") <= 150)
  NOT VALID;
