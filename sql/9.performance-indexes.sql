-- Performance indexes for user-scoped filters
-- Create helpful composite indexes for fast filtering by current user and venue

-- Notes: used by notes_present=true (inner join on note and filter artist_user_id)
CREATE INDEX IF NOT EXISTS idx_note_artist_user_id_venue_id
  ON note (artist_user_id, venue_id);

-- Venue images: used by images_present=true (inner join on venue_image and filter artist_user_id)
CREATE INDEX IF NOT EXISTS idx_venue_image_artist_user_id_venue_id
  ON venue_image (artist_user_id, venue_id);

-- Optional: if you often sort by created_at on images for previews
CREATE INDEX IF NOT EXISTS idx_venue_image_artist_user_id_created_at
  ON venue_image (artist_user_id, created_at DESC);

