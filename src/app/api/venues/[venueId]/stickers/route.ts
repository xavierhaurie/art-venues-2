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
