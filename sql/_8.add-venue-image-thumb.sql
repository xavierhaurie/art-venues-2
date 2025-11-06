-- Add thumbnail path column for venue images
ALTER TABLE public.venue_image
  ADD COLUMN IF NOT EXISTS file_path_thumb text;

-- Optional: future backfill could generate thumbnails and populate file_path_thumb
-- This script only adds the column; app will handle nulls by falling back to full-size path for thumbs.

