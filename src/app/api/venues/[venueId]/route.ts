import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/venues/[venueId]
 * Fetch a single venue by ID with ALL fields (including contact info)
 * Used by the venue modal to get complete venue data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const { venueId } = params;

    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    // Select ALL fields including contact information
    const { data, error } = await supabase
      .from('venue')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }
      console.error('Error fetching venue:', error);
      return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in venue GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

