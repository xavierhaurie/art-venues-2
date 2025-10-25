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
  onNoteSaved?: (venueId: string, noteBody: string, noteId?: string) => void;
}

export default function VenueModal({ venue, onClose, onNoteSaved }: VenueModalProps) {
  const [localNotes, setLocalNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    notes,
    images,
    imagesLoading,
    imagesUploading,
    setNote,
    setImages,
    addImage,
    removeImage,
    setImagesLoading,
    incrementUploading,
    decrementUploading,
  } = useVenueStore();

  const venueNote = notes[venue.id];
  const venueImages = images[venue.id] || [];
  const uploadingCount = imagesUploading[venue.id] || 0;

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load notes and images on mount
  useEffect(() => {
    loadNotes();
    loadImages();
  }, [venue.id]);

  // Sync local notes with store and track original notes
  useEffect(() => {
    if (venueNote) {
      const noteBody = venueNote.body || '';
      setLocalNotes(noteBody);
      setOriginalNotes(noteBody);
      setHasUnsavedChanges(false);
    }
  }, [venueNote]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(localNotes !== originalNotes);
  }, [localNotes, originalNotes]);

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
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: localNotes }),
      });

      if (response.ok) {
        const data = await response.json();
        setNote(venue.id, data.note || { body: '', venue_id: venue.id });
        setOriginalNotes(localNotes);
        setHasUnsavedChanges(false);

        // Notify parent component of the save
        if (onNoteSaved) {
          onNoteSaved(venue.id, data.note?.body || '', data.note?.id);
        }

        // Close the modal after successful save
        onClose();
      } else {
        alert('Failed to save notes. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }

    // Reset to original notes
    setLocalNotes(originalNotes);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (hasUnsavedChanges || uploadingCount > 0) {
      const message = uploadingCount > 0
        ? 'Images are still uploading. Are you sure you want to close?'
        : 'You have unsaved changes. Are you sure you want to close without saving?';

      const confirmed = confirm(message);
      if (!confirmed) return;
    }

    onClose();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!mounted) return null;

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

      {/* Modal Container */}
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
                  Uploading {uploadingCount} image{uploadingCount !== 1 ? 's' : ''}...
                </span>
              )}
              <button
                onClick={handleClose}
                disabled={isSaving || uploadingCount > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
                  opacity: (isSaving || uploadingCount > 0) ? 0.5 : 1,
                  padding: '0',
                  lineHeight: '1',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            {/* Notes Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                My Notes
                {hasUnsavedChanges && (
                  <span style={{ color: '#dc2626', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                    (Unsaved changes)
                  </span>
                )}
              </h3>
              <textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  backgroundColor: isSaving ? '#f9fafb' : 'white',
                }}
                placeholder="Add your notes about this venue..."
              />
            </div>

            {/* Images Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                  Images ({venueImages.length}/20)
                </h3>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={venueImages.length >= 20}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: venueImages.length >= 20 ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      cursor: venueImages.length >= 20 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Upload Images
                  </button>
                </div>
              </div>

              {imagesLoading[venue.id] ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Loading images...
                </div>
              ) : venueImages.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '1rem',
                }}>
                  {venueImages.map((image, index) => (
                    <div key={image.id} style={{ position: 'relative' }}>
                      <img
                        src={image.url}
                        alt={`Venue image ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => setGalleryIndex(index)}
                      />
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        style={{
                          position: 'absolute',
                          top: '0.25rem',
                          right: '0.25rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  color: '#6b7280',
                }}>
                  No images yet. Click "Upload Images" to add some.
                </div>
              )}
            </div>

            {/* Venue Details */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Venue Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Type:</span>{' '}
                  <span style={{ color: '#6b7280' }}>{venue.type}</span>
                </div>
                <div>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Locality:</span>{' '}
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
                    <a href={venue.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                      Link
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
                {venue.facebook && (
                  <div>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Facebook:</span>{' '}
                    <a href={venue.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                      Link
                    </a>
                  </div>
                )}
                {venue.instagram && (
                  <div>
                    <span style={{ fontWeight: '600', color: '#374151' }}>Instagram:</span>{' '}
                    <a href={`https://instagram.com/${venue.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
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
                    <span style={{ fontWeight: '600', color: '#374151' }}>Map:</span>{' '}
                    <a href={venue.map_link} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                      Open in Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with Save and Cancel buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
          }}>
            <button
              onClick={handleCancel}
              disabled={isSaving || uploadingCount > 0}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || uploadingCount > 0) ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving || uploadingCount > 0}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: (!hasUnsavedChanges || isSaving || uploadingCount > 0) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: (!hasUnsavedChanges || isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
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
          <img
            src={venueImages[galleryIndex]?.url}
            alt="Gallery"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
            }}
          />
          <button
            onClick={() => setGalleryIndex(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'white',
              border: 'none',
              color: '#000',
              fontSize: '2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
