-- PostgreSQL 15+ ERD for Artists ↔ Venues SaaS
-- Schema: users, profiles/media, venues/open-calls/claims, notes/stickers/bookmarks,
-- matching, reports/credits/subscriptions, blog/comments, referrals, audit log.

-- Use public schema (standard and exposed by default in Supabase)
SET search_path = public;

-- Extensions - these should be available in Supabase by default
-- If pg_trgm is not available, enable it in: Database > Extensions in Supabase Dashboard
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()

-- Try to enable pg_trgm, but don't fail if it's not available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension not available - trigram indexes will be skipped';
END $$;

-- Enums
CREATE TYPE user_role          AS ENUM ('admin','artist','venue','service');
CREATE TYPE visibility         AS ENUM ('none','venues','public');
CREATE TYPE venue_claim_status AS ENUM ('unclaimed','pending','claimed','rejected');
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled');
CREATE TYPE credit_reason      AS ENUM ('data_fix','referral');
CREATE TYPE comment_status     AS ENUM ('visible','hidden','flagged','deleted');
CREATE TYPE region_code        AS ENUM ('BOS','LA','NYC');
CREATE TYPE mbta_access        AS ENUM ('yes','partial','no');        -- BOS-specific
CREATE TYPE bookmark_target    AS ENUM ('venue','artist','blog_post');
CREATE TYPE report_type        AS ENUM ('missing','incorrect');
CREATE TYPE report_target      AS ENUM ('venue','open_call','artist_profile','blog_post','comment');

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END $$;

-- USERS
CREATE TABLE app_user (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE CHECK (email = lower(email)),
  name            text,
  role            user_role NOT NULL DEFAULT 'artist',
  twofa_enabled   boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_user_updated BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ARTIST PROFILE
CREATE TABLE artist_profile (
  user_id     uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  statement   text,
  goals       text,
  visibility  visibility NOT NULL DEFAULT 'none',
  site_url    text,
  region_home region_code,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_artist_profile_updated BEFORE UPDATE ON artist_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ARTIST MEDIA (≤100 images + 1×5-min video per business rules; enforce in app)
CREATE TABLE artist_media (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('image','video')),
  url            text NOT NULL,
  alt_text       text,
  meta           jsonb NOT NULL DEFAULT '{}',     -- duration, sizes, etc.
  moderation     jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artist_media_user ON artist_media(artist_user_id);
CREATE INDEX idx_artist_media_meta ON artist_media USING GIN (meta);
CREATE TRIGGER trg_artist_media_updated BEFORE UPDATE ON artist_media
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- VENUES
CREATE TABLE venue (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code        region_code NOT NULL,
  name               text NOT NULL,
  type               text NOT NULL,
  locality           text NOT NULL,
  lat                double precision,
  lng                double precision,
  mbta               mbta_access,                         -- only for BOS
  distance_km        numeric(8,3),
  commission_pct     numeric(5,2),
  fees               text,
  insurance_req      boolean,
  mediums            text[] NOT NULL DEFAULT '{}',
  website_url        text,
  social             jsonb NOT NULL DEFAULT '{}',
  blurb              text,
  claimed_by_user_id uuid REFERENCES app_user(id),
  claim_status       venue_claim_status NOT NULL DEFAULT 'unclaimed',
  created_at         timestamptz NOT NULL DEFAULT NOW(),
  updated_at         timestamptz NOT NULL DEFAULT NOW(),
  -- Generated full-text search vector (name + blurb)
  search             tsvector GENERATED ALWAYS AS (
                      to_tsvector('english', coalesce(name,'') || ' ' || coalesce(blurb,''))) STORED
);
CREATE INDEX idx_venue_region      ON venue(region_code);
CREATE INDEX idx_venue_locality    ON venue(locality);
CREATE INDEX idx_venue_claim       ON venue(claim_status);
CREATE INDEX idx_venue_claimed_by  ON venue(claimed_by_user_id);
CREATE INDEX idx_venue_mediums     ON venue USING GIN (mediums);
CREATE INDEX idx_venue_search_fts  ON venue USING GIN (search);
-- Trigram index for fuzzy text search (only if pg_trgm extension is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX idx_venue_trgm ON venue USING GIN ((coalesce(name,'''') || '' '' || coalesce(blurb,'''')) gin_trgm_ops)';
    RAISE NOTICE '✓ Created trigram index on venue table';
  ELSE
    RAISE NOTICE '⚠ Skipping trigram index on venue (pg_trgm not available)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Could not create trigram index on venue: %', SQLERRM;
END $$;
CREATE TRIGGER trg_venue_updated BEFORE UPDATE ON venue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- OPEN CALLS
CREATE TABLE venue_open_call (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
  title      text NOT NULL,
  summary    text,
  url        text,
  deadline   date,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_open_call_venue    ON venue_open_call(venue_id);
CREATE INDEX idx_open_call_deadline ON venue_open_call(deadline);
CREATE TRIGGER trg_open_call_updated BEFORE UPDATE ON venue_open_call
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- VENUE CLAIMS
CREATE TABLE venue_claim (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      uuid NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  method        text NOT NULL CHECK (method IN ('domain','admin')),
  requested_at  timestamptz NOT NULL DEFAULT NOW(),
  approved_at   timestamptz
);
CREATE INDEX idx_venue_claim_venue ON venue_claim(venue_id);

-- NOTES (attachments total ≤10MB per note; enforced via total_bytes field)
CREATE TABLE note (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id           uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  venue_id                 uuid NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
  body                     text NOT NULL,
  attachments_meta         jsonb NOT NULL DEFAULT '{}',
  attachments_total_bytes  integer NOT NULL DEFAULT 0 CHECK (attachments_total_bytes <= 10485760),
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW(),
  search                   tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(body,''))) STORED
);
CREATE INDEX idx_note_artist_venue ON note(artist_user_id, venue_id);
CREATE INDEX idx_note_search_fts   ON note USING GIN (search);
-- Trigram index for fuzzy text search (only if pg_trgm extension is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX idx_note_trgm ON note USING GIN (body gin_trgm_ops)';
    RAISE NOTICE '✓ Created trigram index on note table';
  ELSE
    RAISE NOTICE '⚠ Skipping trigram index on note (pg_trgm not available)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Could not create trigram index on note: %', SQLERRM;
END $$;
CREATE TRIGGER trg_note_updated BEFORE UPDATE ON note
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- STICKERS (meanings per-artist; assignments per venue)
CREATE TABLE sticker_meaning (
  artist_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  color          text NOT NULL,         -- 10 colors; app validates set
  label          text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (artist_user_id, color)
);

CREATE TABLE sticker_assignment (
  artist_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  venue_id       uuid NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
  color          text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (artist_user_id, venue_id, color),
  FOREIGN KEY (artist_user_id, color)
    REFERENCES sticker_meaning(artist_user_id, color) ON DELETE CASCADE
);
CREATE INDEX idx_sticker_assign_venue ON sticker_assignment(venue_id);

-- BOOKMARKS
CREATE TABLE bookmark (
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  target_type bookmark_target NOT NULL,
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_id)
);
CREATE INDEX idx_bookmark_target ON bookmark(target_type, target_id);

-- MATCHING
CREATE TABLE artist_venue_match (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  venue_id          uuid NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
  score             numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  explanation       text,
  last_match_tried  timestamptz NOT NULL,
  surfaced_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (artist_user_id, venue_id, last_match_tried)
);
CREATE INDEX idx_match_artist ON artist_venue_match(artist_user_id);
CREATE INDEX idx_match_venue  ON artist_venue_match(venue_id);
CREATE INDEX idx_match_recent ON artist_venue_match(last_match_tried DESC);

-- REPORTS (for data fixes / abuse)
CREATE TABLE report (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  type        report_type NOT NULL,
  target_type report_target NOT NULL,
  target_id   uuid NOT NULL,
  details     text,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected')),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_report_target ON report(target_type, target_id);
CREATE TRIGGER trg_report_updated BEFORE UPDATE ON report
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- SUBSCRIPTIONS
CREATE TABLE subscription (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  plan                  text NOT NULL,
  status                subscription_status NOT NULL DEFAULT 'trialing',
  current_period_end    timestamptz,
  stripe_customer_id    text,
  stripe_subscription_id text,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);
-- one active/trialing subscription per user
CREATE UNIQUE INDEX uniq_active_sub_per_user ON subscription(user_id)
  WHERE status IN ('active','trialing');
CREATE INDEX idx_subscription_user ON subscription(user_id);
CREATE TRIGGER trg_subscription_updated BEFORE UPDATE ON subscription
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CREDITS (data-fix / referral)
CREATE TABLE credit (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  months                  smallint NOT NULL CHECK (months BETWEEN 1 AND 12),
  reason                  credit_reason NOT NULL,
  cap_policy              text,               -- e.g., 'data_fix_cap_3'
  applied_subscription_id uuid REFERENCES subscription(id),
  created_at              timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_credit_user ON credit(user_id);

-- BLOG + COMMENTS (subs can comment; participant profiles view gated in app)
CREATE TABLE blog_post (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  body        text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  author_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_blog_post_published ON blog_post(published_at);
CREATE INDEX idx_blog_post_tags      ON blog_post USING GIN (tags);
CREATE TRIGGER trg_blog_post_updated BEFORE UPDATE ON blog_post
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE blog_comment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  body        text NOT NULL,
  status      comment_status NOT NULL DEFAULT 'visible',
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comment_post ON blog_comment(post_id, created_at);
CREATE TRIGGER trg_blog_comment_updated BEFORE UPDATE ON blog_comment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- REFERRALS (artist → artist)
CREATE TABLE referral (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  code             text NOT NULL UNIQUE,
  invitee_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','converted','rejected')),
  credited_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_referral_referrer ON referral(referrer_user_id);
CREATE INDEX idx_referral_status   ON referral(status);

-- AUDIT LOG
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_type  text NOT NULL,
  target_id    uuid,
  meta         jsonb NOT NULL DEFAULT '{}',
  ip           inet,
  user_agent   text,
  at           timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_actor  ON audit_log(actor_user_id, at DESC);
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_meta   ON audit_log USING GIN (meta);
