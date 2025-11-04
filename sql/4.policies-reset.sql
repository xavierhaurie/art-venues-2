-- M0-AUTH-03: Drop Existing Policies and Enable RLS
-- This script safely drops existing policies and enables RLS
-- Policy definitions are in 4.policies.dev.sql
SET search_path = app, public;
SET search_path = public;
-- Drop note policies
DROP POLICY IF EXISTS note_select_own ON note;
DROP POLICY IF EXISTS note_insert_own ON note;
DROP POLICY IF EXISTS note_update_own ON note;
DROP POLICY IF EXISTS note_delete_own ON note;
DROP POLICY IF EXISTS note_admin_all ON note;
-- Drop artist_profile policies
DROP POLICY IF EXISTS artist_profile_select_own ON artist_profile;
DROP POLICY IF EXISTS artist_profile_select_by_venue ON artist_profile;
DROP POLICY IF EXISTS artist_profile_select_public ON artist_profile;
DROP POLICY IF EXISTS artist_profile_insert_own ON artist_profile;
DROP POLICY IF EXISTS artist_profile_update_own ON artist_profile;
DROP POLICY IF EXISTS artist_profile_delete_own ON artist_profile;
DROP POLICY IF EXISTS artist_profile_admin_all ON artist_profile;
-- Drop artist_media policies
DROP POLICY IF EXISTS artist_media_select_own ON artist_media;
DROP POLICY IF EXISTS artist_media_select_by_venue ON artist_media;
DROP POLICY IF EXISTS artist_media_select_public ON artist_media;
DROP POLICY IF EXISTS artist_media_insert_own ON artist_media;
DROP POLICY IF EXISTS artist_media_update_own ON artist_media;
DROP POLICY IF EXISTS artist_media_delete_own ON artist_media;
DROP POLICY IF EXISTS artist_media_admin_all ON artist_media;
-- Drop sticker_meaning policies
DROP POLICY IF EXISTS sticker_meaning_select_own ON sticker_meaning;
DROP POLICY IF EXISTS sticker_meaning_insert_own ON sticker_meaning;
DROP POLICY IF EXISTS sticker_meaning_update_own ON sticker_meaning;
DROP POLICY IF EXISTS sticker_meaning_delete_own ON sticker_meaning;
DROP POLICY IF EXISTS sticker_meaning_admin_all ON sticker_meaning;
-- Drop sticker_assignment policies
DROP POLICY IF EXISTS sticker_assignment_select_own ON sticker_assignment;
DROP POLICY IF EXISTS sticker_assignment_insert_own ON sticker_assignment;
DROP POLICY IF EXISTS sticker_assignment_delete_own ON sticker_assignment;
DROP POLICY IF EXISTS sticker_assignment_admin_all ON sticker_assignment;
-- Drop bookmark policies
DROP POLICY IF EXISTS bookmark_select_own ON bookmark;
DROP POLICY IF EXISTS bookmark_insert_own ON bookmark;
DROP POLICY IF EXISTS bookmark_delete_own ON bookmark;
DROP POLICY IF EXISTS bookmark_admin_all ON bookmark;

-- Drop storage policies (for artwork and artist-media buckets)
DROP POLICY IF EXISTS "Users can view their own artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload artwork" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own artwork" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own artwork" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for Artist Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload artist media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own artist media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own artist media" ON storage.objects;

-- ==================== ENABLE RLS ====================
ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE note ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_meaning ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark ENABLE ROW LEVEL SECURITY;

-- FORCE RLS even for superusers (required for testing)
ALTER TABLE artist_profile FORCE ROW LEVEL SECURITY;
ALTER TABLE artist_media FORCE ROW LEVEL SECURITY;
ALTER TABLE note FORCE ROW LEVEL SECURITY;
ALTER TABLE sticker_meaning FORCE ROW LEVEL SECURITY;
ALTER TABLE sticker_assignment FORCE ROW LEVEL SECURITY;
ALTER TABLE bookmark FORCE ROW LEVEL SECURITY;
-- ==================== HELPER FUNCTIONS ====================
CREATE OR REPLACE FUNCTION set_user_context(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
  PERFORM set_config('app.current_user_role', p_role, false);
END;
$$;
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.current_user_role', '', false);
END;
$$;
-- Success message
DO $$ BEGIN RAISE NOTICE 'RLS policies dropped and RLS enabled. Run 4.policies.dev.sql to create policies.'; END $$;

