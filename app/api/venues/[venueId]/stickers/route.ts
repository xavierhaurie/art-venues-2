import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

// GET /api/venues/[venueId]/stickers - Get stickers assigned to a venue
export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venueId } = params;

    const { data: assignments, error } = await supabase
      .from('sticker_assignment')
      .select(`
        id,
        sticker_meaning_id,
        created_at,
        sticker_meaning!inner (
          id,
          color,
          label,
          details
        )
      `)
      .eq('venue_id', venueId)
      .eq('artist_user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching venue stickers:', error);
      return NextResponse.json({ error: 'Failed to fetch venue stickers' }, { status: 500 });
    }

    // Transform the data to flatten the sticker_meaning
    const stickers = assignments?.map((assignment: any) => ({
      id: assignment.id,
      sticker_meaning_id: assignment.sticker_meaning_id,
      created_at: assignment.created_at,
      ...assignment.sticker_meaning
    })) || [];

    return NextResponse.json({ stickers });
  } catch (error) {
    console.error('Error in venue stickers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/venues/[venueId]/stickers - Assign or unassign sticker to venue
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
    const { action, stickerMeaningId } = await request.json();

    if (!action || !stickerMeaningId) {
      return NextResponse.json({ error: 'Action and stickerMeaningId are required' }, { status: 400 });
    }

    if (action === 'assign') {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('sticker_assignment')
        .select('id')
        .eq('venue_id', venueId)
        .eq('artist_user_id', userId)
        .eq('sticker_meaning_id', stickerMeaningId)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Sticker already assigned to this venue' }, { status: 409 });
      }

      // Create assignment
      const { data, error } = await supabase
        .from('sticker_assignment')
        .insert({
          venue_id: venueId,
          artist_user_id: userId,
          sticker_meaning_id: stickerMeaningId
        })
        .select()
        .single();

      if (error) {
        console.error('Error assigning sticker:', error);
        return NextResponse.json({ error: 'Failed to assign sticker' }, { status: 500 });
      }

      return NextResponse.json({ assignment: data });

    } else if (action === 'unassign') {
      const { error } = await supabase
        .from('sticker_assignment')
        .delete()
        .eq('venue_id', venueId)
        .eq('artist_user_id', userId)
        .eq('sticker_meaning_id', stickerMeaningId);

      if (error) {
        console.error('Error unassigning sticker:', error);
        return NextResponse.json({ error: 'Failed to unassign sticker' }, { status: 500 });
      }

      return NextResponse.json({ success: true });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "assign" or "unassign"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in venue stickers POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
