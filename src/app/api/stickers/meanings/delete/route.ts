import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

// POST /api/stickers/meanings/delete?id={meaningId} - Delete sticker meaning
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meaningId = searchParams.get('id');

    if (!meaningId) {
      return NextResponse.json({ error: 'Sticker meaning ID is required' }, { status: 400 });
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

    if (assignments && assignments.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete sticker meaning that is assigned to venues',
        hasAssignments: true
      }, { status: 409 });
    }

    // Verify ownership before deletion
    const { data: meaning } = await supabase
      .from('sticker_meaning')
      .select('id')
      .eq('id', meaningId)
      .eq('artist_user_id', userId)
      .single();

    if (!meaning) {
      return NextResponse.json({ error: 'Sticker meaning not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('sticker_meaning')
      .delete()
      .eq('id', meaningId)
      .eq('artist_user_id', userId);

    if (error) {
      console.error('Error deleting sticker meaning:', error);
      return NextResponse.json({ error: 'Failed to delete sticker meaning' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in sticker meanings delete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
