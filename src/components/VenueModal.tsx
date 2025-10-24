'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
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
    setImagesLoading,
    incrementUploading,
    decrementUploading,
  } = useVenueStore();

  const venueNote = notes[venue.id];
  const isSaving = notesSaving[venue.id] || false;
  const venueImages = images[venue.id] || [];
  const uploadingCount = imagesUploading[venue.id] || 0;

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

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

    if (venueImages.length + files.length > 20) {
      alert(`Maximum 20 images allowed. You can upload ${20 - venueImages.length} more.`);
      return;
    }

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
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
      saveNotes(localNotes);
    }

    if (isSaving || uploadingCount > 0) {
      return;
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSaving && uploadingCount === 0) {
      handleClose();
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
        onKeyDown={handleKeyDown}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '56rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>{venue.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isSaving && (
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Saving...</span>
              )}
              {uploadingCount > 0 && (
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Uploading {uploadingCount} image{uploadingCount > 1 ? 's' : ''}...
                </span>
              )}
              <button
                onClick={handleClose}
                disabled={isSaving || uploadingCount > 0}
                style={{
                  color: '#6b7280',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'none',
                  cursor: isSaving || uploadingCount > 0 ? 'not-allowed' : 'pointer',
                  opacity: isSaving || uploadingCount > 0 ? 0.3 : 1,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}>
            {/* Notes Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1f2937' }}>Notes</h3>
              <textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical',
                  outline: 'none',
                  backgroundColor: isSaving ? '#f9fafb' : 'white',
                }}
                placeholder="Add your notes about this venue..."
              />
            </div>

            {/* Images Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1f2937' }}>
                Images ({venueImages.length}/20)
              </h3>

              {/* Upload Area */}
              <div
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ color: '#6b7280' }}>
                  <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>📁 Drop images here or click to upload</div>
                  <div style={{ fontSize: '0.875rem' }}>JPEG, PNG, GIF, SVG • Max 1MB per image • Compressed to ~100KB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.svg"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Image Grid */}
              {venueImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {venueImages.map((image, index) => (
                    <div
                      key={image.id}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        backgroundColor: '#f3f4f6',
                        cursor: 'pointer',
                      }}
                      onClick={() => setGalleryIndex(index)}
                    >
                      <img
                        src={image.url}
                        alt={image.title || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Venue Details */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>Venue Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Type:</span>{' '}
                  <span style={{ color: '#6b7280' }}>{venue.type}</span>
                </div>
                <div>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Location:</span>{' '}
                  <span style={{ color: '#6b7280' }}>{venue.locality}</span>
                </div>
                {venue.address && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Address:</span>{' '}
                    <span style={{ color: '#6b7280' }}>{venue.address}</span>
                  </div>
                )}
                {venue.website_url && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Website:</span>{' '}
                    <a
                      href={venue.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
                    >
                      {venue.website_url}
                    </a>
                  </div>
                )}
                {venue.artist_summary && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Artist Summary:</span>{' '}
                    <span style={{ color: '#6b7280' }}>{venue.artist_summary}</span>
                  </div>
                )}
                {venue.visitor_summary && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Visitor Summary:</span>{' '}
                    <span style={{ color: '#6b7280' }}>{venue.visitor_summary}</span>
                  </div>
                )}
                {venue.instagram && (
                  <div>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Instagram:</span>{' '}
                    <a
                      href={`https://instagram.com/${venue.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb' }}
                    >
                      @{venue.instagram}
                    </a>
                  </div>
                )}
                {venue.facebook && (
                  <div>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Facebook:</span>{' '}
                    <a
                      href={venue.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb' }}
                    >
                      Link
                    </a>
                  </div>
                )}
                {venue.public_transit && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Public Transit:</span>{' '}
                    <span style={{ color: '#6b7280' }}>{venue.public_transit}</span>
                  </div>
                )}
                {venue.map_link && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <a
                      href={venue.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
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
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setGalleryIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setGalleryIndex(null);
            }}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              color: 'white',
              fontSize: '3rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ×
          </button>

          {galleryIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(galleryIndex - 1);
              }}
              style={{
                position: 'absolute',
                left: '1rem',
                color: 'white',
                fontSize: '3rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ‹
            </button>
          )}

          <img
            src={venueImages[galleryIndex].url}
            alt={venueImages[galleryIndex].title || ''}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {galleryIndex < venueImages.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(galleryIndex + 1);
              }}
              style={{
                position: 'absolute',
                right: '1rem',
                color: 'white',
                fontSize: '3rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ›
            </button>
          )}

          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'white',
          }}>
            {galleryIndex + 1} / {venueImages.length}
          </div>
        </div>
      )}
    </>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}

