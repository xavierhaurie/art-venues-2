import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '/lib/session';
import { supabase } from '/lib/db';

// POST /api/stickers/meanings/update?id={meaningId} - Update sticker meaning
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

    const { color, label, details } = await request.json();

    if (!color || !label) {
      return NextResponse.json({ error: 'Color and label are required' }, { status: 400 });
    }

    if (label.length > 15) {
      return NextResponse.json({ error: 'Label must be 15 characters or less' }, { status: 400 });
    }

    if (details && details.length > 1000) {
      return NextResponse.json({ error: 'Details must be 1000 characters or less' }, { status: 400 });
    }

    // Verify ownership and get current meaning
    const { data: currentMeaning, error: fetchError } = await supabase
      .from('sticker_meaning')
      .select('id, color')
      .eq('id', meaningId)
      .eq('artist_user_id', userId)
      .single();

    if (fetchError || !currentMeaning) {
      return NextResponse.json({ error: 'Sticker meaning not found' }, { status: 404 });
    }

    // If color is changing, check for conflicts
    if (color !== currentMeaning.color) {
      const { data: existing } = await supabase
        .from('sticker_meaning')
        .select('id')
        .eq('artist_user_id', userId)
        .eq('color', color)
        .neq('id', meaningId)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'A sticker with this color already exists' }, { status: 409 });
      }
    }

    const { data: meaning, error } = await supabase
      .from('sticker_meaning')
      .update({
        color,
        label,
        details: details || null
      })
      .eq('id', meaningId)
      .eq('artist_user_id', userId)
      .select('id, color, label, details, created_at')
      .single();

    if (error) {
      console.error('Error updating sticker meaning:', error);
      return NextResponse.json({ error: 'Failed to update sticker meaning' }, { status: 500 });
    }

    return NextResponse.json({ meaning });
  } catch (error) {
    console.error('Error in sticker meanings update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
