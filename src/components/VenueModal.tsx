'use client';

// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useVenueStore } from '@/lib/store/venueStore';
import { compressImage, validateImageFile } from '@/lib/imageUtils';
import LocalityPickerModal from '@/components/LocalityPickerModal';
import TypePickerModal from '@/components/TypePickerModal';
import { useImageConfig } from '@/lib/hooks/useImageConfig';

// Helper component for the portal pattern
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}

// Pure UI component - receives all state and handlers as props
function VenueModalUI(props: any) {
  const {
    venue, mode, localNotes, originalNotes, hasUnsavedChanges, isSaving, uploadingCount, venueImages, stickerMeanings, assignedStickers, assignedStickerIds, contextMenu, createData, createErrors, creating, creationBorderColor, creationBadge,
    editData, editErrors, editingSaving, handleEditSubmit, setEditData,
    handleClose, handleNotesChange, handleSave, handleCreateSubmit, handleAssignSticker, handleUnassignSticker, handleDeleteImage, handleImageUpload, handleCreateStickerMeaning, handleDeleteStickerMeaning, handleRenameStickerMeaning,
    setContextMenu, setCreateData, setShowCreateStickerDialog, setShowRenameStickerDialog, setRenamingSticker, setRenameLabel, renamingSticker, renameLabel, showCreateStickerDialog, showRenameStickerDialog,
    stickerFormData, setStickerFormData,
    notesTextareaRef, fileInputRef, contextMenuRef,
    showLocalitySelect, setShowLocalitySelect, localities, showRegionSelect, setShowRegionSelect, regions,
    showTypeSelect, setShowTypeSelect,
    deletingStickerId,
    loadingStickerMeanings, loadingAssignedStickers,
    isImagesLoading,
    maxImageCount,
    handleOpenFileDialog,
    handleResetNotes
  } = props;

  // Full-size image preview state
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [clickedImageId, setClickedImageId] = useState<string | null>(null);

  // Clear stale selections if images change
  useEffect(() => {
    if (clickedImageId && !venueImages.find((img: any) => img.id === clickedImageId)) {
      setClickedImageId(null);
    }
    if (hoveredImageId && !venueImages.find((img: any) => img.id === hoveredImageId)) {
      setHoveredImageId(null);
    }
  }, [venueImages, clickedImageId, hoveredImageId]);

  const activePreviewId = hoveredImageId || clickedImageId;
  const activePreviewImage = activePreviewId ? venueImages.find((img: any) => img.id === activePreviewId) : null;

  // ADD: keydown handler + ref to enable Escape closing
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
  useEffect(() => { containerRef.current?.focus(); }, []);

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }} onClick={handleClose} />

      {/* Modal Container */}
      <div ref={containerRef} tabIndex={-1} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }} onKeyDown={handleKeyDown}>
        <div style={{ backgroundColor: 'white', borderRadius: 8, width: '100%', maxWidth: '56rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', fontFamily: 'Arial, Helvetica, sans-serif', border: mode === 'create' ? `3px solid ${creationBorderColor}` : undefined }} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            {mode === 'create' ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Create Venue</h2>
                <span style={{ marginTop: 4, fontSize: 12, fontStyle: 'italic', color: '#6b7280' }}>{creationBadge}</span>
              </div>
            ) : (
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{venue?.name}</h2>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isSaving && mode === 'view' && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Saving...</span>}
              {uploadingCount > 0 && mode === 'view' && <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Uploading {uploadingCount} image{uploadingCount !== 1 ? 's' : ''}...</span>}
              <button onClick={handleClose} disabled={isSaving || uploadingCount > 0} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '2rem', fontWeight: 'bold', cursor: (isSaving || uploadingCount > 0) ? 'not-allowed' : 'pointer', opacity: (isSaving || uploadingCount > 0) ? 0.5 : 1, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            {/* Venue Information Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>Venue Information</h3>
              {mode === 'create' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', columnGap: '1rem', rowGap: '0.85rem', fontSize: '0.875rem' }}>
                  {/* Row: Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Name *</label>
                    <input value={createData.name} onChange={e => setCreateData({ ...createData, name: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    {createErrors.includes('name') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Type */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Type *</label>
                    <button type="button" onClick={() => setShowTypeSelect(true)} style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      {createData.type || 'Select type'}
                    </button>
                    {createErrors.includes('type') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Region picker */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Region Code *</label>
                    <button type="button" onClick={() => setShowRegionSelect(true)} style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      {createData.region_code ? createData.region_code : 'Select region'}
                    </button>
                    {createErrors.includes('region_code') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Locality picker */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Locality *</label>
                    <button type="button" onClick={() => setShowLocalitySelect(true)} style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      {createData.locality ? createData.locality : 'Select locality'}
                    </button>
                    {createErrors.includes('locality') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Address */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Address *</label>
                    <input value={createData.address} onChange={e => setCreateData({ ...createData, address: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    {createErrors.includes('address') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Website */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Website URL *</label>
                    <input value={createData.website_url} onChange={e => setCreateData({ ...createData, website_url: e.target.value })} placeholder="https://" style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    {createErrors.includes('website_url') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Transit + Map */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Public Transit</label>
                    <input value={createData.public_transit} onChange={e => setCreateData({ ...createData, public_transit: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Map Link</label>
                    <input value={createData.map_link} onChange={e => setCreateData({ ...createData, map_link: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  {/* Row: Artist Summary */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Artist Summary</label>
                    <textarea value={createData.artist_summary} onChange={e => setCreateData({ ...createData, artist_summary: e.target.value })} style={{ width: '100%', minHeight: 90, padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical' }} />
                  </div>
                  {/* Row: Visitor Summary */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Visitor Summary</label>
                    <textarea value={createData.visitor_summary} onChange={e => setCreateData({ ...createData, visitor_summary: e.target.value })} style={{ width: '100%', minHeight: 90, padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical' }} />
                  </div>
                  {/* Row: Facebook */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Facebook</label>
                    <input value={createData.facebook} onChange={e => setCreateData({ ...createData, facebook: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  {/* Row: Instagram */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Instagram</label>
                    <input value={createData.instagram} onChange={e => setCreateData({ ...createData, instagram: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                </div>
              ) : venue?.user_owned ? (
                // Editable fields for user-owned venues
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', columnGap: '1rem', rowGap: '0.85rem', fontSize: '0.875rem' }}>
                  {/* Row: Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Name *</label>
                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    {editErrors.includes('name') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Type */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Type *</label>
                    <button type="button" onClick={() => setShowTypeSelect(true)} style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      {editData.type || 'Select type'}
                    </button>
                    {editErrors.includes('type') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Region picker */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Region Code *</label>
                    <button type="button" onClick={() => setShowRegionSelect(true)} style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      {editData.region_code ? editData.region_code : 'Select region'}
                    </button>
                    {editErrors.includes('region_code') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Locality picker */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Locality *</label>
                    <button type="button" onClick={() => setShowLocalitySelect(true)} style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      {editData.locality ? editData.locality : 'Select locality'}
                    </button>
                    {editErrors.includes('locality') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Address */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Address *</label>
                    <input value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    {editErrors.includes('address') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Website */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Website URL *</label>
                    <input value={editData.website_url} onChange={e => setEditData({ ...editData, website_url: e.target.value })} placeholder="https://" style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    {editErrors.includes('website_url') && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>Required</div>}
                  </div>
                  {/* Row: Transit + Map */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Public Transit</label>
                    <input value={editData.public_transit} onChange={e => setEditData({ ...editData, public_transit: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Map Link</label>
                    <input value={editData.map_link} onChange={e => setEditData({ ...editData, map_link: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  {/* Row: Artist Summary */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Artist Summary</label>
                    <textarea value={editData.artist_summary} onChange={e => setEditData({ ...editData, artist_summary: e.target.value })} style={{ width: '100%', minHeight: 90, padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical' }} />
                  </div>
                  {/* Row: Visitor Summary */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Visitor Summary</label>
                    <textarea value={editData.visitor_summary} onChange={e => setEditData({ ...editData, visitor_summary: e.target.value })} style={{ width: '100%', minHeight: 90, padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical' }} />
                  </div>
                  {/* Row: Facebook */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Facebook</label>
                    <input value={editData.facebook} onChange={e => setEditData({ ...editData, facebook: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  {/* Row: Instagram */}
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Instagram</label>
                    <input value={editData.instagram} onChange={e => setEditData({ ...editData, instagram: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6 }} />
                  </div>
                  {/* Save button */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <button
                      onClick={handleEditSubmit}
                      disabled={editingSaving}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: editingSaving ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: editingSaving ? 'not-allowed' : 'pointer'
                      }}
                    >{editingSaving ? 'Saving...' : 'Save Venue Details'}</button>
                  </div>
                </div>
              ) : (
                // Read-only view for public venues
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
            {mode === 'view' && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Stickers</h3>

                {/* Available Stickers Row */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Available:</span>
                    <button onClick={() => setShowCreateStickerDialog(true)} disabled={loadingStickerMeanings} style={{ padding: '0.25rem 0.5rem', backgroundColor: loadingStickerMeanings ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: loadingStickerMeanings ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem' }}>+</span> Add Sticker
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>Right-click to remove</span>
                  </div>
                  <div style={{ minHeight: 32 }}>
                    {loadingStickerMeanings ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151' }}>
                        <span style={{ width: 20, height: 20, border: '3px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'nw5spin 0.7s linear infinite' }} />
                        Loading stickers...
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {(stickerMeanings || []).map((meaning: any) => (
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
                        {stickerMeanings.length === 0 && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>No stickers defined yet.</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Stickers Row */}
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Assigned to this venue:</div>
                  <div style={{ minHeight: 32 }}>
                    {loadingAssignedStickers ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151' }}>
                        <span style={{ width: 20, height: 20, border: '3px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'nw5spin 0.7s linear infinite' }} />
                        Loading assigned stickers...
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {(assignedStickers || []).map((sticker: any) => (
                          <div key={sticker.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0.375rem 0.75rem', backgroundColor: sticker.color, borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, border: '1px solid rgba(0,0,0,0.1)' }} title={sticker.details || sticker.label}>
                            <span>{sticker.label}</span>
                            <button onClick={() => handleUnassignSticker(sticker.sticker_meaning_id)} style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                          </div>
                        ))}
                        {assignedStickers.length === 0 && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>No stickers assigned.</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes Section (hidden in create mode) */}
            {mode === 'view' && (
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
                    onClick={handleResetNotes}
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
            {mode === 'view' && (
              <div style={{ marginBottom: '2rem', position:'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Images ({venueImages.length}/{maxImageCount})</h3>
                  <button
                    onClick={() => handleOpenFileDialog?.()}
                    disabled={isImagesLoading}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: isImagesLoading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: isImagesLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem' }}>+</span> Add Image
                  </button>
                </div>
                {/* Hidden file input for image uploads */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display:'none' }}
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (!handleImageUpload) {
                      console.warn('handleImageUpload not passed to VenueModalUI');
                      return;
                    }
                    handleImageUpload(e);
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', filter: isImagesLoading ? 'blur(2px)' : 'none', transition:'filter 0.2s' }}>
                  {venueImages.map((image: any) => (
                    <div
                      key={image.id}
                      style={{ position: 'relative', cursor: 'pointer', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', outline: clickedImageId === image.id ? '3px solid #2563eb' : 'none' }}
                      onMouseEnter={() => setHoveredImageId(image.id)}
                      onMouseLeave={() => setHoveredImageId(prev => prev === image.id ? null : prev)}
                      onClick={() => setClickedImageId(prev => prev === image.id ? null : image.id)}
                    >
                      <img
                        src={image.url}
                        alt={image.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s', transform: hoveredImageId === image.id ? 'scale(1.03)' : 'scale(1)' }}
                      />
                      {!isImagesLoading && (
                        <button
                          aria-label="Delete image"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            fontSize: 14,
                            lineHeight: '22px',
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {venueImages.length === 0 && !isImagesLoading && (
                    <div style={{ fontSize:'0.75rem', color:'#6b7280' }}>No images yet.</div>
                  )}
                </div>

                {/* Full-size preview area */}
                <div style={{ marginTop: '1rem' }}>
                  {activePreviewImage ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <img
                        src={activePreviewImage.url}
                        alt={activePreviewImage.filename}
                        style={{ maxWidth: 800, maxHeight: 800, width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      minHeight: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f3f4f6',
                      border: '2px dashed #d1d5db',
                      borderRadius: 8,
                      color: '#6b7280',
                      fontStyle: 'italic',
                      fontSize: '0.9rem'
                    }}>
                      Hover or click a thumbnail to preview
                    </div>
                  )}
                </div>

                {isImagesLoading && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, background:'rgba(255,255,255,0.85)', padding:'1rem 1.25rem', borderRadius:8, boxShadow:'0 4px 10px rgba(0,0,0,0.08)' }}>
                      <span style={{ width:42, height:42, border:'5px solid #93c5fd', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'nw5spin 0.7s linear infinite' }} />
                      <span style={{ fontSize:'0.75rem', color:'#374151', fontWeight:600 }}>Loading images…</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'create' && (
              <div style={{ marginTop: '1rem' }}>
                <button
                  onClick={handleCreateSubmit}
                  disabled={creating}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: creating ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer'
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
                disabled={mode === 'view' && (isSaving || uploadingCount > 0)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: mode === 'create' ? '#6b7280' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (mode === 'view' && (isSaving || uploadingCount > 0)) ? 'not-allowed' : 'pointer',
                  opacity: (mode === 'view' && (isSaving || uploadingCount > 0)) ? 0.5 : 1,
                  transition: 'background-color 0.2s'
                }}
              >
                {mode === 'create' ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div> {/* end inner modal */}
      </div> {/* end modal container */}

      {/* Context Menu for Sticker Rename/Delete */}
      {contextMenu && mode === 'view' && (
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
            border: '1px solid #e5e7eb',
            minWidth: 160
          }}
        >
          <div
            onClick={() => {
              const meaning = contextMenu.meaning;
              if (meaning) {
                setRenamingSticker(meaning);
                setRenameLabel(meaning.label);
                setShowRenameStickerDialog(true);
                setContextMenu(null);
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
              const meaning = contextMenu.meaning;
              if (meaning) {
                // keep menu open and show spinner while deleting
                handleDeleteStickerMeaning(meaning);
              }
            }}
            style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', borderRadius: 4, transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: 8, opacity: deletingStickerId ? 0.7 : 1 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            {deletingStickerId ? (
              <span style={{ width: 14, height: 14, border: '2px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', display: 'inline-block', animation: 'nw5spin 0.6s linear infinite' }} />
            ) : null}
            Delete Sticker
          </div>
        </div>
      )}

      {/* Single-select locality picker in create mode */}
      {mode === 'create' && showLocalitySelect && (
        <LocalityPickerModal
          localities={localities}
          selectedLocalities={createData.locality ? [createData.locality] : []}
          singleSelect
          onToggleLocality={(name: string) => {
            if (!name) {
              setCreateData({ ...createData, locality: '' });
            } else {
              setCreateData({ ...createData, locality: name });
              setShowLocalitySelect(false);
            }
          }}
          onClear={() => { setCreateData({ ...createData, locality: '' }); }}
          onClose={() => setShowLocalitySelect(false)}
        />
      )}

      {/* Single-select region picker in create mode */}
      {mode === 'create' && showRegionSelect && (
        <LocalityPickerModal
          title="Select Region"
          localities={regions.map((r: any) => ({ id: r.id, name: r.code ? `${r.code} — ${r.name}` : r.name }))}
          selectedLocalities={createData.region_code ? [createData.region_code] : []}
          singleSelect
          onToggleLocality={(text: string) => {
            if (!text) {
              setCreateData({ ...createData, region_code: '' });
            } else {
              const code = text.split(' — ')[0];
              setCreateData({ ...createData, region_code: code });
              setShowRegionSelect(false);
            }
          }}
          onClear={() => { setCreateData({ ...createData, region_code: '' }); }}
          onClose={() => setShowRegionSelect(false)}
        />
      )}

      {/* Type picker in create mode */}
      {mode === 'create' && showTypeSelect && (
        <TypePickerModal
          selectedType={createData.type}
          onSelectType={(type: string) => {
            setCreateData({ ...createData, type });
          }}
          onClose={() => setShowTypeSelect(false)}
        />
      )}

      {/* Type picker in edit mode for user-owned venues */}
      {mode === 'view' && venue?.user_owned && showTypeSelect && (
        <TypePickerModal
          selectedType={editData.type}
          onSelectType={(type: string) => {
            setEditData({ ...editData, type });
          }}
          onClose={() => setShowTypeSelect(false)}
        />
      )}

      {/* Locality picker in edit mode for user-owned venues */}
      {mode === 'view' && venue?.user_owned && showLocalitySelect && (
        <LocalityPickerModal
          localities={localities}
          selectedLocalities={editData.locality ? [editData.locality] : []}
          singleSelect
          onToggleLocality={(name: string) => {
            if (!name) {
              setEditData({ ...editData, locality: '' });
            } else {
              setEditData({ ...editData, locality: name });
              setShowLocalitySelect(false);
            }
          }}
          onClear={() => { setEditData({ ...editData, locality: '' }); }}
          onClose={() => setShowLocalitySelect(false)}
        />
      )}

      {/* Region picker in edit mode for user-owned venues */}
      {mode === 'view' && venue?.user_owned && showRegionSelect && (
        <LocalityPickerModal
          title="Select Region"
          localities={regions.map((r: any) => ({ id: r.id, name: r.code ? `${r.code} — ${r.name}` : r.name }))}
          selectedLocalities={editData.region_code ? [editData.region_code] : []}
          singleSelect
          onToggleLocality={(text: string) => {
            if (!text) {
              setEditData({ ...editData, region_code: '' });
            } else {
              const code = text.split(' — ')[0];
              setEditData({ ...editData, region_code: code });
              setShowRegionSelect(false);
            }
          }}
          onClear={() => { setEditData({ ...editData, region_code: '' }); }}
          onClose={() => setShowRegionSelect(false)}
        />
      )}

      {/* Create Sticker Dialog */}
      {showCreateStickerDialog && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000 }}
            onClick={() => setShowCreateStickerDialog(false)}
          />
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, pointerEvents: 'none' }}
          >
            <div
              style={{ backgroundColor: 'white', borderRadius: 8, width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', fontFamily: 'Arial, Helvetica, sans-serif' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Add Sticker</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateStickerDialog(false)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>Label *</label>
                  <input
                    value={stickerFormData.label}
                    onChange={(e) => setStickerFormData({ ...stickerFormData, label: e.target.value })}
                    maxLength={15}
                    placeholder="Max 15 characters"
                    style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>Color</label>
                  <input
                    type="color"
                    value={stickerFormData.color}
                    onChange={(e) => setStickerFormData({ ...stickerFormData, color: e.target.value })}
                    style={{ width: '100%', height: '40px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>Details (optional)</label>
                  <textarea
                    value={stickerFormData.details}
                    onChange={(e) => setStickerFormData({ ...stickerFormData, details: e.target.value })}
                    maxLength={1000}
                    placeholder="Additional notes about this sticker"
                    style={{ width: '100%', minHeight: 80, padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', resize: 'vertical' }}
                  />
                </div>
              </div>
              <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateStickerDialog(false)}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateStickerMeaning}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  Add Sticker
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rename Sticker Dialog */}
      {showRenameStickerDialog && renamingSticker && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000 }}
            onClick={() => {
              setShowRenameStickerDialog(false);
              setRenamingSticker(null);
              setRenameLabel('');
            }}
          />
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, pointerEvents: 'none' }}
          >
            <div
              style={{ backgroundColor: 'white', borderRadius: 8, width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', fontFamily: 'Arial, Helvetica, sans-serif' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Rename Sticker</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameStickerDialog(false);
                    setRenamingSticker(null);
                    setRenameLabel('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>New Label *</label>
                  <input
                    value={renameLabel}
                    onChange={(e) => setRenameLabel(e.target.value)}
                    maxLength={15}
                    placeholder="Max 15 characters"
                    style={{ width: '100%', padding: '0.55rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
                    autoFocus
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Current: <span style={{ fontWeight: 600 }}>{renamingSticker.label}</span>
                </div>
              </div>
              <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameStickerDialog(false);
                    setRenamingSticker(null);
                    setRenameLabel('');
                  }}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRenameStickerMeaning}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  Rename Sticker
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}


// Container component - manages all state and logic
export default function VenueModal(props: any) {
  const { venue, onClose, onNoteSaved, onStickerUpdate, onStickerRename, onImageChange, mode = 'view', onVenueCreated, userRole: _userRole } = props;
  const [localNotes, setLocalNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<any>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sticker-related state
  const [stickerMeanings, setStickerMeanings] = useState<any[]>([]);
  const [assignedStickers, setAssignedStickers] = useState<any[]>([]);
  const [loadingStickerMeanings, setLoadingStickerMeanings] = useState(false); // NEW
  const [loadingAssignedStickers, setLoadingAssignedStickers] = useState(false); // NEW
  const [showCreateStickerDialog, setShowCreateStickerDialog] = useState(false);
  const [showRenameStickerDialog, setShowRenameStickerDialog] = useState(false);
  const [renamingSticker, setRenamingSticker] = useState<any | null>(null);
  const [renameLabel, setRenameLabel] = useState('');

  // Context menu state for sticker deletion
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, meaningId: string, meaning: any } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [stickerFormData, setStickerFormData] = useState<any>({
    color: '#ADD8E6',
    label: '',
    details: ''
  });
  // track deletion loading for menu spinner
  const [deletingStickerId, setDeletingStickerId] = useState<string | null>(null);

  const {
    notes, images, imagesUploading, setNote, setImages, addImage, removeImage, setImagesLoading, incrementUploading, decrementUploading,
    imagesLoading // ADD: extract imagesLoading
  } = useVenueStore();
  const { config: imageConfig } = useImageConfig();

  const venueNote = mode === 'view' ? notes?.[venue?.id] : null;
  const venueImages = mode === 'view' ? (images?.[venue?.id] || []) : [];
  const uploadingCount = imagesUploading?.[venue?.id] || 0;
  const isImagesLoading = imagesLoading?.[venue?.id]; // NEW
  const maxImageCount = imageConfig?.max_image_count || 20;
  // Enable edit mode for base fields if viewing a user-owned venue
  const editModeEnabled = mode === 'view' && !!venue?.user_owned;

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
    if (mode === 'create') return;
    if (venueNote) {
      const noteBody = venueNote.body || '';
      setLocalNotes(noteBody);
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

  // Robust: close context menu when clicking outside, pressing Escape, or on scroll (not on right-click to avoid conflicts)
  useEffect(() => {
    if (!contextMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDownDoc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const handleScroll = () => setContextMenu(null);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDownDoc);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDownDoc);
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
      setLoadingStickerMeanings(true); // NEW
      const response = await fetch('/api/stickers/meanings');
      if (response.ok) {
        const data = await response.json();
        setStickerMeanings(data.meanings || []);
      }
    } catch (err) {
      console.error('Failed to load sticker meanings:', err);
    } finally { setLoadingStickerMeanings(false); } // NEW
  };

  const loadVenueStickers = async () => {
    try {
      setLoadingAssignedStickers(true); // NEW
      const response = await fetch(`/api/venues/${venue.id}/stickers`);
      if (response.ok) {
        const data = await response.json();
        const stickers = data.stickers || [];
        setAssignedStickers(stickers);
        // Notify parent to update the table
        if (onStickerUpdate) {
          onStickerUpdate(venue.id, stickers);
        }
      }
    } catch (err) {
      console.error('Failed to load venue stickers:', err);
    } finally { setLoadingAssignedStickers(false); } // NEW
  };

  const handleNotesChange = (value: any) => setLocalNotes(value);

  const handleSave = async () => {
    if (mode === 'create') return;
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
      } else {
        alert('Failed to save notes. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleResetNotes = () => {
    setLocalNotes(originalNotes);
  };

  // Handle close with unsaved changes confirmation
  const handleClose = () => {
    // Only check for unsaved changes in view mode (not create mode)
    if (mode === 'view' && hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes to your notes. Are you sure you want to close without saving?'
      );
      if (!confirmed) {
        return; // Don't close
      }
    }
    // Proceed with close
    onClose();
  };

  // Creation mode form state
  const [createData, setCreateData] = useState<any>({
    name: '', type: 'other', region_code: 'BOS', locality: '', address: '', website_url: '', public_transit: '', map_link: '', artist_summary: '', visitor_summary: '', facebook: '', instagram: ''
  });
  const [creating, setCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [localities, setLocalities] = useState<Array<{ id: string, name: string }>>([]);
  const [showLocalitySelect, setShowLocalitySelect] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: string, name: string, code?: string }>>([]);
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);

  // Edit mode form state for user-owned venues
  const [editData, setEditData] = useState<any>({
    name: '', type: '', region_code: '', locality: '', address: '', website_url: '', public_transit: '', map_link: '', artist_summary: '', visitor_summary: '', facebook: '', instagram: ''
  });
  const [editingSaving, setEditingSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<string[]>([]);

  // Initialize edit data when venue loads
  useEffect(() => {
    if (mode === 'view' && venue?.user_owned) {
      setEditData({
        name: venue.name || '',
        type: venue.type || '',
        region_code: venue.region_code || '',
        locality: venue.locality || '',
        address: venue.address || '',
        website_url: venue.website_url || '',
        public_transit: venue.public_transit || '',
        map_link: venue.map_link || '',
        artist_summary: venue.artist_summary || '',
        visitor_summary: venue.visitor_summary || '',
        facebook: venue.facebook || '',
        instagram: venue.instagram || ''
      });
    }
  }, [venue, mode]);

  useEffect(() => {
    if (mode !== 'create' && !(mode === 'view' && venue?.user_owned)) return;
    const loadLocalities = async () => {
      try {
        const resp = await fetch('/api/localities');
        if (resp.ok) {
          const data = await resp.json();
          setLocalities(data.localities || []);
        }
      } catch (e) {
        console.warn('Failed to load localities', e);
      }
    };
    const loadRegions = async () => {
      try {
        const resp = await fetch('/api/regions');
        if (resp.ok) {
          const data = await resp.json();
          // API now returns properly structured regions with id, code, key, and name
          setRegions(data.regions || []);
        }
      } catch (e) {
        console.warn('Failed to load regions', e);
      }
    };
    loadLocalities();
    loadRegions();
  }, [mode]);

  const requiredFields = ['name', 'type', 'region_code', 'locality', 'address', 'website_url'];
  const validateCreate = () => {
    const errs: string[] = [];
    requiredFields.forEach(f => {
      if (!createData[f] || String(createData[f]).trim() === '') errs.push(f);
    });
    setCreateErrors(errs);
    return errs.length === 0;
  };

  const handleCreateSubmit = async () => {
    if (mode === 'create') {
      if (!validateCreate()) return;
      setCreating(true);
      try {
        const response = await fetch('/api/venues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        });
        if (response.ok) {
          const data = await response.json();
          onVenueCreated(data.venue);
          onClose();
        } else {
          alert('Failed to create venue. Please try again.');
        }
      } catch (err) {
        console.error('Failed to create venue:', err);
        alert('Failed to create venue. Please try again.');
      } finally {
        setCreating(false);
      }
    }
  };

  // Edit submit
  const validateEdit = () => {
    const required = ['name', 'type', 'region_code', 'locality', 'address', 'website_url'];
    const errs = required.filter(f => !editData[f] || String(editData[f]).trim() === ''); setEditErrors(errs); return errs.length === 0;
  };
  const handleEditSubmit = async () => {
    if (!editModeEnabled || !venue?.id) return;
    if (!validateEdit()) return;
    setEditingSaving(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (response.ok) {
        const data = await response.json();
        // update view fields
        Object.assign(venue, data.venue || editData);
      } else {
        alert('Failed to save venue details. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save venue details:', err);
      alert('Failed to save venue details. Please try again.');
    } finally {
      setEditingSaving(false);
    }
  };

  // Picker callbacks
  const handleToggleLocality = (name: string) => {
    if (mode === 'create') { setCreateData({ ...createData, locality: name }); setShowLocalitySelect(false); }
    else if (editModeEnabled) { setEditData({ ...editData, locality: name }); setShowLocalitySelect(false); }
  };
  const handleToggleRegion = (text: string) => {
    const code = text.split(' — ')[0];
    if (mode === 'create') { setCreateData({ ...createData, region_code: code }); setShowRegionSelect(false); }
    else if (editModeEnabled) { setEditData({ ...editData, region_code: code }); setShowRegionSelect(false); }
  };
  const handleSelectType = (type: string) => {
    if (mode === 'create') { setCreateData({ ...createData, type }); }
    else if (editModeEnabled) { setEditData({ ...editData, type }); }
    setShowTypeSelect(false);
  };

  // Open file dialog
  const handleOpenFileDialog = () => {
    if (mode !== 'view') return; // only in view (images hidden in create)
    fileInputRef.current?.click();
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!venue?.id || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (venueImages.length >= maxImageCount) { alert('Max image count reached'); break; }
      incrementUploading?.(venue.id);
      try {
        console.debug('[ImageUpload] Start', { name: file.name, size: file.size, type: file.type, venueId: venue.id });
        const validationError = validateImageFile(file, imageConfig?.max_image_weight);
        if (validationError) {
          console.warn('[ImageUpload] Validation failed', validationError);
          alert(validationError);
          continue;
        }
        const processed = await compressImage(file, imageConfig?.target_image_size).catch(err => {
          console.error('[ImageUpload] Compression failed', err);
          throw err;
        });
        if (!processed) {
          console.error('[ImageUpload] Compression returned null/undefined');
          alert('Failed to process image');
          continue;
        }
        const formData = new FormData();
        formData.append('file', processed, processed.name);

        let resp: Response | null = null;
        try {
          resp = await fetch(`/api/venues/${venue.id}/images`, { method: 'POST', body: formData });
        } catch (fetchErr) {
          console.error('[ImageUpload] Fetch threw exception', fetchErr);
          alert('Network error while uploading');
          continue;
        }

        // Defensive check: ensure resp is a valid Response object
        if (!resp || typeof resp !== 'object') {
          console.error('[ImageUpload] Invalid response object', resp);
          alert('Invalid server response');
          continue;
        }

        // Check if response has ok property (should always be present in standard Response)
        const hasOkProp = 'ok' in resp && typeof resp.ok === 'boolean';
        if (!hasOkProp) {
          console.error('[ImageUpload] Response missing ok property', resp);
          alert('Invalid server response format');
          continue;
        }

        console.debug('[ImageUpload] Response status', resp.status, 'ok:', resp.ok);

        if (resp.ok) {
          let data: any = null;
          try {
            data = await resp.json();
          } catch (jsonErr) {
            console.error('[ImageUpload] JSON parse failed', jsonErr);
            alert('Failed to parse upload response');
            continue;
          }
          if (!data?.image) {
            console.warn('[ImageUpload] Missing image in response', data);
            alert('Upload response missing image data');
            continue;
          }
          addImage?.(venue.id, data.image);
          console.debug('[ImageUpload] Success added image', { imageId: data.image.id });
          // Notify parent to refresh the table row
          if (onImageChange) {
            onImageChange(venue.id, data.image);
          }
        } else {
          let errPayload: any = null;
          try {
            errPayload = await resp.json();
          } catch {
            /* ignore parse error */
          }
          console.warn('[ImageUpload] Server returned error', resp.status, errPayload);
          alert(errPayload?.error || `Upload failed (status ${resp.status})`);
        }
      } catch (err) {
        console.error('Upload error', err);
        alert('Upload error');
      } finally {
        decrementUploading?.(venue.id);
      }
    }
    e.target.value = '';
  };

  // Delete image
  const handleDeleteImage = async (imageId: string) => {
    if (!venue?.id) return;
    try {
      const resp = await fetch(`/api/venues/${venue.id}/images/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }) // FIX: server expects imageId (camelCase)
      });
      if (resp.ok) {
        removeImage?.(venue.id, imageId);
        // Notify parent to refresh the table row
        if (onImageChange) {
          onImageChange(venue.id, null, imageId); // null for the image, imageId to indicate deletion
        }
      } else {
        const payload = await resp.json().catch(() => ({}));
        console.error('Failed to delete image', resp.status, payload);
        alert(payload?.error || 'Failed to delete image');
      }
    } catch (err) {
      console.error('Delete image error', err);
      alert('Delete image error');
    }
  };

  const assignedStickerIds = new Set(assignedStickers.map(s => s.sticker_meaning_id));

  // Next color helper (choose first unused from palette)
  const getNextAvailableColor = () => {
    const palette = ['#ADD8E6','#FFB366','#FFFF99','#FFB3B3','#D3D3D3','#A7F3D0','#FBCFE8','#C4B5FD'];
    const used = new Set(stickerMeanings.map(m => m.color));
    for (const c of palette) if (!used.has(c)) return c;
    return '#C4C4C4';
  };

  // Sticker assign
  const handleAssignSticker = async (meaningId: string) => {
    if (!venue?.id) return;
    if (assignedStickerIds.has(meaningId)) return; // already assigned
    try {
      const resp = await fetch(`/api/venues/${venue.id}/stickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', stickerMeaningId: meaningId })
      });
      if (resp.ok) {
        const data = await resp.json();
        // Reload the full assigned stickers list to get complete sticker data
        await loadVenueStickers();
      } else {
        const payload = await resp.json().catch(() => ({}));
        console.error('Assign failed', resp.status, payload);
        alert(payload?.error || 'Failed to assign sticker');
      }
    } catch (err) {
      console.error('Assign sticker failed', err);
      alert('Failed to assign sticker');
    }
  };

  const handleUnassignSticker = async (meaningId: string) => {
    if (!venue?.id) return;
    try {
      const resp = await fetch(`/api/venues/${venue.id}/stickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign', stickerMeaningId: meaningId })
      });
      if (resp.ok) {
        setAssignedStickers(prev => {
          const updated = prev.filter(s => s.sticker_meaning_id !== meaningId);
          onStickerUpdate?.(venue.id, updated); // NEW immediate parent update
          return updated;
        });
      } else {
        const payload = await resp.json().catch(() => ({}));
        console.error('Unassign failed', resp.status, payload);
        alert(payload?.error || 'Failed to unassign sticker');
      }
    } catch (err) {
      console.error('Unassign sticker failed', err);
      alert('Failed to unassign sticker');
    }
  };

  // Create sticker meaning
  const handleCreateStickerMeaning = async () => {
    if (!stickerFormData.label.trim()) { alert('Label required'); return; }
    try {
      const resp = await fetch('/api/stickers/meanings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stickerFormData) });
      if (resp.ok) {
        const data = await resp.json();
        setStickerMeanings(prev => [...prev, data.meaning]);
        setShowCreateStickerDialog(false);
        setStickerFormData({ color: getNextAvailableColor(), label: '', details: '' });
      } else alert('Failed to create');
    } catch (err) { console.error('Create sticker meaning failed', err); }
  };

  const handleDeleteStickerMeaning = async (meaning: any) => {
    if (!meaning || !meaning.id) {
      console.warn('Delete sticker meaning called without valid meaning object', meaning);
      return;
    }
    if (!confirm(`Delete sticker "${meaning.label}"? This cannot be undone.`)) return;
    setDeletingStickerId(meaning.id);
    console.debug('[Sticker] Deleting meaning', meaning.id);
    try {
      const url = `/api/stickers/meanings/delete?id=${encodeURIComponent(meaning.id)}&force=true`;
      const resp = await fetch(url, { method: 'POST' });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('[Sticker] Delete failed', resp.status, payload);
        alert(payload?.error || `Failed to delete sticker (status ${resp.status})`);
        return;
      }
      const affectedVenueIds: string[] = payload.affectedVenueIds || [];
      setStickerMeanings(prev => prev.filter(m => m.id !== meaning.id));
      setAssignedStickers(prev => prev.filter(s => s.sticker_meaning_id !== meaning.id));
      if (affectedVenueIds.length > 0) {
        console.debug('[Sticker] Delete affected venues', affectedVenueIds);
        onStickerUpdate?.(affectedVenueIds); // multi-venue path (no per-venue lists available here)
      } else if (venue?.id) {
        const updated = assignedStickers.filter(s => s.sticker_meaning_id !== meaning.id);
        setAssignedStickers(updated);
        onStickerUpdate?.(venue.id, updated);
      }
    } catch (err) {
      console.error('[Sticker] Exception deleting meaning', err);
      alert('Unexpected error deleting sticker meaning');
    } finally {
      setDeletingStickerId(null);
      setContextMenu(null);
    }
  };

  const handleRenameStickerMeaning = async () => {
    if (!renamingSticker || !renamingSticker.id) {
      console.warn('Rename sticker meaning called without target', renamingSticker);
      return;
    }
    const trimmed = (renameLabel || '').trim();
    if (!trimmed) {
      alert('Label required');
      return;
    }
    if (trimmed.length > 15) {
      alert('Label must be 15 characters or less');
      return;
    }
    console.debug('[Sticker] Renaming meaning', renamingSticker.id, '->', trimmed);
    try {
      const resp = await fetch(`/api/stickers/meanings/${renamingSticker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed })
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('[Sticker] Rename failed', resp.status, payload);
        alert(payload?.error || `Failed to rename sticker (status ${resp.status})`);
        return;
      }
      setStickerMeanings(prev => prev.map(m => m.id === renamingSticker.id ? { ...m, label: trimmed } : m));
      setAssignedStickers(prev => {
        const updated = prev.map(s => s.sticker_meaning_id === renamingSticker.id ? { ...s, label: trimmed } : s);
        onStickerRename?.(renamingSticker.id, trimmed);
        // Also push immediate update to parent for the current venue row
        if (venue?.id) onStickerUpdate?.(venue.id, updated);
        return updated;
      });
      setShowRenameStickerDialog(false);
      setRenamingSticker(null);
      setRenameLabel('');
    } catch (err) {
      console.error('[Sticker] Exception renaming meaning', err);
      alert('Unexpected error renaming sticker meaning');
    }
  };

  return (
    <ModalPortal>
      <VenueModalUI
        mode={mode}
        venue={venue}
        localNotes={localNotes}
        originalNotes={originalNotes}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        handleNotesChange={handleNotesChange}
        handleSave={handleSave}
        handleResetNotes={handleResetNotes}
        uploadingCount={uploadingCount}
        isImagesLoading={isImagesLoading}
        venueImages={venueImages}
        maxImageCount={maxImageCount}
        handleImageUpload={handleImageUpload}
        handleOpenFileDialog={handleOpenFileDialog}
        handleDeleteImage={handleDeleteImage}
        notesTextareaRef={notesTextareaRef}
        fileInputRef={fileInputRef}
        contextMenuRef={contextMenuRef}
        stickerMeanings={stickerMeanings}
        assignedStickers={assignedStickers}
        assignedStickerIds={assignedStickerIds}
        handleAssignSticker={handleAssignSticker}
        handleUnassignSticker={handleUnassignSticker}
        showCreateStickerDialog={showCreateStickerDialog}
        setShowCreateStickerDialog={setShowCreateStickerDialog}
        stickerFormData={stickerFormData}
        setStickerFormData={setStickerFormData}
        handleCreateStickerMeaning={handleCreateStickerMeaning}
        loadingStickerMeanings={loadingStickerMeanings}
        loadingAssignedStickers={loadingAssignedStickers}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        handleDeleteStickerMeaning={handleDeleteStickerMeaning}
        showRenameStickerDialog={showRenameStickerDialog}
        setShowRenameStickerDialog={setShowRenameStickerDialog}
        renamingSticker={renamingSticker}
        renameLabel={renameLabel}
        setRenamingSticker={setRenamingSticker}
        setRenameLabel={setRenameLabel}
        handleRenameStickerMeaning={handleRenameStickerMeaning}
        deletingStickerId={deletingStickerId}
        editModeEnabled={editModeEnabled}
        editData={editData}
        setEditData={setEditData}
        editErrors={editErrors}
        editingSaving={editingSaving}
        handleEditSubmit={handleEditSubmit}
        createData={createData}
        setCreateData={setCreateData}
        createErrors={createErrors}
        creating={creating}
        handleCreateSubmit={handleCreateSubmit}
        showLocalitySelect={showLocalitySelect}
        setShowLocalitySelect={setShowLocalitySelect}
        localities={localities}
        showRegionSelect={showRegionSelect}
        setShowRegionSelect={setShowRegionSelect}
        regions={regions}
        showTypeSelect={showTypeSelect}
        setShowTypeSelect={setShowTypeSelect}
        handleClose={handleClose}
      />
      {/* Locality Picker */}
      {showLocalitySelect && (
        <LocalityPickerModal
          localities={localities}
          selectedLocalities={(mode === 'create' ? createData.locality : editData.locality) ? [mode === 'create' ? createData.locality : editData.locality] : []}
          singleSelect
          onToggleLocality={handleToggleLocality}
          onClear={() => { if (mode === 'create') setCreateData({ ...createData, locality: '' }); else if (editModeEnabled) setEditData({ ...editData, locality: '' }); }}
          onClose={() => setShowLocalitySelect(false)}
        />
      )}
      {/* Region Picker */}
      {showRegionSelect && (
        <LocalityPickerModal
          title='Select Region'
          localities={regions.map((r: any) => ({ id: r.id, name: r.code ? `${r.code} — ${r.name}` : r.name }))}
          selectedLocalities={(mode === 'create' ? createData.region_code : editData.region_code) ? [mode === 'create' ? createData.region_code : editData.region_code] : []}
          singleSelect
          onToggleLocality={handleToggleRegion}
          onClear={() => { if (mode === 'create') setCreateData({ ...createData, region_code: '' }); else if (editModeEnabled) setEditData({ ...editData, region_code: '' }); }}
          onClose={() => setShowRegionSelect(false)}
        />
      )}
      {/* Type Picker */}
      {showTypeSelect && (
        <TypePickerModal
          selectedType={mode === 'create' ? createData.type : editData.type}
          onSelectType={handleSelectType}
          onClose={() => setShowTypeSelect(false)}
        />
      )}
    </ModalPortal>
  );
}
