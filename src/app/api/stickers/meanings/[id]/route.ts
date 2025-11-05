import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

// PUT /api/stickers/meanings/[id] - Rename sticker meaning (label only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meaningId = params.id;

    if (!meaningId) {
      return NextResponse.json({ error: 'Sticker meaning ID is required' }, { status: 400 });
    }

    const { label } = await request.json();

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    if (label.length > 15) {
      return NextResponse.json({ error: 'Label must be 15 characters or less' }, { status: 400 });
    }

    // Verify ownership
    const { data: currentMeaning, error: fetchError } = await supabase
      .from('sticker_meaning')
      .select('id')
      .eq('id', meaningId)
      .eq('artist_user_id', userId)
      .single();

    if (fetchError || !currentMeaning) {
      return NextResponse.json({ error: 'Sticker meaning not found' }, { status: 404 });
    }

    // Update the label
    const { error: updateError } = await supabase
      .from('sticker_meaning')
      .update({ label: label.trim() })
      .eq('id', meaningId)
      .eq('artist_user_id', userId);

    if (updateError) {
      console.error('Error updating sticker meaning:', updateError);
      return NextResponse.json({ error: 'Failed to rename sticker' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in sticker meaning rename:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

