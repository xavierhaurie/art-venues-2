import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '/lib/rbac';
import { getSession } from '/lib/session';
import { createClient } from '@supabase/supabase-js';

// Force service role key to bypass RLS since custom session (not Supabase auth) is used
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // changed: always use service role
);

export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('note')
      .select('*')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching note:', error);
      return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error('Error in venue notes GET:', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const noteBody = json?.body;

    if (noteBody === undefined || noteBody === null) {
      return NextResponse.json({ error: 'body field is required' }, { status: 400 });
    }

    const venueId = params.venueId;
    const userId = session.userId;

    // Trim & normalize line endings (optional future place)
    const trimmed = String(noteBody); // keep whitespace if user wants leading spaces inside text

    // If blank after trimming whitespace-only => delete existing note (if any)
    if (trimmed.trim() === '') {
      const { error: delErr } = await supabase
        .from('note')
        .delete()
        .eq('venue_id', venueId)
        .eq('artist_user_id', userId);
      if (delErr) {
        console.error('[NOTE] Delete error:', delErr);
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
      }
      return NextResponse.json({ note: null, deleted: true });
    }

    // Atomic upsert (relies on UNIQUE (artist_user_id, venue_id))
    const { data: upsertData, error: upsertErr } = await supabase
      .from('note')
      .upsert({ venue_id: venueId, artist_user_id: userId, body: trimmed }, { onConflict: 'artist_user_id,venue_id' })
      .select('id, body, venue_id, artist_user_id')
      .single();

    if (upsertErr) {
      console.error('[NOTE] Upsert error:', upsertErr);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    // Verification fetch (defensive) – ensures the row exists immediately after upsert
    const { data: verifyRow, error: verifyErr } = await supabase
      .from('note')
      .select('id, body')
      .eq('id', upsertData.id)
      .maybeSingle();

    if (verifyErr || !verifyRow) {
      console.error('[NOTE] Verification failed:', verifyErr);
      return NextResponse.json({ error: 'Note verification failed after save' }, { status: 500 });
    }

    return NextResponse.json({ note: { id: upsertData.id, body: upsertData.body }, saved: true });
  } catch (error) {
    console.error('[NOTE] Unexpected save error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
