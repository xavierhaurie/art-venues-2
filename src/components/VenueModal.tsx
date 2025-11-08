'use client';

// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useVenueStore } from '@/lib/store/venueStore';
import { compressImage, validateImageFile } from '@/lib/imageUtils';
import LocalityPickerModal from '@/components/LocalityPickerModal';
import TypePickerModal from '@/components/TypePickerModal';

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
    // handlers
    handleClose, handleKeyDown, handleNotesChange, handleSave, handleCreateSubmit, handleAssignSticker, handleUnassignSticker, handleDeleteImage, handleImageUpload, handleCreateStickerMeaning, handleDeleteStickerMeaning, handleRenameStickerMeaning,
    setContextMenu, setCreateData, setShowCreateStickerDialog, setShowRenameStickerDialog, setRenamingSticker, setRenameLabel, renamingSticker, renameLabel, showCreateStickerDialog, showRenameStickerDialog,
    stickerFormData, setStickerFormData,
    notesTextareaRef, fileInputRef, contextMenuRef, onStickerUpdate,
    // picker state
    showLocalitySelect, setShowLocalitySelect, localities, showRegionSelect, setShowRegionSelect, regions,
    showTypeSelect, setShowTypeSelect,
    // image state
    hoveredImageId, setHoveredImageId, clickedImageId, setClickedImageId,
  } = props;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }} onClick={handleClose} />

      {/* Modal Container */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }} onKeyDown={handleKeyDown}>
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
                    <button onClick={() => setShowCreateStickerDialog(true)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ fontSize: '0.875rem' }}>+</span> Add Sticker</button>
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
                    onClick={() => { setLocalNotes(originalNotes); }}
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

                {/* Full-size image display area below thumbnails */}
                {(hoveredImageId || clickedImageId) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: 8,
                    marginTop: '1rem',
                    minHeight: '400px'
                  }}>
                    <img
                      src={venueImages.find(img => img.id === (hoveredImageId || clickedImageId))?.url}
                      alt="Full size preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '800px',
                        objectFit: 'contain',
                        borderRadius: 4,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                  </div>
                )}

                {/* Placeholder when no image is selected */}
                {!hoveredImageId && !clickedImageId && venueImages.length > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: 8,
                    marginTop: '1rem',
                    minHeight: '400px',
                    border: '2px solid #d1d5db'
                  }}>
                    <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                      Hover over or click a thumbnail to view full size
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            )}

            {mode === 'create' && (
              <div style={{ marginTop: '1rem' }}>
                <button
                  onClick={handleCreateSubmit}
                  disabled={creating}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: creating ? '#9ca3af' : creationBorderColor,
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
            zIndex: 9990,
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
          localities={regions.map(r => ({ id: r.id, name: r.code ? `${r.code} — ${r.name}` : r.name }))}
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
          localities={regions.map(r => ({ id: r.id, name: r.code ? `${r.code} — ${r.name}` : r.name }))}
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
    </>
  );
}


// Container component - manages all state and logic
export default function VenueModal(props: any) {
  const { venue, onClose, onNoteSaved, onStickerUpdate, mode = 'view', onVenueCreated, userRole } = props;
  const [localNotes, setLocalNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, meaningId: string, meaning: any } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [stickerFormData, setStickerFormData] = useState<any>({
    color: '#ADD8E6',
    label: '',
    details: ''
  });

  const {
    notes, images, imagesUploading, setNote, setImages, addImage, removeImage, setImagesLoading, incrementUploading, decrementUploading,
  } = useVenueStore();

  const venueNote = mode === 'view' ? notes?.[venue?.id] : null;
  const venueImages = mode === 'view' ? (images?.[venue?.id] || []) : [];
  const uploadingCount = imagesUploading?.[venue?.id] || 0;

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
          const list = (data.regions || []).map((r: any) => ({ id: r.id || r.code || r.name, name: r.name, code: r.code || r.region_code || r.key || r.name }));
          setRegions(list);
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
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        alert(err.error || 'Failed to create venue');
      } else {
        const data = await resp.json();
        if (onVenueCreated) onVenueCreated(data.venue);
        onClose();
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to create venue');
    } finally {
      setCreating(false);
    }
  };

  const creationBorderColor = userRole === 'admin' ? '#3b82f6' : '#10b981';
  const creationBadge = userRole === 'admin' ? 'Public (admin)' : 'Mine';

  // Handler for saving edited venue data
  const handleEditSubmit = async () => {
    const errors: string[] = [];
    if (!editData.name?.trim()) errors.push('name');
    if (!editData.type?.trim()) errors.push('type');
    if (!editData.region_code?.trim()) errors.push('region_code');
    if (!editData.locality?.trim()) errors.push('locality');
    if (!editData.address?.trim()) errors.push('address');
    if (!editData.website_url?.trim()) errors.push('website_url');
    setEditErrors(errors);
    if (errors.length > 0) {
      alert('Please fill in all required fields (*)');
      return;
    }
    setEditingSaving(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update venue');
      }
      alert('Venue updated successfully');
      // Reload venue data
      const reloadResponse = await fetch(`/api/venues/${venue.id}`);
      if (reloadResponse.ok) {
        const data = await reloadResponse.json();
        // Update local venue object if needed (could trigger parent refresh)
        if (props.onVenueUpdated) props.onVenueUpdated(data);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to update venue');
    } finally {
      setEditingSaving(false);
    }
  };

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
      if (!file.type) {
        const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop().toLowerCase() : '';
        const extMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
        const inferred = extMap[ext] || '';
        if (inferred) {
          try {
            file = new File([file], file.name, { type: inferred });
          } catch (e) {
            console.warn('VenueModal: failed to create typed File for', file.name, e);
          }
        }
      }
      const validationError = validateImageFile(file, 5);
      if (validationError) { alert(`${file.name}: ${validationError}`); continue; }

      if (file.type === 'image/svg+xml') {
        validFiles.push(file);
        continue;
      }

      try {
        const compressed = await compressImage(file, 100, 1200);
        validFiles.push(compressed);
      } catch (err) {
        console.warn('VenueModal: compression failed, falling back to original file for upload', file.name, err);
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
          try { props?.onImagesChanged && props.onImagesChanged(venue.id, 'added', data.image); } catch { }
        } else {
          let msg = `Failed to upload ${file.name}`;
          try {
            const errBody = await response.json();
            msg = errBody.error || errBody.message || msg;
          } catch (parseErr) {
            const text = await response.text().catch(() => '');
            if (text) msg = text;
          }
          alert(`${file.name}: ${msg}`);
        }
      } catch (err) {
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign', stickerMeaningId })
      });
      if (response.ok) {
        await loadVenueStickers();
        if (onStickerUpdate) onStickerUpdate(venue.id);
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unassign', stickerMeaningId })
      });
      if (response.ok) {
        await loadVenueStickers();
        if (onStickerUpdate) onStickerUpdate(venue.id);
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
      if (response.ok) { await loadStickerMeanings(); setShowCreateStickerDialog(false); setStickerFormData({ color: getNextAvailableColor(), label: '', details: '' }); if (onStickerUpdate) onStickerUpdate(venue.id); }
      else { const errorData = await response.json(); alert(errorData.error || 'Failed to create sticker'); }
    } catch (err) { console.error('Failed to create sticker:', err); alert('Failed to create sticker'); }
  };

  const handleDeleteStickerMeaning = async (meaning: any) => {
    const confirmed = confirm(`Delete sticker "${meaning.label}"? This will remove it from your stickers list and from any venues where it's assigned.`);
    if (!confirmed) return;
    try {
      const forceResp = await fetch(`/api/stickers/meanings/delete?id=${meaning.id}&force=true`, { method: 'POST' });
      if (forceResp.ok) {
        const data = await forceResp.json().catch(() => ({}));
        await loadStickerMeanings();
        await loadVenueStickers();
        if (onStickerUpdate) {
          const affected: string[] = Array.isArray((data as any).affectedVenueIds) ? (data as any).affectedVenueIds : [];
          if (affected.length > 0) {
            affected.forEach((vid) => { try { onStickerUpdate(vid); } catch { } });
          } else {
            try { onStickerUpdate(venue.id); } catch { }
          }
        }
        return;
      }
      const fallback = await fetch(`/api/stickers/meanings/delete?id=${meaning.id}`, { method: 'POST' });
      if (fallback.ok) {
        await loadStickerMeanings();
        await loadVenueStickers();
        try { onStickerUpdate && onStickerUpdate(venue.id); } catch { }
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
    if (!renameLabel.trim()) { alert('Label cannot be empty'); return; }
    if (renameLabel.length > 15) { alert('Label must be 15 characters or less'); return; }
    try {
      const response = await fetch(`/api/stickers/meanings/update?id=${renamingSticker.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color: renamingSticker.color, label: renameLabel, details: renamingSticker.details || '' })
      });
      if (response.ok) {
        await loadStickerMeanings();
        await loadVenueStickers();
        setShowRenameStickerDialog(false);
        setRenamingSticker(null);
        setRenameLabel('');
        if (onStickerUpdate) onStickerUpdate(venue.id);
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

  return (
    <ModalPortal>
      <VenueModalUI
        {...props}
        mode={mode}
        localNotes={localNotes}
        originalNotes={originalNotes}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        uploadingCount={uploadingCount}
        venueImages={venueImages}
        stickerMeanings={stickerMeanings}
        assignedStickers={assignedStickers}
        assignedStickerIds={assignedStickerIds}
        contextMenu={contextMenu}
        createData={createData}
        createErrors={createErrors}
        creating={creating}
        editData={editData}
        editErrors={editErrors}
        editingSaving={editingSaving}
        setEditData={setEditData}
        creationBorderColor={creationBorderColor}
        creationBadge={creationBadge}
        handleClose={handleClose}
        handleKeyDown={handleKeyDown}
        handleNotesChange={handleNotesChange}
        handleSave={handleSave}
        handleCreateSubmit={handleCreateSubmit}
        handleEditSubmit={handleEditSubmit}
        handleAssignSticker={handleAssignSticker}
        handleUnassignSticker={handleUnassignSticker}
        handleDeleteImage={handleDeleteImage}
        handleImageUpload={handleImageUpload}
        handleCreateStickerMeaning={handleCreateStickerMeaning}
        handleDeleteStickerMeaning={handleDeleteStickerMeaning}
        handleRenameStickerMeaning={handleRenameStickerMeaning}
        setContextMenu={setContextMenu}
        setCreateData={setCreateData}
        setShowCreateStickerDialog={setShowCreateStickerDialog}
        setShowRenameStickerDialog={setShowRenameStickerDialog}
        setRenamingSticker={setRenamingSticker}
        setRenameLabel={setRenameLabel}
        renamingSticker={renamingSticker}
        renameLabel={renameLabel}
        showCreateStickerDialog={showCreateStickerDialog}
        showRenameStickerDialog={showRenameStickerDialog}
        stickerFormData={stickerFormData}
        setStickerFormData={setStickerFormData}
        notesTextareaRef={notesTextareaRef}
        fileInputRef={fileInputRef}
        contextMenuRef={contextMenuRef}
        // picker state
        showLocalitySelect={showLocalitySelect}
        setShowLocalitySelect={setShowLocalitySelect}
        localities={localities}
        showRegionSelect={showRegionSelect}
        setShowRegionSelect={setShowRegionSelect}
        regions={regions}
        showTypeSelect={showTypeSelect}
        setShowTypeSelect={setShowTypeSelect}
        // image state
        hoveredImageId={hoveredImageId}
        setHoveredImageId={setHoveredImageId}
        clickedImageId={clickedImageId}
        setClickedImageId={setClickedImageId}
      />
    </ModalPortal>
  );
}

