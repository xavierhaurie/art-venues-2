-- Add MTL to region_code enum
-- This migration adds 'MTL' (Montreal) to the existing region_code enum type

-- Check if MTL already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'MTL'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'region_code')
    ) THEN
        ALTER TYPE region_code ADD VALUE 'MTL';
    END IF;
END $$;

-- Verify the enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'region_code')
ORDER BY enumsortorder;

