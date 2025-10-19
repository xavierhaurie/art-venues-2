-- M0-AUTH-03: Row-Level Security (RLS) Policies
-- Uses Supabase JWT authentication for production security
-- Works in both development and production environments

SET search_path = public;

-- Enable RLS on all user-data tables
ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE note ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_meaning ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark ENABLE ROW LEVEL SECURITY;

-- FORCE RLS even for superusers (critical for security)
ALTER TABLE artist_profile FORCE ROW LEVEL SECURITY;
ALTER TABLE artist_media FORCE ROW LEVEL SECURITY;
ALTER TABLE note FORCE ROW LEVEL SECURITY;
ALTER TABLE sticker_meaning FORCE ROW LEVEL SECURITY;
ALTER TABLE sticker_assignment FORCE ROW LEVEL SECURITY;
ALTER TABLE bookmark FORCE ROW LEVEL SECURITY;

-- ==================== HELPER FUNCTION ====================
-- Extract role from JWT claims (stored in app_user table)
-- Note: Uses public schema to match our table location
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.app_user WHERE id = auth.uid();
$$;

-- ==================== NOTES POLICIES ====================

-- Artists can read their own notes OR admins can read all
CREATE POLICY note_select_own ON note FOR SELECT
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can insert their own notes OR admins can insert any
CREATE POLICY note_insert_own ON note FOR INSERT
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can update their own notes OR admins can update any
CREATE POLICY note_update_own ON note FOR UPDATE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin')
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can delete their own notes OR admins can delete any
CREATE POLICY note_delete_own ON note FOR DELETE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- ==================== ARTIST PROFILE POLICIES ====================

-- Artists can read their own profile, venues can read 'venues' visibility, public can read 'public'
CREATE POLICY artist_profile_select_own ON artist_profile FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.user_role() = 'admin' OR
    (public.user_role() = 'venue' AND visibility IN ('venues', 'public')) OR
    visibility = 'public'
  );

-- Artists can create their own profile
CREATE POLICY artist_profile_insert_own ON artist_profile FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can update their own profile
CREATE POLICY artist_profile_update_own ON artist_profile FOR UPDATE
  USING (user_id = auth.uid() OR public.user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can delete their own profile
CREATE POLICY artist_profile_delete_own ON artist_profile FOR DELETE
  USING (user_id = auth.uid() OR public.user_role() = 'admin');

-- ==================== ARTIST MEDIA POLICIES ====================

-- Same visibility rules as profile
CREATE POLICY artist_media_select_own ON artist_media FOR SELECT
  USING (
    artist_user_id = auth.uid() OR
    public.user_role() = 'admin' OR
    EXISTS (
      SELECT 1 FROM artist_profile
      WHERE user_id = artist_media.artist_user_id
      AND (
        (public.user_role() = 'venue' AND visibility IN ('venues', 'public')) OR
        visibility = 'public'
      )
    )
  );

-- Artists can upload their own media
CREATE POLICY artist_media_insert_own ON artist_media FOR INSERT
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can update their own media
CREATE POLICY artist_media_update_own ON artist_media FOR UPDATE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin')
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can delete their own media
CREATE POLICY artist_media_delete_own ON artist_media FOR DELETE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- ==================== STICKER MEANING POLICIES ====================

-- Artists can read their own sticker meanings
CREATE POLICY sticker_meaning_select_own ON sticker_meaning FOR SELECT
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can create their own sticker meanings
CREATE POLICY sticker_meaning_insert_own ON sticker_meaning FOR INSERT
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can update their own sticker meanings
CREATE POLICY sticker_meaning_update_own ON sticker_meaning FOR UPDATE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin')
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can delete their own sticker meanings
CREATE POLICY sticker_meaning_delete_own ON sticker_meaning FOR DELETE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- ==================== STICKER ASSIGNMENT POLICIES ====================

-- Artists can read their own sticker assignments
CREATE POLICY sticker_assignment_select_own ON sticker_assignment FOR SELECT
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can create their own sticker assignments
CREATE POLICY sticker_assignment_insert_own ON sticker_assignment FOR INSERT
  WITH CHECK (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- Artists can delete their own sticker assignments
CREATE POLICY sticker_assignment_delete_own ON sticker_assignment FOR DELETE
  USING (artist_user_id = auth.uid() OR public.user_role() = 'admin');

-- ==================== BOOKMARK POLICIES ====================

-- Users can read their own bookmarks
CREATE POLICY bookmark_select_own ON bookmark FOR SELECT
  USING (user_id = auth.uid() OR public.user_role() = 'admin');

-- Users can create their own bookmarks
CREATE POLICY bookmark_insert_own ON bookmark FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.user_role() = 'admin');

-- Users can delete their own bookmarks
CREATE POLICY bookmark_delete_own ON bookmark FOR DELETE
  USING (user_id = auth.uid() OR public.user_role() = 'admin');

-- ==================== VALIDATION ====================
DO $$
DECLARE
  func_exists boolean;
BEGIN
  -- Check if user_role function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'user_role'
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '✓ public.user_role() function found - policies will work correctly';
  ELSE
    RAISE EXCEPTION '✗ public.user_role() function NOT FOUND - policies will fail';
  END IF;

  RAISE NOTICE '✓ RLS policies created successfully';
END $$;
