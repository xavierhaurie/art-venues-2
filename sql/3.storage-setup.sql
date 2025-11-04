-- Setup Supabase Storage buckets for the application
-- Run this in your Supabase SQL editor after creating the schema
-- Note: This only creates buckets. Policies are created in 5.policies.sql

-- ==================== CREATE STORAGE BUCKETS ====================

-- Create artwork bucket (for venue images uploaded by artists)
-- NOTE: This is a PRIVATE bucket - images only viewable by the owner
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork', 'artwork', false)
ON CONFLICT (id) DO NOTHING;

-- Create artist-media bucket (for artist profile media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-media', 'artist-media', true)
ON CONFLICT (id) DO NOTHING;

-- ==================== VERIFICATION ====================

-- Verify buckets were created
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id IN ('artwork', 'artist-media');

-- Success message
SELECT '✅ Storage buckets created successfully! Run 5.policies.sql next to set up access policies.' as message;

