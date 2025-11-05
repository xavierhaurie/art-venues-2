'use client';

// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useVenueStore } from '@/lib/store/venueStore';
import { compressImage, validateImageFile } from '@/lib/imageUtils';

export default function VenueModal(props: any) {
  const { venue, onClose, onNoteSaved, onStickerUpdate } = props;
  const [localNotes, setLocalNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<any>(null);

  // Image display state
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [clickedImageId, setClickedImageId] = useState<string | null>(null);

  // Sticker-related state
  const [stickerMeanings, setStickerMeanings] = useState<any[]>([]);
  const [assignedStickers, setAssignedStickers] = useState<any[]>([]);
  const [showCreateStickerDialog, setShowCreateStickerDialog] = useState(false);
  const [showRenameStickerDialog, setShowRenameStickerDialog] = useState(false);
  const [renamingSticker, setRenamingSticker] = useState<any | null>(null);
  const [renameLabel, setRenameLabel] = useState('');

  // Context menu state for sticker deletion
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, meaningId: string, meaning: any} | null>(null);
  const [stickerFormData, setStickerFormData] = useState<any>({
    color: '#ADD8E6',
    label: '',
    details: ''
  });

  const {
    notes,
    images,
    imagesUploading,
    setNote,
    setImages,
    addImage,
    removeImage,
    setImagesLoading,
    incrementUploading,
    decrementUploading,
  } = useVenueStore();

  const venueNote = notes?.[venue?.id];
  const venueImages = images?.[venue?.id] || [];
  const uploadingCount = imagesUploading?.[venue?.id] || 0;

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load notes, images, and stickers on mount
  useEffect(() => {
    if (!venue?.id) return;
    loadNotes();
    loadImages();
    loadStickerMeanings();
    loadVenueStickers();
  }, [venue?.id]);

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

  // Initialize sticker form data with next available color
  useEffect(() => {
    setStickerFormData((prev: any) => ({
      ...prev,
      color: getNextAvailableColor()
    }));
  }, [stickerMeanings]);

  // Close context menu on click anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/venues/${venue.id}/notes`);
      if (response.ok) {
        const data = await response.json();
        if (data.note) setNote(venue.id, data.note);
        else setNote(venue.id, { body: '', venue_id: venue.id });
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const loadImages = async () => {
    setImagesLoading?.(venue.id, true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages?.(venue.id, data.images || []);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setImagesLoading?.(venue.id, false);
    }
  };

  const loadStickerMeanings = async () => {
    try {
      const response = await fetch('/api/stickers/meanings');
      if (response.ok) {
        const data = await response.json();
        setStickerMeanings(data.meanings || []);
      }
    } catch (err) {
      console.error('Failed to load sticker meanings:', err);
    }
  };

  const loadVenueStickers = async () => {
    try {
      const response = await fetch(`/api/venues/${venue.id}/stickers`);
      if (response.ok) {
        const data = await response.json();
        setAssignedStickers(data.stickers || []);
      }
    } catch (err) {
      console.error('Failed to load venue stickers:', err);
    }
  };

  const handleNotesChange = (value: any) => setLocalNotes(value);
  const handleKeyDown = (e: any) => { if (e.key === 'Escape') handleClose(); };

  const handleSave = async () => {
    if (!hasUnsavedChanges || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: localNotes })
      });
      if (response.ok) {
        const data = await response.json();
        setNote(venue.id, data.note || { body: '', venue_id: venue.id });
        // Do not close the modal after saving — only update the originalNotes so Save notes becomes disabled
        setOriginalNotes(localNotes);
        setHasUnsavedChanges(false);
        if (onNoteSaved) onNoteSaved(venue.id, data.note?.body || '', data.note?.id);
        // removed onClose() per request
      } else {
        alert('Failed to save notes. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleClose = () => {
    if (hasUnsavedChanges || uploadingCount > 0) {
      const message = uploadingCount > 0 ? 'Images are still uploading. Are you sure you want to close?' : 'You have unsaved changes. Are you sure you want to close without saving?';
      const confirmed = confirm(message);
      if (!confirmed) return;
    }
    onClose();
  };

  const handleImageUpload = async (files: any) => {
    const validFiles: any[] = [];
    if (venueImages.length + files.length > 20) {
      alert(`Maximum 20 images allowed. You can upload ${20 - venueImages.length} more.`);
      return;
    }

    for (const f of Array.from(files)) {
      let file: any = f;
      // If browser didn't set file.type, infer it from extension to avoid validation/upload issues
      if (!file.type) {
        const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop().toLowerCase() : '';
        const extMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
        const inferred = extMap[ext] || '';
        if (inferred) {
          try {
            file = new File([file], file.name, { type: inferred });
            console.debug('VenueModal: inferred mime type for file', file.name, inferred);
          } catch (e) {
            // If File constructor fails, continue with original file and validation may fail
            console.warn('VenueModal: failed to create typed File for', file.name, e);
          }
        }
      }
      // Allow larger inputs (we'll compress), validate up to 5MB
      const validationError = validateImageFile(file, 5);
      if (validationError) { alert(`${file.name}: ${validationError}`); continue; }

      console.debug('VenueModal: preparing upload for file', { name: file.name, type: file.type, size: file.size });

      // If SVG, skip compression (canvas-based compression doesn't handle SVG reliably)
      if (file.type === 'image/svg+xml') {
        validFiles.push(file);
        continue;
      }

      try {
        const compressed = await compressImage(file, 100, 1200);
        validFiles.push(compressed);
      } catch (err) {
        console.warn('VenueModal: compression failed, falling back to original file for upload', file.name, err);
        // Fall back to uploading the original file if compression fails
        validFiles.push(file);
      }
    }

    for (const file of validFiles) {
      try {
        // Increment per-file upload counter so UI reflects active uploads accurately
        incrementUploading?.(venue.id);
        const formData = new FormData(); formData.append('file', file);
        console.debug('VenueModal: uploading file', { name: file.name, type: file.type, size: file.size });
        const response = await fetch(`/api/venues/${venue.id}/images`, { method: 'POST', body: formData });
        if (response.ok) {
          const data = await response.json();
          addImage?.(venue.id, data.image);
        } else {
          // Try to parse response body for a helpful error message
          let msg = `Failed to upload ${file.name}`;
          try {
            const errBody = await response.json();
            msg = errBody.error || errBody.message || msg;
            console.error('VenueModal: upload error response', response.status, errBody);
          } catch (parseErr) {
            const text = await response.text().catch(() => '');
            console.error('VenueModal: upload error non-json response', response.status, text);
            if (text) msg = text;
          }
          alert(`${file.name}: ${msg}`);
        }
      } catch (err) {
        console.error('Failed to upload image:', err);
        const emsg = (err as any)?.message || String(err);
        alert(`Failed to upload ${file.name}: ${emsg}`);
      } finally {
        decrementUploading?.(venue.id);
      }
    }
  };

  const handleDeleteImage = async (imageId: any) => {
    if (!confirm('Delete this image?')) return;
    try {
      const response = await fetch(`/api/venues/${venue.id}/images/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId }) });
      if (response.ok) removeImage?.(venue.id, imageId);
    } catch (err) { console.error('Failed to delete image:', err); }
  };

  const getNextAvailableColor = () => {
    const defaultColors = ['#ADD8E6', '#FFB366', '#FFFF99', '#FFB3B3', '#D3D3D3'];
    const usedColors = new Set((stickerMeanings || []).map(s => s?.color));
    for (const color of defaultColors) if (!usedColors.has(color)) return color;
    const hue = Math.floor(Math.random() * 360); return `hsl(${hue}, 50%, 85%)`;
  };

  const handleAssignSticker = async (stickerMeaningId: any) => {
    try {
      const response = await fetch(`/api/venues/${venue.id}/stickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', stickerMeaningId })
      });

      if (response.ok) {
        await loadVenueStickers();
        if (onStickerUpdate) {
          console.debug('VenueModal: calling onStickerUpdate for assign', venue.id, stickerMeaningId);
          onStickerUpdate(venue.id);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to assign sticker');
      }
    } catch (error) {
      console.error('Failed to assign sticker:', error);
      alert('Failed to assign sticker');
    }
  };

  const handleUnassignSticker = async (stickerMeaningId: any) => {
    try {
      const response = await fetch(`/api/venues/${venue.id}/stickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign', stickerMeaningId })
      });

      if (response.ok) {
        await loadVenueStickers();
        if (onStickerUpdate) {
          console.debug('VenueModal: calling onStickerUpdate for unassign', venue.id, stickerMeaningId);
          onStickerUpdate(venue.id);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to unassign sticker');
      }
    } catch (error) {
      console.error('Failed to unassign sticker:', error);
      alert('Failed to unassign sticker');
    }
  };

  const handleCreateStickerMeaning = async () => {
    if (!stickerFormData.label?.trim()) { alert('Label is required'); return; }
    if (stickerFormData.label.length > 15) { alert('Label must be 15 characters or less'); return; }
    if (stickerFormData.details && stickerFormData.details.length > 1000) { alert('Details must be 1000 characters or less'); return; }
    try {
      const response = await fetch('/api/stickers/meanings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stickerFormData) });
      if (response.ok) { await loadStickerMeanings(); setShowCreateStickerDialog(false); setStickerFormData({ color: getNextAvailableColor(), label: '', details: '' }); if (onStickerUpdate) { console.debug('VenueModal: calling onStickerUpdate for create meaning', venue.id); onStickerUpdate(venue.id); } }
      else { const errorData = await response.json(); alert(errorData.error || 'Failed to create sticker'); }
    } catch (err) { console.error('Failed to create sticker:', err); alert('Failed to create sticker'); }
  };

  // handleDeleteStickerMeaning supports force delete
  const handleDeleteStickerMeaning = async (meaning: any) => {
    if (!confirm(`Delete sticker "${meaning.label}"? This will also remove all assignments of this sticker to venues.`)) return;
    try {
      const response = await fetch(`/api/stickers/meanings/delete?id=${meaning.id}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadStickerMeanings();
        await loadVenueStickers();
        if (onStickerUpdate) {
          console.debug('VenueModal: calling onStickerUpdate after delete (no assignments)', venue.id);
          onStickerUpdate(venue.id);
        }
        return;
      }

      const errorData = await response.json();
      if (errorData.hasAssignments) {
        const confirmed = confirm('This sticker is assigned to venues. Delete all assignments and the sticker?\n\nThis will remove the sticker from all venues permanently.');
        if (!confirmed) return;

        // Attempt force delete
        try {
          const forceResp = await fetch(`/api/stickers/meanings/delete?id=${meaning.id}&force=true`, {
            method: 'POST'
          });

          if (forceResp.ok) {
            // Server returns affectedVenueIds for force deletes
            const data = await forceResp.json();
            await loadStickerMeanings();
            await loadVenueStickers();

            if (onStickerUpdate) {
              // If server provided a list of affected venue ids, notify parent for each
              const affected: string[] = Array.isArray(data.affectedVenueIds) ? data.affectedVenueIds : [];
              console.debug('VenueModal: force delete affectedVenueIds=', affected);

              if (affected.length > 0) {
                affected.forEach((vid) => {
                  try {
                    console.debug('VenueModal: calling onStickerUpdate for affected venue', vid);
                    onStickerUpdate(vid);
                  } catch (e) { console.error('onStickerUpdate failed for venue', vid, e); }
                });
              } else {
                // Fallback: refresh current venue
                try { console.debug('VenueModal: force delete returned no ids, falling back to current venue', venue.id); onStickerUpdate(venue.id); } catch (e) { console.error('onStickerUpdate failed for current venue', e); }
              }
            }

            return;
          }

          const forceData = await forceResp.json();
          alert(forceData.error || 'Failed to force delete sticker');
        } catch (err) {
          console.error('Force delete failed:', err);
          alert('Failed to force delete sticker');
        }
      } else {
        alert(errorData.error || 'Failed to delete sticker');
      }
    } catch (error) {
      console.error('Failed to delete sticker:', error);
      alert('Failed to delete sticker');
    }
  };

  const handleRenameStickerMeaning = async () => {
    if (!renamingSticker) return;
    if (!renameLabel.trim()) {
      alert('Label cannot be empty');
      return;
    }
    if (renameLabel.length > 15) {
      alert('Label must be 15 characters or less');
      return;
    }

    try {
      const response = await fetch(`/api/stickers/meanings/${renamingSticker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: renameLabel })
      });

      if (response.ok) {
        await loadStickerMeanings();
        await loadVenueStickers();
        setShowRenameStickerDialog(false);
        setRenamingSticker(null);
        setRenameLabel('');
        if (onStickerUpdate) {
          console.debug('VenueModal: calling onStickerUpdate after rename', venue.id);
          onStickerUpdate(venue.id);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to rename sticker');
      }
    } catch (err) {
      console.error('Failed to rename sticker:', err);
      alert('Failed to rename sticker');
    }
  };

  const assignedStickerIds = new Set((assignedStickers || []).map(s => s?.sticker_meaning_id));

  if (!mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }} onClick={handleClose} />

      {/* Modal Container */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }} onKeyDown={handleKeyDown}>
        <div style={{ backgroundColor: 'white', borderRadius: 8, width: '100%', maxWidth: '56rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', fontFamily: 'Arial, Helvetica, sans-serif' }} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{venue?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isSaving && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Saving...</span>}
              {uploadingCount > 0 && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Uploading {uploadingCount} image{uploadingCount !== 1 ? 's' : ''}...</span>}
              <button onClick={handleClose} disabled={isSaving || uploadingCount > 0} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '2rem', fontWeight: 'bold', cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer', opacity: (isSaving || uploadingCount > 0) ? 0.5 : 1, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            {/* Venue Information Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>Venue Information</h3>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                <div style={{ marginBottom: '0.5rem' }}><strong>Name:</strong> {venue?.name}</div>
                <div style={{ marginBottom: '0.5rem' }}><strong>Type:</strong> {venue?.type}</div>
                <div style={{ marginBottom: '0.5rem' }}><strong>Locality:</strong> {venue?.locality}</div>
                <div style={{ marginBottom: '0.5rem' }}><strong>Region:</strong> {venue?.region_code}</div>
                {venue?.address && <div style={{ marginBottom: '0.5rem' }}><strong>Address:</strong> {venue.address}</div>}
                {venue?.website_url && <div style={{ marginBottom: '0.5rem' }}><strong>Website:</strong> <a href={venue.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>{venue.website_url}</a></div>}
                {venue?.facebook && <div style={{ marginBottom: '0.5rem' }}><strong>Facebook:</strong> <a href={venue.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>{venue.facebook}</a></div>}
                {venue?.instagram && <div style={{ marginBottom: '0.5rem' }}><strong>Instagram:</strong> <a href={venue.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>{venue.instagram}</a></div>}
                {venue?.public_transit && <div style={{ marginBottom: '0.5rem' }}><strong>Public Transit:</strong> {venue.public_transit}</div>}
                {venue?.map_link && <div style={{ marginBottom: '0.5rem' }}><strong>Map:</strong> <a href={venue.map_link} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>View on Map</a></div>}
                {venue?.artist_summary && <div style={{ marginBottom: '0.5rem' }}><strong>Artist Summary:</strong> {venue.artist_summary}</div>}
                {venue?.visitor_summary && <div style={{ marginBottom: '0.5rem' }}><strong>Visitor Summary:</strong> {venue.visitor_summary}</div>}
                <div style={{ marginBottom: '0.5rem' }}><strong>Claim Status:</strong> {venue?.claim_status}</div>
              </div>
            </div>

            {/* Sticker Management Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Stickers</h3>

              {/* Available Stickers Row */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Available:</span>
                  <button onClick={() => setShowCreateStickerDialog(true)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ fontSize: '0.875rem' }}>+</span> New</button>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>Right-click to remove</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: 32 }}>
                  {(stickerMeanings || []).map((meaning) => (
                    <div
                      key={meaning.id}
                      onClick={() => handleAssignSticker(meaning.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, meaningId: meaning.id, meaning });
                      }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.375rem 0.75rem',
                        backgroundColor: meaning.color,
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: assignedStickerIds.has(meaning.id) ? 0.5 : 1,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                      title={meaning.details || meaning.label}
                    >
                      <span>{meaning.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Stickers Row */}
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Assigned to this venue:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: 32 }}>
                  {(assignedStickers || []).map((sticker) => (
                    <div key={sticker.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0.375rem 0.75rem', backgroundColor: sticker.color, borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, border: '1px solid rgba(0,0,0,0.1)' }} title={sticker.details || sticker.label}>
                      <span>{sticker.label}</span>
                      <button onClick={() => handleUnassignSticker(sticker.sticker_meaning_id)} style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>My Notes {hasUnsavedChanges && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(Unsaved changes)</span>}</h3>
              <textarea value={localNotes} onChange={(e) => handleNotesChange(e.target.value)} disabled={isSaving} style={{ width: '100%', minHeight: 200, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', resize: 'vertical', outline: 'none', backgroundColor: isSaving ? '#f9fafb' : 'white' }} placeholder="Add your notes about this venue..." />

              {/* Reset + Save notes buttons */}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setLocalNotes(originalNotes); setHasUnsavedChanges(false); }}
                  disabled={isSaving || uploadingCount > 0}
                  style={{
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving || uploadingCount > 0}
                  style={{
                    padding: '0.4rem 0.75rem',
                    backgroundColor: (!hasUnsavedChanges || isSaving || uploadingCount > 0) ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: (!hasUnsavedChanges || isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save notes'}
                </button>
              </div>
            </div>

            {/* Images Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Images ({venueImages.length}/20)</h3>
                {/* Place Upload input/button immediately to the right of the header */}
                <input ref={fileInputRef} id={`upload-${venue?.id}`} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleImageUpload(e.target.files)} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={venueImages.length >= 20} style={{ padding: '0.4rem 0.75rem', backgroundColor: venueImages.length >= 20 ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.875rem', cursor: venueImages.length >= 20 ? 'not-allowed' : 'pointer' }}>Upload Images</button>
              </div>

              {/* Thumbnails - wrapping rows, 100px max dimension */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                {venueImages.map((image) => (
                  <div
                    key={image.id}
                    style={{ position: 'relative', flex: '0 0 auto' }}
                    onMouseEnter={() => setHoveredImageId(image.id)}
                    onMouseLeave={() => setHoveredImageId(null)}
                    onClick={() => setClickedImageId(image.id)}
                  >
                    <img
                      src={image.url}
                      alt=""
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'block',
                        border: (hoveredImageId === image.id || clickedImageId === image.id) ? '3px solid #3b82f6' : '1px solid #e5e7eb'
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id);
                      }}
                      style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Full-size image display area - shows hovered or clicked image, or placeholder */}
              {venueImages.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: 8, marginTop: '0.75rem' }}>
                  {(hoveredImageId || clickedImageId) ? (
                    <img
                      src={venueImages.find(img => img.id === (hoveredImageId || clickedImageId))?.url}
                      alt="Full size"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '800px',
                        width: 'auto',
                        height: 'auto',
                        borderRadius: 8,
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        maxWidth: '800px',
                        maxHeight: '800px',
                        backgroundColor: '#d1d5db',
                        border: '2px dashed #9ca3af',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        color: '#6b7280',
                        fontWeight: 500
                      }}
                    >
                      Hover over or click a thumbnail
                    </div>
                  )}
                </div>
              )}
            </div>

             {/* Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleClose}
                disabled={isSaving || uploadingCount > 0}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
                  opacity: (isSaving || uploadingCount > 0) ? 0.5 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving && uploadingCount === 0) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving && uploadingCount === 0) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu for Sticker Deletion */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 10002,
            minWidth: 120,
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => {
              setRenamingSticker(contextMenu.meaning);
              setRenameLabel(contextMenu.meaning.label);
              setShowRenameStickerDialog(true);
              setContextMenu(null);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              color: '#374151',
              fontWeight: 500,
              transition: 'background-color 0.2s',
              borderBottom: '1px solid #e5e7eb'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Rename
          </div>
          <div
            onClick={() => {
              handleDeleteStickerMeaning(contextMenu.meaning);
              setContextMenu(null);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              color: '#dc2626',
              fontWeight: 500,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Remove
          </div>
        </div>
      )}

      {/* Create Sticker Dialog */}
      {showCreateStickerDialog && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.7)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setShowCreateStickerDialog(false)}>
          <div onClick={(e)=>e.stopPropagation()} style={{ background:'white', borderRadius:8, padding:24, maxWidth:400, width:'100%', boxShadow:'0 10px 20px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize:18, fontWeight:600, margin:0, marginBottom:12 }}>Create New Sticker</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:14, fontWeight:500, marginBottom:6 }}>Label</label>
              <input type="text" value={stickerFormData.label} onChange={(e)=>setStickerFormData({...stickerFormData, label: e.target.value})} placeholder="Enter sticker label" style={{ width:'100%', padding:12, border:'1px solid #d1d5db', borderRadius:6 }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:14, fontWeight:500, marginBottom:6 }}>Details (optional)</label>
              <textarea value={stickerFormData.details} onChange={(e)=>setStickerFormData({...stickerFormData, details: e.target.value})} style={{ width:'100%', minHeight:100, padding:12, border:'1px solid #d1d5db', borderRadius:6 }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:14, fontWeight:500, marginBottom:6 }}>Color</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={stickerFormData.color} onChange={(e)=>setStickerFormData({...stickerFormData, color: e.target.value})} style={{ width:40, height:40, border:'none', borderRadius:6 }} />
                <span style={{ fontSize:12, color:'#6b7280' }}>Pick a color for the sticker</span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
              <button onClick={()=>setShowCreateStickerDialog(false)} style={{ padding:'0.5rem 1.5rem', background:'white', border:'1px solid #d1d5db', borderRadius:6 }}>Cancel</button>
              <button onClick={handleCreateStickerMeaning} style={{ padding:'0.5rem 1.5rem', background:'#3b82f6', color:'white', border:'none', borderRadius:6 }}>Create Sticker</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Sticker Dialog */}
      {showRenameStickerDialog && renamingSticker && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.7)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>{setShowRenameStickerDialog(false); setRenamingSticker(null); setRenameLabel('');}}>
          <div onClick={(e)=>e.stopPropagation()} style={{ background:'white', borderRadius:8, padding:24, maxWidth:400, width:'100%', boxShadow:'0 10px 20px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize:18, fontWeight:600, margin:0, marginBottom:12 }}>Rename Sticker</h3>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:14, fontWeight:500, marginBottom:6 }}>New Label</label>
              <input
                type="text"
                value={renameLabel}
                onChange={(e)=>setRenameLabel(e.target.value)}
                placeholder="Enter new sticker label"
                style={{ width:'100%', padding:12, border:'1px solid #d1d5db', borderRadius:6 }}
                maxLength={15}
                autoFocus
              />
              <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>
                {renameLabel.length}/15 characters
              </div>
            </div>
            <div style={{ marginBottom:12, padding:12, backgroundColor:'#f9fafb', borderRadius:6 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#6b7280', marginBottom:4 }}>Current name:</div>
              <div style={{ fontSize:14, color:'#374151' }}>{renamingSticker.label}</div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
              <button
                onClick={()=>{setShowRenameStickerDialog(false); setRenamingSticker(null); setRenameLabel('');}}
                style={{ padding:'0.5rem 1.5rem', background:'white', border:'1px solid #d1d5db', borderRadius:6, cursor:'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameStickerMeaning}
                disabled={!renameLabel.trim() || renameLabel === renamingSticker.label}
                style={{
                  padding:'0.5rem 1.5rem',
                  background: !renameLabel.trim() || renameLabel === renamingSticker.label ? '#9ca3af' : '#3b82f6',
                  color:'white',
                  border:'none',
                  borderRadius:6,
                  cursor: !renameLabel.trim() || renameLabel === renamingSticker.label ? 'not-allowed' : 'pointer',
                  opacity: !renameLabel.trim() || renameLabel === renamingSticker.label ? 0.6 : 1
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );

  return createPortal(modalContent, document.body);
}
