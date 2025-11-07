-- Migration: add owner_user_id to venue and user_credit_event table + function for conversion
ALTER TABLE venue ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES app_user(id);
CREATE INDEX IF NOT EXISTS idx_venue_owner ON venue(owner_user_id);

-- De-duplicate existing venue names case-insensitively before creating a unique index
WITH d AS (
  SELECT v.id,
         v.name,
         v.locality,
         lower(v.name) AS lname,
         row_number() OVER (PARTITION BY lower(v.name) ORDER BY v.created_at, v.id) AS rn,
         count(*) OVER (PARTITION BY lower(v.name)) AS cnt
  FROM venue v
)
UPDATE venue v
SET name = CASE
  WHEN d.cnt > 1 AND d.rn > 1 THEN
    v.name || ' (' || COALESCE(NULLIF(trim(v.locality), ''), 'dup') || '-' || d.rn || ')'
  ELSE v.name
END
FROM d
WHERE v.id = d.id
  AND d.cnt > 1
  AND d.rn > 1;

-- Enforce unique venue name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_venue_name_ci ON venue((lower(name)));

-- Credits events table
CREATE TABLE IF NOT EXISTS user_credit_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_credit_event_user ON user_credit_event(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_event_venue ON user_credit_event(venue_id);

-- Function: make public + award credits atomically
CREATE OR REPLACE FUNCTION make_public_and_award_credits(p_venue uuid, p_credits integer, p_admin uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_owner uuid;
BEGIN
  IF p_credits IS NULL OR p_credits < 1 THEN
    RAISE EXCEPTION 'credits must be >= 1';
  END IF;
  SELECT owner_user_id INTO v_owner FROM venue WHERE id = p_venue FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'venue not found';
  END IF;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'venue already public';
  END IF;
  -- Make venue public
  UPDATE venue SET owner_user_id = NULL, updated_at = NOW() WHERE id = p_venue;
  -- Award credits to previous owner
  INSERT INTO user_credit_event(user_id, venue_id, credits, reason) VALUES (v_owner, p_venue, p_credits, 'made public');
END; $$;
