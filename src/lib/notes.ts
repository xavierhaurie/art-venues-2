import { createClient } from '@supabase/supabase-js';
import { getSession } from './session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Note {
  id: string;
  artist_user_id: string;
  venue_id: string;
  body: string;
  attachments_meta: Record<string, any>;
  attachments_total_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  venue_id: string;
  body: string;
}

export interface UpdateNoteData {
  body: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
}

/**
 * Get all notes for a specific venue by the current user
 */
export async function getVenueNotes(venueId: string): Promise<NotesResponse> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }

  const { data, error, count } = await supabase
    .from('note')
    .select('*', { count: 'exact' })
    .eq('venue_id', venueId)
    .eq('artist_user_id', session.userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching venue notes:', error);
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }

  return {
    notes: data || [],
    total: count || 0
  };
}

/**
 * Create a new note for a venue
 */
export async function createNote(noteData: CreateNoteData): Promise<Note> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('note')
    .insert({
      venue_id: noteData.venue_id,
      body: noteData.body,
      artist_user_id: session.userId,
      attachments_meta: {},
      attachments_total_bytes: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating note:', error);
    throw new Error(`Failed to create note: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing note
 */
export async function updateNote(noteId: string, noteData: UpdateNoteData): Promise<Note> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('note')
    .update({
      body: noteData.body,
      updated_at: new Date().toISOString()
    })
    .eq('id', noteId)
    .eq('artist_user_id', session.userId) // Ensure user owns the note
    .select()
    .single();

  if (error) {
    console.error('Error updating note:', error);
    throw new Error(`Failed to update note: ${error.message}`);
  }

  if (!data) {
    throw new Error('Note not found or access denied');
  }

  return data;
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('note')
    .delete()
    .eq('id', noteId)
    .eq('artist_user_id', session.userId); // Ensure user owns the note

  if (error) {
    console.error('Error deleting note:', error);
    throw new Error(`Failed to delete note: ${error.message}`);
  }
}

/**
 * Get a specific note by ID (for the current user)
 */
export async function getNote(noteId: string): Promise<Note | null> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('note')
    .select('*')
    .eq('id', noteId)
    .eq('artist_user_id', session.userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      return null;
    }
    console.error('Error fetching note:', error);
    throw new Error(`Failed to fetch note: ${error.message}`);
  }

  return data;
}
