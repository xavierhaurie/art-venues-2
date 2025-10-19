-- Tiny seed for local/dev. Run with service role or after temporarily disabling RLS.
SET search_path = public;

-- Insert seed data step by step (CTEs can only be used once)
WITH new_artist AS (
  INSERT INTO app_user (id, email, name, role, twofa_enabled)
  VALUES (gen_random_uuid(), 'artist@example.com', 'Sample Artist', 'artist', true)
  RETURNING id AS artist_id
),
new_venue AS (
  INSERT INTO venue (
    id, region_code, name, type, locality, lat, lng, mbta, distance_km,
    commission_pct, fees, insurance_req, mediums, website_url, blurb, claim_status
  )
  VALUES (
    gen_random_uuid(), 'BOS', 'Green Line Gallery', 'gallery', 'Jamaica Plain',
    42.3100, -71.1140, 'yes', 4.800,
    40.00, 'none', false, ARRAY['painting','photography'],
    'https://greenline-gallery.example', 'Neighborhood gallery focusing on emerging artists.', 'unclaimed'
  )
  RETURNING id AS venue_id
),
new_call AS (
  INSERT INTO venue_open_call (venue_id, title, summary, url, deadline, status)
  SELECT venue_id,
         'Winter Small Works',
         'Open submission for small-format works across 2D media.',
         'https://greenline-gallery.example/open-call',
         CURRENT_DATE + INTERVAL '30 days',
         'open'
  FROM new_venue
  RETURNING id AS call_id
),
new_note AS (
  INSERT INTO note (artist_user_id, venue_id, body, attachments_total_bytes)
  SELECT a.artist_id, v.venue_id,
         'Looks like a great fit. Commission okay. Reach out after next series.',
         0
  FROM new_artist a, new_venue v
  RETURNING artist_user_id
)
-- Insert artist profile in the same CTE chain
INSERT INTO artist_profile (user_id, statement, goals, visibility, site_url, region_home)
SELECT artist_user_id,
       'Painter exploring urban light. Recent series: JP Nights.',
       'Solo show in next 12 months; prefer Boston/Somerville.',
       'venues',
       'https://artist-portfolio.example',
       'BOS'
FROM new_note;

-- Show what we inserted
SELECT 'Seed data inserted successfully!' as status;
SELECT * FROM app_user WHERE email = 'artist@example.com';
SELECT * FROM venue WHERE name = 'Green Line Gallery';
SELECT * FROM venue_open_call WHERE title = 'Winter Small Works';
SELECT * FROM note WHERE body LIKE 'Looks like a great fit%';
SELECT * FROM artist_profile WHERE site_url = 'https://artist-portfolio.example';
