'use client';

import { useState, useEffect } from 'react';
import { getVenueNotes, createNote, updateNote, deleteNote, Note } from '@/lib/notes';

interface VenueNotesProps {
  venueId: string;
  venueName: string;
}

export default function VenueNotes({ venueId, venueName }: VenueNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load notes for this venue
  useEffect(() => {
    loadNotes();
  }, [venueId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const result = await getVenueNotes(venueId);
      setNotes(result.notes);
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      setIsCreating(true);
      const newNote = await createNote({
        venue_id: venueId,
        body: newNoteText.trim()
      });

      // Optimistic UI update
      setNotes(prev => [newNote, ...prev]);
      setNewNoteText('');
      setError(null);
    } catch (err) {
      setError('Failed to create note');
      console.error('Error creating note:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditNote = async (noteId: string, newBody: string) => {
    if (!newBody.trim()) return;

    try {
      const updatedNote = await updateNote(noteId, { body: newBody.trim() });

      // Optimistic UI update
      setNotes(prev => prev.map(note =>
        note.id === noteId ? updatedNote : note
      ));
      setEditingId(null);
      setEditText('');
      setError(null);
    } catch (err) {
      setError('Failed to update note');
      console.error('Error updating note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(noteId);

      // Optimistic UI update
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setError(null);
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
    }
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Notes for {venueName}</h3>
        <div className="text-gray-500">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Notes for {venueName}</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Create new note */}
      <div className="mb-6">
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Add a note about this venue..."
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleCreateNote}
            disabled={!newNoteText.trim() || isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No notes yet. Add your first note above!
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="border border-gray-200 rounded-md p-4">
              {editingId === note.id ? (
                /* Edit mode */
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEditNote(note.id, editText)}
                      disabled={!editText.trim()}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <p className="text-gray-800 whitespace-pre-wrap">{note.body}</p>
                  <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                    <span>
                      {note.created_at !== note.updated_at ? 'Updated' : 'Created'}{' '}
                      {new Date(note.updated_at).toLocaleDateString()} at{' '}
                      {new Date(note.updated_at).toLocaleTimeString()}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => startEditing(note)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
