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
  const [galleryIndex, setGalleryIndex] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<any>(null);

  // Sticker-related state
  const [stickerMeanings, setStickerMeanings] = useState<any[]>([]);
  const [assignedStickers, setAssignedStickers] = useState<any[]>([]);
  const [showCreateStickerDialog, setShowCreateStickerDialog] = useState(false);
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
        setOriginalNotes(localNotes);
        setHasUnsavedChanges(false);
        if (onNoteSaved) onNoteSaved(venue.id, data.note?.body || '', data.note?.id);
        onClose();
      } else {
        alert('Failed to save notes. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    setLocalNotes(originalNotes); setHasUnsavedChanges(false); onClose();
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
    if (venueImages.length + files.length > 20) { alert(`Maximum 20 images allowed. You can upload ${20 - venueImages.length} more.`); return; }
    for (const f of Array.from(files)) {
      const file: any = f;
      const validationError = validateImageFile(file, 1);
      if (validationError) { alert(`${file.name}: ${validationError}`); continue; }
      try { incrementUploading?.(venue.id); const compressed = await compressImage(file, 100, 1200); validFiles.push(compressed); } catch (err) { console.error('Failed to compress image:', err); alert(`Failed to compress ${file.name}`); decrementUploading?.(venue.id); }
    }
    for (const file of validFiles) {
      try {
        const formData = new FormData(); formData.append('file', file);
        const response = await fetch(`/api/venues/${venue.id}/images`, { method: 'POST', body: formData });
        if (response.ok) { const data = await response.json(); addImage?.(venue.id, data.image); } else { alert(`Failed to upload ${file.name}`); }
      } catch (err) { console.error('Failed to upload image:', err); alert(`Failed to upload ${file.name}`); } finally { decrementUploading?.(venue.id); }
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
            {/* Notes Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>My Notes {hasUnsavedChanges && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(Unsaved changes)</span>}</h3>
              <textarea value={localNotes} onChange={(e) => handleNotesChange(e.target.value)} disabled={isSaving} style={{ width: '100%', minHeight: 200, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', resize: 'vertical', outline: 'none', backgroundColor: isSaving ? '#f9fafb' : 'white' }} placeholder="Add your notes about this venue..." />
            </div>

            {/* Sticker Management Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Stickers</h3>

              {/* Available Stickers Row */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Available:</span>
                  <button onClick={() => setShowCreateStickerDialog(true)} style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ fontSize: '0.875rem' }}>+</span> New</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: 32 }}>
                  {(stickerMeanings || []).map((meaning) => (
                    <div key={meaning.id} onClick={() => handleAssignSticker(meaning.id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0.375rem 0.75rem', backgroundColor: meaning.color, borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', opacity: assignedStickerIds.has(meaning.id) ? 0.5 : 1, border: '1px solid rgba(0,0,0,0.1)' }} title={meaning.details || meaning.label}>
                      <span>{meaning.label}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteStickerMeaning(meaning); }} style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
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

            {/* Images Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Images ({venueImages.length}/20)</h3>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleImageUpload(e.target.files)} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={venueImages.length >= 20} style={{ padding: '0.5rem 1rem', backgroundColor: venueImages.length >= 20 ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.875rem', cursor: venueImages.length >= 20 ? 'not-allowed' : 'pointer' }}>Upload Images</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                {venueImages.map((image) => (
                  <div key={image.id} style={{ position: 'relative' }}>
                    <img src={image.url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }} onClick={() => setGalleryIndex(image.id)} />
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }} style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 14, cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Unsplash Gallery Section */}
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Image Gallery</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setGalleryIndex(0)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>View All</span>
                </button>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
                  {venueImages.slice(0, 5).map((image) => (
                    <div
                      key={image.id}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        borderRadius: 6,
                        overflow: 'hidden',
                        aspectRatio: '1 / 1',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                      onClick={() => setGalleryIndex(image.id)}
                    >
                      <img
                        src={image.url}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={handleCancel}
                disabled={isSaving || uploadingCount > 0}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 500,
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
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (!hasUnsavedChanges || isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {galleryIndex !== null && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setGalleryIndex(null)}>
          <img src={venueImages.find(img=>img.id===galleryIndex)?.url} alt="Gallery" style={{ maxWidth:'90%', maxHeight:'90%', objectFit:'contain' }} />
          <button onClick={() => setGalleryIndex(null)} style={{ position:'absolute', top: '1rem', right:'1rem', background:'white', border:'none', color:'#000', fontSize:'2rem', fontWeight:'bold', cursor:'pointer', width:48, height:48, borderRadius:24 }}>×</button>
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

    </>
  );

  return createPortal(modalContent, document.body);
}
