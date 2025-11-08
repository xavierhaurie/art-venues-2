import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/migrations/add-mtl-region
 * Add MTL to the region_code enum type
 * This is a one-time migration endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if MTL already exists in the enum
    const { data: enumData, error: enumError } = await supabase.rpc('check_mtl_enum');

    // If the RPC doesn't exist, we'll try direct SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (error) {
      // Fallback: try using raw SQL through Supabase
      console.error('Error adding MTL to enum:', error);
      return NextResponse.json({
        error: 'Failed to add MTL to enum. Please run the SQL migration manually.',
        details: error.message,
        sqlScript: 'sql/12.add-mtl-to-region-enum.sql'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'MTL added to region_code enum successfully'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error.message,
        instruction: 'Please run sql/12.add-mtl-to-region-enum.sql manually in Supabase SQL Editor'
      },
      { status: 500 }
    );
  }
}

