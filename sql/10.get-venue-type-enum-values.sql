-- SQL function to get venue_type enum values
-- This allows the API to query the enum type values directly

CREATE OR REPLACE FUNCTION get_venue_type_enum_values()
RETURNS TABLE (id text, name text)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'type-' || ROW_NUMBER() OVER (ORDER BY enumlabel) AS id,
    enumlabel::text AS name
  FROM pg_enum
  WHERE enumtypid = 'venue_type'::regtype
  ORDER BY enumlabel;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_venue_type_enum_values() TO authenticated;
GRANT EXECUTE ON FUNCTION get_venue_type_enum_values() TO service_role;

-- Test the function
SELECT * FROM get_venue_type_enum_values();

