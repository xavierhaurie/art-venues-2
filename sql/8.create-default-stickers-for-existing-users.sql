-- Create default stickers for all existing users who don't have any
-- This is a one-time migration script to populate stickers for existing users

DO $$
DECLARE
  user_record RECORD;
  sticker_count INTEGER;
BEGIN
  -- Loop through all users
  FOR user_record IN
    SELECT id FROM app_user WHERE role = 'artist'
  LOOP
    -- Check if user already has stickers
    SELECT COUNT(*) INTO sticker_count
    FROM sticker_meaning
    WHERE artist_user_id = user_record.id;

    -- If no stickers exist, create default ones
    IF sticker_count = 0 THEN
      PERFORM create_default_stickers_for_user(user_record.id);
      RAISE NOTICE 'Created default stickers for user: %', user_record.id;
    ELSE
      RAISE NOTICE 'User % already has % stickers, skipping', user_record.id, sticker_count;
    END IF;
  END LOOP;
END;
$$;

-- Show summary
SELECT
  u.id,
  u.email,
  COUNT(sm.id) as sticker_count
FROM app_user u
LEFT JOIN sticker_meaning sm ON sm.artist_user_id = u.id
WHERE u.role = 'artist'
GROUP BY u.id, u.email
ORDER BY u.email;

