-- Migration: Add unique constraint on (artist_user_id, color) to sticker_meaning table
-- This prevents duplicate sticker meanings with the same color for the same user
-- Run this in your Supabase SQL editor

-- Check for existing duplicates before adding constraint
SELECT artist_user_id, color, COUNT(*) as count
FROM sticker_meaning
GROUP BY artist_user_id, color
HAVING COUNT(*) > 1;

-- If duplicates exist, clean them up (keeps the oldest record)
-- Uncomment the lines below if you need to clean up duplicates:
-- DELETE FROM sticker_meaning sm1
-- WHERE EXISTS (
--   SELECT 1 FROM sticker_meaning sm2
--   WHERE sm2.artist_user_id = sm1.artist_user_id
--     AND sm2.color = sm1.color
--     AND sm2.created_at < sm1.created_at
-- );

-- Add the unique constraint
ALTER TABLE sticker_meaning
ADD CONSTRAINT sticker_meaning_artist_color_unique
UNIQUE (artist_user_id, color);

-- Verify the constraint was added
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sticker_meaning'::regclass
  AND conname = 'sticker_meaning_artist_color_unique';

-- Success message
SELECT '✅ Unique constraint added successfully!' as message;

