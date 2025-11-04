-- Migration: Add unique constraint on (artist_user_id, color) to sticker_meaning table
-- This prevents duplicate sticker meanings with the same color for the same user
-- Run this in your Supabase SQL editor

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




-- M0-VEN-04: Seed import (250 BOS venues)
-- AC: One-shot 6.seed.sql + CSV importer; idempotent; 0 invalid rows;
-- sample screenshots of 10 random records.

-- This file is idempotent - can be run multiple times safely
-- Venues are inserted with ON CONFLICT DO UPDATE to handle re-runs

-- Function to create default stickers for a user
CREATE OR REPLACE FUNCTION create_default_stickers_for_user(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert 5 default sticker meanings for the user
  INSERT INTO sticker_meaning (artist_user_id, color, label, details) VALUES
    (user_id, '#ADD8E6', 'Interested', 'Need to dig deeper into this venue'),
    (user_id, '#FFB366', 'Contacted', ''),
    (user_id, '#FFFF99', 'Submitted Work', 'See the images of the artworks I submitted and the notes'),
    (user_id, '#FFB3B3', 'Has My Artwork', 'See the images of the artworks currently at this venue'),
    (user_id, '#D3D3D3', 'Sold', 'Details of the artwork sold are in the notes')
  ON CONFLICT (artist_user_id, color) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Sample venue data (template - will be replaced with actual 250 venues)
-- This demonstrates the structure for bulk import

-- INSERT INTO venue (
--   name,
--   type,
--   website_url,
--   region_code,
--   locality,
--   address,
--   public_transit,
--   artist_summary,
--   visitor_summary,
--   normalized_url
-- ) VALUES
-- -- Example venues (to be replaced with actual data)
-- (
--   'Sample Gallery',
--   'gallery - commercial',
--   'https://example.com',
--   'BOS',
--   'South End',
--   '123 Main St, Boston, MA 02118',
--   'yes',
--   'Contemporary art gallery focusing on emerging artists. Accepts portfolio submissions year-round.',
--   'Visit us for rotating exhibitions of contemporary art from local and international artists.',
--   'example.com'
-- )
-- ON CONFLICT (normalized_url)
-- DO UPDATE SET
--   name = EXCLUDED.name,
--   type = EXCLUDED.type,
--   locality = EXCLUDED.locality,
--   address = EXCLUDED.address,
--   public_transit = EXCLUDED.public_transit,
--   artist_summary = EXCLUDED.artist_summary,
--   visitor_summary = EXCLUDED.visitor_summary,
--   website_url = EXCLUDED.website_url,
--   updated_at = NOW();
--
-- -- TODO: Import actual 250 BOS venues from CSV
-- -- The CSV should have columns:
-- -- name, type, locality, address, public_transit, website_url, artist_summary, visitor_summary, facebook, instagram
--
-- COMMIT;
--
-- -- Verify import
-- SELECT
--   region_code,
--   COUNT(*) as venue_count,
--   COUNT(DISTINCT locality) as locality_count,
--   COUNT(DISTINCT type) as type_count
-- FROM venue
-- WHERE region_code = 'BOS'
-- GROUP BY region_code;
--
-- -- Sample 10 random venues for verification
-- SELECT
--   id,
--   name,
--   type,
--   locality,
--   public_transit,
--   normalized_url
-- FROM venue
-- WHERE region_code = 'BOS'
-- ORDER BY RANDOM()
-- LIMIT 10;
