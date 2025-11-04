-- Development user seed script
-- This adds a test user for development/testing purposes
-- Run this in your Supabase SQL editor or via psql

-- Insert development user
INSERT INTO app_user (
  id,
  email,
  name,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  'dev@example.com',
  'Development User',
  'artist',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Optionally create an artist profile for the dev user
INSERT INTO artist_profile (
  user_id,
  statement,
  goals,
  visibility,
  region_home,
  created_at,
  updated_at
) VALUES (
  '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  'Test artist for development',
  'Testing the application',
  'none',
  'BOS',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Create default stickers for the dev user
SELECT create_default_stickers_for_user('3fa85f64-5717-4562-b3fc-2c963f66afa6');
--
-- -- Success message
SELECT 'Development user created successfully!' as message;

