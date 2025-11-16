import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

// POST /api/venues/[venueId]/stickers/unassign - Unassign sticker from venue
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

    // Delete the assignment (verify ownership through the where clause)
    const { error } = await supabase
      .from('sticker_assignment')
      .delete()
      .eq('venue_id', venueId)
      .eq('artist_user_id', userId)
      .eq('sticker_meaning_id', sticker_meaning_id);

    if (error) {
      console.error('Error unassigning sticker:', error);
      return NextResponse.json({ error: 'Failed to unassign sticker' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in sticker unassignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
