-- SQL script to create localities table and populate it from venues table
-- This extracts all unique localities from the venue table

-- Step 1: Create the localities table
CREATE TABLE IF NOT EXISTS locality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    region_code TEXT NOT NULL DEFAULT 'BOS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create an index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_locality_name ON locality(name);
CREATE INDEX IF NOT EXISTS idx_locality_region ON locality(region_code);

-- Step 3: Insert unique localities from the venue table
INSERT INTO locality (name, region_code, created_at, updated_at)
SELECT DISTINCT
    locality AS name,
    region_code,
    NOW() AS created_at,
    NOW() AS updated_at
FROM venue
WHERE locality IS NOT NULL
  AND locality != ''
ON CONFLICT (name) DO NOTHING;

-- Step 4: Verify the data
SELECT
    region_code,
    COUNT(*) as locality_count
FROM locality
GROUP BY region_code
ORDER BY region_code;

-- Step 5: Show all localities
SELECT
    id,
    name,
    region_code,
    created_at
FROM locality
ORDER BY region_code, name;

-- Optional: Add a comment to the table
COMMENT ON TABLE locality IS 'Lookup table for venue localities/neighborhoods, extracted from venue data';
COMMENT ON COLUMN locality.name IS 'Name of the locality/neighborhood';
COMMENT ON COLUMN locality.region_code IS 'Region code (BOS, LA, NYC, etc.)';

-- Optional: Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_locality_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_locality_timestamp ON locality;
CREATE TRIGGER trigger_update_locality_timestamp
    BEFORE UPDATE ON locality
    FOR EACH ROW
    EXECUTE FUNCTION update_locality_updated_at();

