import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserId } from '/lib/session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/venues/[venueId]/make_public
 * Converts a user-owned venue into a public venue (owner_user_id set to null)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venueId } = params;
    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    // Fetch venue ownership
    const { data: venue, error: fetchError } = await supabase
      .from('venue')
      .select('id, owner_user_id')
      .eq('id', venueId)
      .single();

    if (fetchError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    if (venue.owner_user_id !== userId) {
      return NextResponse.json({ error: 'You can only convert your own venues' }, { status: 403 });
    }

    // Clear owner_user_id to make venue public
    const { data: updated, error: updateError } = await supabase
      .from('venue')
      .update({ owner_user_id: null, updated_at: new Date().toISOString() })
      .eq('id', venueId)
      .select('id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id')
      .single();

    if (updateError) {
      console.error('Error making venue public:', updateError);
      return NextResponse.json({ error: 'Failed to make venue public' }, { status: 500 });
    }

    return NextResponse.json({ venue: { ...updated, user_owned: false } }, { status: 200 });
  } catch (e: any) {
    console.error('make_public unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error', message: e?.message || String(e) }, { status: 500 });
  }
}
