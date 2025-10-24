'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVenueStore } from '@/lib/store/venueStore';
import { compressImage, validateImageFile } from '@/lib/imageUtils';

interface Venue {
  id: string;
  name: string;
  type: string;
  locality: string;
  address?: string;
  website_url?: string;
  artist_summary?: string;
  visitor_summary?: string;
  facebook?: string;
  instagram?: string;
  public_transit?: string;
  map_link?: string;
}

interface VenueModalProps {
  venue: Venue;
  onClose: () => void;
}

export default function VenueModal({ venue, onClose }: VenueModalProps) {
  const [localNotes, setLocalNotes] = useState('');
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const notesTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    notes,
    notesSaving,
    images,
    imagesLoading,
    imagesUploading,
    setNote,
    setNoteSaving,
    setImages,
    addImage,
    removeImage,
    updateImageOrder,
    setImagesLoading,
    incrementUploading,
    decrementUploading,
  } = useVenueStore();

  const venueNote = notes[venue.id];
  const isSaving = notesSaving[venue.id] || false;
  const venueImages = images[venue.id] || [];
  const uploadingCount = imagesUploading[venue.id] || 0;

  // Load notes on mount
  useEffect(() => {
    loadNotes();
    loadImages();
  }, [venue.id]);

  // Sync local notes with store
  useEffect(() => {
    if (venueNote) {
      setLocalNotes(venueNote.body || '');
    }
  }, [venueNote]);

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/venues/${venue.id}/notes`);
      if (response.ok) {
        const data = await response.json();
        if (data.note) {
          setNote(venue.id, data.note);
        } else {
          setNote(venue.id, { body: '', venue_id: venue.id });
        }
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const loadImages = async () => {
    setImagesLoading(venue.id, true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(venue.id, data.images || []);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setImagesLoading(venue.id, false);
    }
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);

    // Clear existing timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    // Set new timeout for auto-save
    notesTimeoutRef.current = setTimeout(() => {
      saveNotes(value);
    }, 500);
  };

  const saveNotes = async (noteBody: string) => {
    setNoteSaving(venue.id, true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteBody }),
      });

      if (response.ok) {
        const data = await response.json();
        setNote(venue.id, data.note || { body: '', venue_id: venue.id });
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setNoteSaving(venue.id, false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    const validFiles: File[] = [];

    // Check max images limit
    if (venueImages.length + files.length > 20) {
      alert(`Maximum 20 images allowed. You can upload ${20 - venueImages.length} more.`);
      return;
    }

    // Validate and compress files
    for (const file of Array.from(files)) {
      const validationError = validateImageFile(file, 1);
      if (validationError) {
        alert(`${file.name}: ${validationError}`);
        continue;
      }

      try {
        incrementUploading(venue.id);
        const compressed = await compressImage(file, 100, 1200);
        validFiles.push(compressed);
      } catch (error) {
        console.error('Failed to compress image:', error);
        alert(`Failed to compress ${file.name}`);
        decrementUploading(venue.id);
      }
    }

    // Upload compressed files
    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/venues/${venue.id}/images`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          addImage(venue.id, data.image);
        } else {
          alert(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert(`Failed to upload ${file.name}`);
      } finally {
        decrementUploading(venue.id);
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      const response = await fetch(`/api/venues/${venue.id}/images/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });

      if (response.ok) {
        removeImage(venue.id, imageId);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleClose = () => {
    // Check if there's a pending save
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
      // Force immediate save before closing
      saveNotes(localNotes);
    }

    if (isSaving || uploadingCount > 0) {
      return; // Prevent closing while saving
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSaving && uploadingCount === 0) {
      handleClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        onKeyDown={handleKeyDown}
      >
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold">{venue.name}</h2>
            <div className="flex items-center gap-4">
              {isSaving && (
                <span className="text-sm text-gray-500">Saving...</span>
              )}
              {uploadingCount > 0 && (
                <span className="text-sm text-gray-500">
                  Uploading {uploadingCount} image{uploadingCount > 1 ? 's' : ''}...
                </span>
              )}
              <button
                onClick={handleClose}
                disabled={isSaving || uploadingCount > 0}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Notes Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Notes</h3>
              <textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                disabled={isSaving}
                className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg text-base resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="Add your notes about this venue..."
              />
            </div>

            {/* Images Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                Images ({venueImages.length}/20)
              </h3>

              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-gray-600">
                  <div className="text-lg mb-2">📁 Drop images here or click to upload</div>
                  <div className="text-sm">JPEG, PNG, GIF, SVG • Max 1MB per image • Compressed to ~100KB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.svg"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Image Grid */}
              {venueImages.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {venueImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                      onClick={() => setGalleryIndex(index)}
                    >
                      <img
                        src={image.url}
                        alt={image.title || ''}
                        className="w-full h-full object-cover"
                      />

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>

                      {/* Title */}
                      {image.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 truncate">
                          {image.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Venue Details */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Venue Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Type:</span>{' '}
                  <span className="text-gray-600">{venue.type}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Location:</span>{' '}
                  <span className="text-gray-600">{venue.locality}</span>
                </div>
                {venue.address && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Address:</span>{' '}
                    <span className="text-gray-600">{venue.address}</span>
                  </div>
                )}
                {venue.website_url && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Website:</span>{' '}
                    <a
                      href={venue.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {venue.website_url}
                    </a>
                  </div>
                )}
                {venue.artist_summary && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Artist Summary:</span>{' '}
                    <span className="text-gray-600">{venue.artist_summary}</span>
                  </div>
                )}
                {venue.visitor_summary && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Visitor Summary:</span>{' '}
                    <span className="text-gray-600">{venue.visitor_summary}</span>
                  </div>
                )}
                {venue.instagram && (
                  <div>
                    <span className="font-semibold text-gray-700">Instagram:</span>{' '}
                    <a
                      href={`https://instagram.com/${venue.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      @{venue.instagram}
                    </a>
                  </div>
                )}
                {venue.facebook && (
                  <div>
                    <span className="font-semibold text-gray-700">Facebook:</span>{' '}
                    <a
                      href={venue.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Link
                    </a>
                  </div>
                )}
                {venue.public_transit && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Public Transit:</span>{' '}
                    <span className="text-gray-600">{venue.public_transit}</span>
                  </div>
                )}
                {venue.map_link && (
                  <div className="col-span-2">
                    <a
                      href={venue.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View on Map
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {galleryIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center"
          onClick={() => setGalleryIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setGalleryIndex(null);
            }}
            className="absolute top-4 right-4 text-white text-4xl"
          >
            ×
          </button>

          {galleryIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(galleryIndex - 1);
              }}
              className="absolute left-4 text-white text-4xl"
            >
              ‹
            </button>
          )}

          <img
            src={venueImages[galleryIndex].url}
            alt={venueImages[galleryIndex].title || ''}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {galleryIndex < venueImages.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(galleryIndex + 1);
              }}
              className="absolute right-4 text-white text-4xl"
            >
              ›
            </button>
          )}

          <div className="absolute bottom-4 left-0 right-0 text-center text-white">
            {galleryIndex + 1} / {venueImages.length}
          </div>
        </div>
      )}
    </>
  );
}

