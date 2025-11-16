import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/venue-types
 * Get all venue types from the venue_type ENUM type
 */
export async function GET() {
  try {
    // Query distinct type values from the venue table
    // This is more reliable than trying to query the enum directly
    const { data: venueData, error } = await supabase
      .from('venue')
      .select('type')
      .not('type', 'is', null);

    if (error) {
      console.error('Error fetching venue types:', error);
      return NextResponse.json({ error: 'Failed to fetch venue types' }, { status: 500 });
    }

    // Get unique types from actual venue data and sort them
    const uniqueTypes = Array.from(new Set(venueData?.map(v => v.type) || [])).sort();
    const venueTypes = uniqueTypes.map((type, index) => ({
      id: `type-${index}`,
      name: type
    }));

    console.log('Venue types loaded:', venueTypes.length);
    return NextResponse.json({ venueTypes });
  } catch (error) {
    console.error('Error in venue types GET:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch venue types',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

