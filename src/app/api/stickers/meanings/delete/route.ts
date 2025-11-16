import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

// POST /api/stickers/meanings/delete?id={meaningId}&force=true - Delete sticker meaning
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meaningId = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!meaningId) {
      return NextResponse.json({ error: 'Sticker meaning ID is required' }, { status: 400 });
    }

    // Verify ownership before any destructive actions
    const { data: meaning, error: meaningError } = await supabase
      .from('sticker_meaning')
      .select('id')
      .eq('id', meaningId)
      .eq('artist_user_id', userId)
      .single();

    if (meaningError || !meaning) {
      return NextResponse.json({ error: 'Sticker meaning not found' }, { status: 404 });
    }

    // Check if this sticker meaning has any assignments
    const { data: assignments, error: assignError } = await supabase
      .from('sticker_assignment')
      .select('id')
      .eq('sticker_meaning_id', meaningId)
      .limit(1);

    if (assignError) {
      console.error('Error checking sticker assignments:', assignError);
      return NextResponse.json({ error: 'Failed to check sticker assignments' }, { status: 500 });
    }

    if (assignments && assignments.length > 0 && !force) {
      return NextResponse.json({
        error: 'Cannot delete sticker meaning that is assigned to venues',
        hasAssignments: true
      }, { status: 409 });
    }

    // Prepare container for affected venue ids (populated if force delete is performed)
    let affectedVenueIds: string[] = [];

    // If force is true and assignments exist, delete assignments first
    if (assignments && assignments.length > 0 && force) {
      // Get list of affected venue IDs so the client can refresh only those rows
      const { data: affectedRows, error: affectedError } = await supabase
        .from('sticker_assignment')
        .select('venue_id')
        .eq('sticker_meaning_id', meaningId);

      if (affectedError) {
        console.error('Error fetching affected venue ids for force delete:', affectedError);
        return NextResponse.json({ error: 'Failed to determine affected venues' }, { status: 500 });
      }

      affectedVenueIds = Array.from(new Set((affectedRows || []).map((r: any) => r.venue_id)));

      const { error: deleteAssignError } = await supabase
        .from('sticker_assignment')
        .delete()
        .eq('sticker_meaning_id', meaningId);

      if (deleteAssignError) {
        console.error('Error deleting sticker assignments during force delete:', deleteAssignError);
        return NextResponse.json({ error: 'Failed to delete sticker assignments' }, { status: 500 });
      }

      // Proceed to delete the meaning and return affectedVenueIds in the response below
    }

    // Delete the sticker meaning
    const { error } = await supabase
      .from('sticker_meaning')
      .delete()
      .eq('id', meaningId)
      .eq('artist_user_id', userId);

    if (error) {
      console.error('Error deleting sticker meaning:', error);
      return NextResponse.json({ error: 'Failed to delete sticker meaning' }, { status: 500 });
    }

    // If we performed a force delete earlier, include affectedVenueIds
    if (force) {
      return NextResponse.json({ success: true, affectedVenueIds });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in sticker meanings delete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
