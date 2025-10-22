-- Clear All Database Objects
-- Drops all tables, functions, and types from the schema
-- Run this before 1.schema.sql to ensure completely clean database setup

SET search_path = public;

-- ==================== DROP TABLES ====================
-- Drop all tables in reverse dependency order (CASCADE handles remaining dependencies)

-- Auth tables (from 2.auth-schema.sql)
DROP TABLE IF EXISTS rate_limit CASCADE;
DROP TABLE IF EXISTS user_session CASCADE;
DROP TABLE IF EXISTS backup_code CASCADE;
DROP TABLE IF EXISTS oauth_account CASCADE;
DROP TABLE IF EXISTS magic_link_token CASCADE;

-- Main application tables (from 1.schema.sql)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS referral CASCADE;
DROP TABLE IF EXISTS blog_comment CASCADE;
DROP TABLE IF EXISTS blog_post CASCADE;
DROP TABLE IF EXISTS credit CASCADE;
DROP TABLE IF EXISTS subscription CASCADE;
DROP TABLE IF EXISTS report CASCADE;
DROP TABLE IF EXISTS artist_venue_match CASCADE;
DROP TABLE IF EXISTS bookmark CASCADE;
DROP TABLE IF EXISTS sticker_assignment CASCADE;
DROP TABLE IF EXISTS sticker_meaning CASCADE;
DROP TABLE IF EXISTS note CASCADE;
DROP TABLE IF EXISTS venue_claim CASCADE;
DROP TABLE IF EXISTS venue_open_call CASCADE;
DROP TABLE IF EXISTS venue CASCADE;
DROP TABLE IF EXISTS artist_media CASCADE;
DROP TABLE IF EXISTS artist_profile CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;

-- ==================== DROP FUNCTIONS ====================

DROP FUNCTION IF EXISTS cleanup_expired_auth_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.user_role() CASCADE;

-- ==================== DROP TYPES ====================
-- Drop all custom types in reverse dependency order

DROP TYPE IF EXISTS auth_provider CASCADE;
DROP TYPE IF EXISTS report_target CASCADE;
DROP TYPE IF EXISTS report_type CASCADE;
DROP TYPE IF EXISTS bookmark_target CASCADE;
DROP TYPE IF EXISTS venue_type CASCADE;
DROP TYPE IF EXISTS public_transit_access CASCADE;
DROP TYPE IF EXISTS region_code CASCADE;
DROP TYPE IF EXISTS comment_status CASCADE;
DROP TYPE IF EXISTS credit_reason CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS venue_claim_status CASCADE;
DROP TYPE IF EXISTS visibility CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ==================== RESULT ====================
DO $$
BEGIN
  RAISE NOTICE '✓ All database objects cleared successfully';
  RAISE NOTICE 'You can now run:';
  RAISE NOTICE '  1. 1.schema.sql';
  RAISE NOTICE '  2. 2.auth-schema.sql';
  RAISE NOTICE '  3. 3.policies-reset.sql';
  RAISE NOTICE '  4. 4.policies.sql';
  RAISE NOTICE '  5. 6.seed.sql (optional)';
END $$;
