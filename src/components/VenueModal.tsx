'use client';

// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useVenueStore } from '@/lib/store/venueStore';
import { compressImage, validateImageFile } from '@/lib/imageUtils';

export default function VenueModal(props: any) {
  const { venue, onClose, onNoteSaved, onStickerUpdate, mode = 'view', onVenueCreated, userRole } = props;
  const [localNotes, setLocalNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<any>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
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
    imagesLoading,
  } = useVenueStore();

  const venueNote = mode === 'view' ? notes?.[venue?.id] : null;
  const venueImages = mode === 'view' ? (images?.[venue?.id] || []) : [];
  const uploadingCount = imagesUploading?.[venue?.id] || 0;

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load notes, images, and stickers on mount
  useEffect(() => {
    if (mode === 'create') return;
    if (!venue?.id) return;
    loadNotes();
    loadImages();
    loadStickerMeanings();
    loadVenueStickers();
  }, [venue?.id, mode]);

  // Sync local notes with store and track original notes
  useEffect(() => {
    if (mode === 'create') return; // no notes in creation mode
    if (venueNote) {
      const noteBody = venueNote.body || '';
      setLocalNotes(noteBody);
      setOriginalNotes(noteBody);
      setHasUnsavedChanges(false);
      requestAnimationFrame(() => {
        const el = notesTextareaRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
      });
    }
  }, [venueNote, mode]);

  // Track unsaved changes
  useEffect(() => {
    if (mode === 'create') return;
    setHasUnsavedChanges(localNotes !== originalNotes);
    const el = notesTextareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [localNotes, originalNotes, mode]);

  // Initialize sticker form data with next available color
  useEffect(() => {
    setStickerFormData((prev: any) => ({
      ...prev,
      color: getNextAvailableColor()
    }));
  }, [stickerMeanings]);

  // Robust: close context menu when clicking outside, right-clicking elsewhere, pressing Escape, or on scroll
  useEffect(() => {
    if (!contextMenu) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const handleScroll = () => setContextMenu(null);

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll as EventListener);
    };
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
    if (mode === 'create') return; // create uses separate handler
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

  // Creation mode form state
  const [createData, setCreateData] = useState<any>({
    name: '',
    type: 'other',
    region_code: 'BOS',
    locality: '',
    address: '',
    website_url: '',
    public_transit: '',
    map_link: '',
    artist_summary: '',
    visitor_summary: '',
    facebook: '',
    instagram: ''
  });
  const [creating, setCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<string[]>([]);

  const requiredFields = ['name','type','region_code','locality','address','website_url'];
  const validateCreate = () => {
    const errs: string[] = [];
    requiredFields.forEach(f => {
      if (!createData[f] || String(createData[f]).trim() === '') errs.push(f);
    });
    setCreateErrors(errs);
    return errs.length === 0;
  };

  const handleCreateSubmit = async () => {
    if (creating) return;
    if (!validateCreate()) return;
    setCreating(true);
    try {
      const resp = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({error:'Failed'}));
        alert(err.error || 'Failed to create venue');
      } else {
        const data = await resp.json();
        if (onVenueCreated) onVenueCreated(data.venue);
        onClose();
      }
    } catch (e:any) {
      alert(e?.message || 'Failed to create venue');
    } finally {
      setCreating(false);
    }
  };

  const creationBorderColor = userRole === 'admin' ? '#3b82f6' : '#10b981';
  const creationBadge = userRole === 'admin' ? 'Public (admin)' : 'Mine';

  const handleClose = () => {
    if (mode === 'create') {
      onClose();
      return;
    }
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
        incrementUploading?.(venue.id);
        const formData = new FormData(); formData.append('file', file);
        const response = await fetch(`/api/venues/${venue.id}/images`, { method: 'POST', body: formData });
        if (response.ok) {
          const data = await response.json();
          addImage?.(venue.id, data.image);
          try { props?.onImagesChanged && props.onImagesChanged(venue.id, 'added', data.image); } catch {}
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
      if (response.ok) {
        removeImage?.(venue.id, imageId);
        // Notify parent so the table can refresh its thumbnails
        try {
          props?.onImagesChanged && props.onImagesChanged(venue.id, 'removed', imageId);
        } catch (e) {
          console.warn('VenueModal: onImagesChanged callback failed', e);
        }
      }
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

  const handleDeleteStickerMeaning = async (meaning: any) => {
    const confirmed = confirm(`Delete sticker "${meaning.label}"? This will remove it from your stickers list and from any venues where it's assigned.`);
    if (!confirmed) return;
    try {
      // Perform a single, authoritative delete with force=true to avoid multi-step confirms
      const forceResp = await fetch(`/api/stickers/meanings/delete?id=${meaning.id}&force=true`, { method: 'POST' });
      if (forceResp.ok) {
        const data = await forceResp.json().catch(() => ({}));
        await loadStickerMeanings();
        await loadVenueStickers();
        if (onStickerUpdate) {
          const affected: string[] = Array.isArray((data as any).affectedVenueIds) ? (data as any).affectedVenueIds : [];
          if (affected.length > 0) {
            affected.forEach((vid) => { try { onStickerUpdate(vid); } catch {} });
          } else {
            try { onStickerUpdate(venue.id); } catch {}
          }
        }
        return;
      }

      // If force path failed (unexpected), try non-force once and surface server error
      const fallback = await fetch(`/api/stickers/meanings/delete?id=${meaning.id}`, { method: 'POST' });
      if (fallback.ok) {
        await loadStickerMeanings();
        await loadVenueStickers();
        try { onStickerUpdate && onStickerUpdate(venue.id); } catch {}
        return;
      }

      const errData = await fallback.json().catch(() => ({}));
      alert(errData.error || (errData.message) || 'Failed to delete sticker');
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
      const response = await fetch(`/api/stickers/meanings/update?id=${renamingSticker.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: renamingSticker.color, label: renameLabel, details: renamingSticker.details || '' })
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
        <div style={{ backgroundColor: 'white', borderRadius: 8, width: '100%', maxWidth: '56rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', fontFamily: 'Arial, Helvetica, sans-serif', border: mode==='create' ? `3px solid ${creationBorderColor}` : undefined }} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            {mode==='create' ? (
              <div style={{ display:'flex', flexDirection:'column' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Create Venue</h2>
                <span style={{ marginTop:4, fontSize:12, fontStyle:'italic', color:'#6b7280' }}>{creationBadge}</span>
              </div>
            ) : (
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{venue?.name}</h2>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isSaving && mode==='view' && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Saving...</span>}
              {uploadingCount > 0 && mode==='view' && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Uploading {uploadingCount} image{uploadingCount !== 1 ? 's' : ''}...</span>}
              <button onClick={handleClose} disabled={isSaving || uploadingCount > 0} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '2rem', fontWeight: 'bold', cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer', opacity: (isSaving || uploadingCount > 0) ? 0.5 : 1, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            {/* Venue Information Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>Venue Information</h3>
              {mode==='create' ? (
                <div style={{ display:'grid', gap:'0.75rem', fontSize:'0.875rem' }}>
                  <div>
                    <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Name *</label>
                    <input value={createData.name} onChange={e=>setCreateData({...createData,name:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                    {createErrors.includes('name') && <div style={{ color:'#dc2626', fontSize:12 }}>Required</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Type *</label>
                    <select value={createData.type} onChange={e=>setCreateData({...createData,type:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }}>
                      <option value="gallery - commercial">gallery - commercial</option>
                      <option value="gallery - non-profit">gallery - non-profit</option>
                      <option value="library">library</option>
                      <option value="cafe-restaurant">cafe-restaurant</option>
                      <option value="association">association</option>
                      <option value="market">market</option>
                      <option value="store">store</option>
                      <option value="online">online</option>
                      <option value="open studios">open studios</option>
                      <option value="public art">public art</option>
                      <option value="other">other</option>
                    </select>
                    {createErrors.includes('type') && <div style={{ color:'#dc2626', fontSize:12 }}>Required</div>}
                  </div>
                  <div style={{ display:'flex', gap:'0.75rem' }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Region Code *</label>
                      <select value={createData.region_code} onChange={e=>setCreateData({...createData,region_code:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }}>
                        <option value="BOS">BOS</option>
                        <option value="LA">LA</option>
                        <option value="NYC">NYC</option>
                      </select>
                      {createErrors.includes('region_code') && <div style={{ color:'#dc2626', fontSize:12 }}>Required</div>}
                    </div>
                    <div style={{ flex:2 }}>
                      <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Locality *</label>
                      <input value={createData.locality} onChange={e=>setCreateData({...createData,locality:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                      {createErrors.includes('locality') && <div style={{ color:'#dc2626', fontSize:12 }}>Required</div>}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Address *</label>
                    <input value={createData.address} onChange={e=>setCreateData({...createData,address:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                    {createErrors.includes('address') && <div style={{ color:'#dc2626', fontSize:12 }}>Required</div>}
                  </div>
                  <div>
                    <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Website URL *</label>
                    <input value={createData.website_url} onChange={e=>setCreateData({...createData,website_url:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} placeholder="https://" />
                    {createErrors.includes('website_url') && <div style={{ color:'#dc2626', fontSize:12 }}>Required</div>}
                  </div>
                  <div style={{ display:'flex', gap:'0.75rem' }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Public Transit</label>
                      <input value={createData.public_transit} onChange={e=>setCreateData({...createData,public_transit:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Map Link</label>
                      <input value={createData.map_link} onChange={e=>setCreateData({...createData,map_link:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Artist Summary</label>
                    <textarea value={createData.artist_summary} onChange={e=>setCreateData({...createData,artist_summary:e.target.value})} style={{ width:'100%', minHeight:80, padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                  </div>
                  <div>
                    <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Visitor Summary</label>
                    <textarea value={createData.visitor_summary} onChange={e=>setCreateData({...createData,visitor_summary:e.target.value})} style={{ width:'100%', minHeight:80, padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                  </div>
                  <div style={{ display:'flex', gap:'0.75rem' }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Facebook</label>
                      <input value={createData.facebook} onChange={e=>setCreateData({...createData,facebook:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ fontWeight:600, display:'block', marginBottom:4 }}>Instagram</label>
                      <input value={createData.instagram} onChange={e=>setCreateData({...createData,instagram:e.target.value})} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6 }} />
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
             </div>

            {/* Sticker Management Section */}
            {mode==='view' && (
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
                        e.stopPropagation();
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
            )}

            {/* Notes Section (hidden in create mode) */}
            {mode==='view' && (
             <div style={{ marginBottom: '2rem' }}>
               <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>My Notes {hasUnsavedChanges && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(Unsaved changes)</span>}</h3>
               <textarea
                ref={notesTextareaRef}
                value={localNotes}
                onChange={(e) => {
                  handleNotesChange(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }}
                disabled={isSaving}
                rows={3}
                style={{ width: '100%', height: 'auto', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', resize: 'none', outline: 'none', backgroundColor: isSaving ? '#f9fafb' : 'white', overflow: 'hidden' }}
                placeholder="Add your notes about this venue..."
                onFocus={() => {
                  const el = notesTextareaRef.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                }}
              />

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
            )}

            {/* Images Section (hidden in create mode) */}
            {mode==='view' && (
             <div style={{ marginBottom: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                 <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Images ({venueImages.length}/20)</h3>
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   style={{
                     padding: '0.375rem 0.75rem',
                     backgroundColor: '#3b82f6',
                     color: 'white',
                     border: 'none',
                     borderRadius: 6,
                     fontSize: '0.875rem',
                     fontWeight: 500,
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '0.25rem'
                   }}
                 >
                   <span style={{ fontSize: '0.875rem' }}>+</span> Add Image
                 </button>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                 {venueImages.map((image) => (
                   <div key={image.id} style={{ position: 'relative', cursor: 'pointer', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3' }}>
                     <img
                       src={image.url}
                       alt={image.filename}
                       style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                       onClick={() => {
                         setClickedImageId(image.id);
                         setHoveredImageId(null);
                       }}
                       onMouseEnter={() => setHoveredImageId(image.id)}
                       onMouseLeave={() => setHoveredImageId(null)}
                     />
                     {hoveredImageId === image.id && (
                       <div style={{
                         position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                         backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         fontSize: '0.875rem', fontWeight: 500, color: 'white'
                       }}>
                         View Image
                       </div>
                     )}
                     {clickedImageId === image.id && (
                       <div style={{
                         position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white',
                         padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer'
                       }} onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}>
                         Delete
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
            )}

            {mode==='create' && (
              <div style={{ marginTop:'1rem' }}>
                <button
                  onClick={handleCreateSubmit}
                  disabled={creating}
                  style={{
                    padding:'0.6rem 1.25rem',
                    backgroundColor: creating ? '#9ca3af' : creationBorderColor,
                    color:'white',
                    border:'none',
                    borderRadius:6,
                    fontSize:'0.875rem',
                    fontWeight:600,
                    cursor: creating ? 'not-allowed':'pointer'
                  }}
                >{creating ? 'Creating...' : 'Create Venue'}</button>
              </div>
            )}

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
                disabled={mode==='view' && (isSaving || uploadingCount > 0)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: mode==='create' ? '#6b7280' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (mode==='view' && (isSaving || uploadingCount > 0)) ? 'not-allowed' : 'pointer',
                  opacity: (mode==='view' && (isSaving || uploadingCount > 0)) ? 0.5 : 1,
                  transition: 'background-color 0.2s'
                }}
              >
                {mode==='create' ? 'Cancel' : 'Close'}
              </button>
              </div>
          </div>
        </div> {/* end inner modal */}
      </div> {/* end modal container */}

      {/* Context Menu for Sticker Rename/Delete */}
      {contextMenu && mode==='view' && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            zIndex: 10000,
            padding: '0.5rem',
            fontSize: '0.875rem',
            border: '1px solid #e5e7eb'
          }}
        >
          <div
            onClick={() => {
              setContextMenu(null);
              const meaning = contextMenu.meaning;
              if (meaning) {
                setRenamingSticker(meaning);
                setRenameLabel(meaning.label);
                setShowRenameStickerDialog(true);
              }
            }}
            style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', borderRadius: 4, transition: 'background-color 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            Rename Sticker
          </div>
          <div
            onClick={() => {
              setContextMenu(null);
              const meaning = contextMenu.meaning;
              if (meaning) handleDeleteStickerMeaning(meaning);
            }}
            style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', borderRadius: 4, transition: 'background-color 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            Delete Sticker
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
 }
