import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { supabase } from '@/lib/db';

/**
 * POST /api/stickers/initialize
 * Creates default sticker meanings for the authenticated user if none exist.
 */
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has sticker meanings
    const { data: existing, error: existingErr } = await supabase
      .from('sticker_meaning')
      .select('id')
      .eq('artist_user_id', userId)
      .limit(1);

    if (existingErr) {
      console.error('Sticker initialize check error:', existingErr);
      return NextResponse.json({ error: 'Failed to check existing stickers' }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      // Already has stickers; return current list
      const { data: meanings, error: meaningsErr } = await supabase
        .from('sticker_meaning')
        .select('id, color, label, details, created_at')
        .eq('artist_user_id', userId)
        .order('created_at', { ascending: true });
      if (meaningsErr) {
        return NextResponse.json({ error: 'Failed to load existing stickers' }, { status: 500 });
      }
      return NextResponse.json({ meanings });
    }

    // Invoke DB function to create defaults
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_default_stickers_for_user', { user_id: userId });
    if (rpcErr) {
      console.error('Default stickers RPC error:', rpcErr);
      return NextResponse.json({ error: 'Failed to create default stickers' }, { status: 500 });
    }

    // Fetch newly created stickers
    const { data: createdMeanings, error: fetchErr } = await supabase
      .from('sticker_meaning')
      .select('id, color, label, details, created_at')
      .eq('artist_user_id', userId)
      .order('created_at', { ascending: true });
    if (fetchErr) {
      return NextResponse.json({ error: 'Failed to fetch created stickers' }, { status: 500 });
    }

    return NextResponse.json({ meanings: createdMeanings || [] }, { status: 201 });
  } catch (e: any) {
    console.error('Sticker initialize unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error', message: e?.message || String(e) }, { status: 500 });
  }
}
