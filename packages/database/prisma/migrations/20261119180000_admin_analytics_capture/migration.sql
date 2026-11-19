CREATE TABLE "DailyAdminMetrics" (
  "day" DATE PRIMARY KEY,
  "creatorSignups" BIGINT NOT NULL DEFAULT 0,
  "pagesCreated" BIGINT NOT NULL DEFAULT 0,
  "publishActions" BIGINT NOT NULL DEFAULT 0,
  "pageViews" BIGINT NOT NULL DEFAULT 0,
  "dailyPageVisits" BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "DailyAdminMetrics_nonnegative" CHECK (
    "creatorSignups" >= 0 AND "pagesCreated" >= 0 AND "publishActions" >= 0
    AND "pageViews" >= 0 AND "dailyPageVisits" >= 0
  )
);

CREATE TABLE "AnalyticsCoverage" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'platform'),
  "startedAt" TIMESTAMPTZ(6) NOT NULL
);

CREATE FUNCTION letterly_capture_admin_analytics()
RETURNS TRIGGER LANGUAGE plpgsql VOLATILE
SET search_path FROM CURRENT AS $$
DECLARE
  event_at TIMESTAMPTZ := clock_timestamp();
  coverage_at TIMESTAMPTZ;
  event_day DATE := (event_at AT TIME ZONE 'UTC')::date;
  signups BIGINT := 0;
  created BIGINT := 0;
  published BIGINT := 0;
  views BIGINT := 0;
  visits BIGINT := 0;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = 'PZ701', MESSAGE = 'Analytics source write requires READ COMMITTED';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN NULL; END IF;
  SELECT "startedAt" INTO coverage_at FROM "AnalyticsCoverage" WHERE "id" = 'platform';
  IF coverage_at IS NULL OR event_at < coverage_at THEN RETURN NULL; END IF;

  IF TG_TABLE_NAME = 'user' AND TG_OP = 'INSERT' THEN
    IF NEW."role" = 'CREATOR' THEN signups := 1; END IF;
  ELSIF TG_TABLE_NAME = 'Page' THEN
    IF TG_OP = 'INSERT' THEN
      created := 1;
    ELSIF NEW."status" = 'PUBLISHED' AND OLD."status" <> 'PUBLISHED' THEN
      published := 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'PageVisit' THEN
    IF TG_OP = 'INSERT' THEN
      views := NEW."viewCount";
      visits := 1;
    ELSE
      views := GREATEST(0, NEW."viewCount"::bigint - OLD."viewCount"::bigint);
    END IF;
    IF (views > 0 OR visits > 0) AND NEW."visitedOn" <> event_day THEN
      RAISE EXCEPTION USING ERRCODE = 'PZ702', MESSAGE = 'Analytics visit date must be current UTC day';
    END IF;
    event_day := NEW."visitedOn";
  END IF;

  IF signups = 0 AND created = 0 AND published = 0 AND views = 0 AND visits = 0 THEN
    RETURN NULL;
  END IF;
  INSERT INTO "DailyAdminMetrics" ("day","creatorSignups","pagesCreated","publishActions","pageViews","dailyPageVisits")
  VALUES (event_day,signups,created,published,views,visits)
  ON CONFLICT ("day") DO UPDATE SET
    "creatorSignups" = "DailyAdminMetrics"."creatorSignups" + EXCLUDED."creatorSignups",
    "pagesCreated" = "DailyAdminMetrics"."pagesCreated" + EXCLUDED."pagesCreated",
    "publishActions" = "DailyAdminMetrics"."publishActions" + EXCLUDED."publishActions",
    "pageViews" = "DailyAdminMetrics"."pageViews" + EXCLUDED."pageViews",
    "dailyPageVisits" = "DailyAdminMetrics"."dailyPageVisits" + EXCLUDED."dailyPageVisits";
  RETURN NULL;
END;
$$;

CREATE TRIGGER letterly_analytics_user AFTER INSERT OR UPDATE OR DELETE ON "user"
FOR EACH ROW EXECUTE FUNCTION letterly_capture_admin_analytics();
CREATE TRIGGER letterly_analytics_page AFTER INSERT OR UPDATE OR DELETE ON "Page"
FOR EACH ROW EXECUTE FUNCTION letterly_capture_admin_analytics();
CREATE TRIGGER letterly_analytics_visit AFTER INSERT OR UPDATE OR DELETE ON "PageVisit"
FOR EACH ROW EXECUTE FUNCTION letterly_capture_admin_analytics();
