-- M0-VEN-04: Seed import (250 BOS venues)
-- AC: One-shot 6.seed.sql + CSV importer; idempotent; 0 invalid rows;
-- sample screenshots of 10 random records.

-- This file is idempotent - can be run multiple times safely
-- Venues are inserted with ON CONFLICT DO UPDATE to handle re-runs

BEGIN;

-- Helper function to generate normalized URLs from venue names
CREATE OR REPLACE FUNCTION generate_normalized_url(url text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(url, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Sample venue data (template - will be replaced with actual 250 venues)
-- This demonstrates the structure for bulk import

INSERT INTO venue (
  name,
  type,
  website_url,
  region_code,
  locality,
  address,
  public_transit,
  artist_summary,
  visitor_summary,
  normalized_url
) VALUES
-- Example venues (to be replaced with actual data)
(
  'Sample Gallery',
  'gallery - commercial',
  'https://example.com',
  'BOS',
  'South End',
  '123 Main St, Boston, MA 02118',
  'yes',
  'Contemporary art gallery focusing on emerging artists. Accepts portfolio submissions year-round.',
  'Visit us for rotating exhibitions of contemporary art from local and international artists.',
  generate_normalized_url('https://example.com')
)
ON CONFLICT (normalized_url)
DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  locality = EXCLUDED.locality,
  address = EXCLUDED.address,
  public_transit = EXCLUDED.public_transit,
  artist_summary = EXCLUDED.artist_summary,
  visitor_summary = EXCLUDED.visitor_summary,
  website_url = EXCLUDED.website_url,
  updated_at = NOW();

-- TODO: Import actual 250 BOS venues from CSV
-- The CSV should have columns:
-- name, type, locality, address, public_transit, website_url, artist_summary, visitor_summary, facebook, instagram

COMMIT;

-- Verify import
SELECT
  region_code,
  COUNT(*) as venue_count,
  COUNT(DISTINCT locality) as locality_count,
  COUNT(DISTINCT type) as type_count
FROM venue
WHERE region_code = 'BOS'
GROUP BY region_code;

-- Sample 10 random venues for verification
SELECT
  id,
  name,
  type,
  locality,
  public_transit,
  normalized_url
FROM venue
WHERE region_code = 'BOS'
ORDER BY RANDOM()
LIMIT 10;
