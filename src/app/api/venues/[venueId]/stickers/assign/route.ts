import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '/lib/session';
import { supabase } from '/lib/db';

// POST /api/venues/[venueId]/stickers/assign - Assign sticker to venue
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
    const { sticker_meaning_id } = await request.json();

    if (!sticker_meaning_id) {
      return NextResponse.json({ error: 'Sticker meaning ID is required' }, { status: 400 });
    }

    // Verify the sticker meaning belongs to the user
    const { data: meaning, error: meaningError } = await supabase
      .from('sticker_meaning')
      .select('id, color, label, details')
      .eq('id', sticker_meaning_id)
      .eq('artist_user_id', userId)
      .single();

    if (meaningError || !meaning) {
      return NextResponse.json({ error: 'Sticker meaning not found' }, { status: 404 });
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from('sticker_assignment')
      .select('id')
      .eq('venue_id', venueId)
      .eq('artist_user_id', userId)
      .eq('sticker_meaning_id', sticker_meaning_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Sticker already assigned to this venue' }, { status: 409 });
    }

    // Create the assignment
    const { data: assignment, error } = await supabase
      .from('sticker_assignment')
      .insert({
        venue_id: venueId,
        artist_user_id: userId,
        sticker_meaning_id
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error assigning sticker:', error);
      return NextResponse.json({ error: 'Failed to assign sticker' }, { status: 500 });
    }

    return NextResponse.json({
      assignment: {
        ...assignment,
        sticker_meaning_id,
        ...meaning
      }
    });
  } catch (error) {
    console.error('Error in sticker assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
