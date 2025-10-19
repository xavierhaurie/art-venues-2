-- Diagnostic script to verify RLS is properly configured
SET search_path = app, public;

-- Check if RLS is enabled on the note table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'note' AND schemaname = 'app';

-- Check what policies exist on the note table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'note' AND schemaname = 'app'
ORDER BY policyname;

-- Test if current_setting is working
DO $$
BEGIN
  RAISE NOTICE 'Testing current_setting function...';
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', false);
  PERFORM set_config('app.current_user_role', 'artist', false);

  RAISE NOTICE 'app.current_user_id = %', current_setting('app.current_user_id', true);
  RAISE NOTICE 'app.current_user_role = %', current_setting('app.current_user_role', true);

  -- Clear settings
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.current_user_role', '', false);
END $$;

-- Check current role and if it bypasses RLS
SELECT
  current_user as current_role,
  usesuper as is_superuser
FROM pg_user
WHERE usename = current_user;

-- Test if we need to force RLS
DO $$
DECLARE
  current_role_super boolean;
BEGIN
  SELECT usesuper INTO current_role_super FROM pg_user WHERE usename = current_user;

  IF current_role_super THEN
    RAISE NOTICE '⚠️  WARNING: Running as superuser - RLS may be bypassed!';
    RAISE NOTICE 'You may need to run: ALTER TABLE note FORCE ROW LEVEL SECURITY;';
  ELSE
    RAISE NOTICE '✓ Running as non-superuser - RLS will be enforced';
  END IF;
END $$;
