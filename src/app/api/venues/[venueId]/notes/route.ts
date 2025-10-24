import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '@/lib/rbac';
import { getSession } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    const body = await request.json();
    const { body: noteBody } = body;

    if (noteBody === undefined || noteBody === null) {
      return NextResponse.json({ error: 'body field is required' }, { status: 400 });
    }

    // Check if note exists
    const { data: existingNote } = await supabase
      .from('note')
      .select('id')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .maybeSingle();

    let result;

    if (noteBody.trim() === '') {
      // Delete note if empty
      if (existingNote) {
        const { error } = await supabase
          .from('note')
          .delete()
          .eq('id', existingNote.id);

        if (error) {
          console.error('Error deleting note:', error);
          return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
        }

        return NextResponse.json({ note: null });
      }
      return NextResponse.json({ note: null });
    }

    if (existingNote) {
      // Update existing note
      const { data, error } = await supabase
        .from('note')
        .update({ body: noteBody })
        .eq('id', existingNote.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating note:', error);
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
      }

      result = data;
    } else {
      // Create new note
      const { data, error } = await supabase
        .from('note')
        .insert({
          venue_id: params.venueId,
          artist_user_id: session.userId,
          body: noteBody,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json({ note: result });
  } catch (error) {
    console.error('Error in venue notes POST:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}

