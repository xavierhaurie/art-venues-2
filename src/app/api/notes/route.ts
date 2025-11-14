import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '@/lib/rbac';
import { getVenueNotes, createNote, updateNote, deleteNote, getNote } from '@/lib/notes';

export async function GET(request: NextRequest) {
  // Check authentication and role
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venue_id');
    const noteId = searchParams.get('note_id');

    if (noteId) {
      // Get specific note
      const note = await getNote(noteId);
      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ note });
    }

    if (venueId) {
      // Get all notes for venue
      const result = await getVenueNotes(venueId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'venue_id or note_id parameter required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in notes GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check authentication and role
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.venue_id || !body.body) {
      return NextResponse.json(
        { error: 'venue_id and body are required' },
        { status: 400 }
      );
    }

    const note = await createNote({
      venue_id: body.venue_id,
      body: body.body
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error in notes POST:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Check authentication and role
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('note_id');

    if (!noteId) {
      return NextResponse.json(
        { error: 'note_id parameter required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.body) {
      return NextResponse.json(
        { error: 'body is required' },
        { status: 400 }
      );
    }

    const note = await updateNote(noteId, {
      body: body.body
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error in notes PUT:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Check authentication and role
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('note_id');

    if (!noteId) {
      return NextResponse.json(
        { error: 'note_id parameter required' },
        { status: 400 }
      );
    }

    await deleteNote(noteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in notes DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
