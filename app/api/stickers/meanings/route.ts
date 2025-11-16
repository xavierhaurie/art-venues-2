import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

// GET /api/stickers/meanings - Get user's sticker meanings
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: meanings, error } = await supabase
      .from('sticker_meaning')
      .select('id, color, label, details, created_at')
      .eq('artist_user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching sticker meanings:', error);
      return NextResponse.json({ error: 'Failed to fetch sticker meanings' }, { status: 500 });
    }

    return NextResponse.json({ meanings });
  } catch (error) {
    console.error('Error in sticker meanings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stickers/meanings - Create new sticker meaning
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check if color already exists for this user
    const { data: existing } = await supabase
      .from('sticker_meaning')
      .select('id')
      .eq('artist_user_id', userId)
      .eq('color', color)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A sticker with this color already exists' }, { status: 409 });
    }

    const { data: meaning, error } = await supabase
      .from('sticker_meaning')
      .insert({
        artist_user_id: userId,
        color,
        label,
        details: details || null
      })
      .select('id, color, label, details, created_at')
      .single();

    if (error) {
      console.error('Error creating sticker meaning:', error);
      return NextResponse.json({ error: 'Failed to create sticker meaning' }, { status: 500 });
    }

    return NextResponse.json({ meaning });
  } catch (error) {
    console.error('Error in sticker meanings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
