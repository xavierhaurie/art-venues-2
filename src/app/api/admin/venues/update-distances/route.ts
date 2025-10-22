import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/admin/venues/update-distances
 * Calculate and update distance_km for all BOS venues from Park Street Station
 *
 * M0-VEN-03: Distance & MBTA fields
 * AC: Distance from Park St generated/populated
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // For now, this is open but should be protected in production

    // Call the PostgreSQL function to update distances
    const { data, error } = await supabase.rpc('update_bos_venue_distances');

    if (error) {
      throw new Error(`Failed to update distances: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated distances for ${data} BOS venues`,
      updated_count: data,
    });
  } catch (error) {
    console.error('Distance update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update venue distances',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
