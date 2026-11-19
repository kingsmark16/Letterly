CREATE FUNCTION letterly_linked_verification_user(identifier_text TEXT, value_text TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  payload JSONB;
BEGIN
  IF identifier_text LIKE 'reset-password:%' THEN
    RETURN value_text;
  END IF;
  IF identifier_text !~ '^[A-Za-z0-9]{32}$' OR left(value_text, 1) <> '{' THEN
    RETURN NULL;
  END IF;
  payload := value_text::jsonb;
  IF payload->>'oauthState' = identifier_text
    AND jsonb_typeof(payload->'link'->'userId') = 'string'
    AND jsonb_typeof(payload->'codeVerifier') = 'string'
  THEN
    RETURN payload->'link'->>'userId';
  END IF;
  RETURN NULL;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE FUNCTION letterly_reject_auth_write_during_creator_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  owner_id TEXT;
  requested_at TIMESTAMP;
BEGIN
  IF TG_TABLE_NAME = 'verification' THEN
    owner_id := letterly_linked_verification_user(NEW."identifier", NEW."value");
  ELSE
    owner_id := NEW."userId";
  END IF;
  IF owner_id IS NULL THEN RETURN NEW; END IF;
  -- An UPDATE already owns its auth row. Do not wait behind deletion,
  -- which owns the User and may be waiting to remove that auth row.
  SELECT "deletionRequestedAt" INTO requested_at FROM "user"
  WHERE "id" = owner_id FOR SHARE NOWAIT;
  IF requested_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Authentication account unavailable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER letterly_session_creator_deletion_barrier
  BEFORE INSERT OR UPDATE ON "session"
  FOR EACH ROW EXECUTE FUNCTION letterly_reject_auth_write_during_creator_deletion();
CREATE TRIGGER letterly_account_creator_deletion_barrier
  BEFORE INSERT OR UPDATE ON "account"
  FOR EACH ROW EXECUTE FUNCTION letterly_reject_auth_write_during_creator_deletion();
CREATE TRIGGER letterly_verification_creator_deletion_barrier
  BEFORE INSERT OR UPDATE ON "verification"
  FOR EACH ROW EXECUTE FUNCTION letterly_reject_auth_write_during_creator_deletion();
