DELETE FROM clinic.sessions;

ALTER TABLE clinic.sessions DROP COLUMN IF EXISTS session_token;
ALTER TABLE clinic.sessions ADD COLUMN IF NOT EXISTS session_token_hash TEXT;

UPDATE clinic.sessions
SET session_token_hash = encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
WHERE session_token_hash IS NULL;

ALTER TABLE clinic.sessions ALTER COLUMN session_token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_sessions_token_hash
  ON clinic.sessions (session_token_hash);
