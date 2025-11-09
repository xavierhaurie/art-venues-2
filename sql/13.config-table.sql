-- 13.config-table.sql
-- Create config table and seed image-related config values
CREATE TABLE IF NOT EXISTS config (
  name text PRIMARY KEY,
  value text NOT NULL
);

-- Seed / upsert values
INSERT INTO config (name, value) VALUES
  ('max_image_weight', '200000'),           -- bytes
  ('target_image_size', '800'),             -- longest side px
  ('thumbnail_image_size', '200'),          -- longest side px
  ('max_image_count', '100'),               -- max images per venue per user
  ('signed_url_ttl_seconds', '300')         -- 5 minutes
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

