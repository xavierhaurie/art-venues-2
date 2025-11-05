'use client';

import React from 'react';

interface StickerMeaning {
  id: string;
  label: string;
  color: string;
  details: string | null;
}

interface StickerPickerModalProps {
  stickerMeanings: StickerMeaning[];
  selectedStickerFilters: string[];
  onToggleSticker: (stickerId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function StickerPickerModal({
  stickerMeanings,
  selectedStickerFilters,
  onToggleSticker,
  onClear,
  onClose,
}: StickerPickerModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9998
        }}
        onClick={onClose}
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
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: '56rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Select Stickers</h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Content - Scrollable */}
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {stickerMeanings.map((sticker) => {
                const isSelected = selectedStickerFilters.includes(sticker.id);
                return (
                  <div
                    key={sticker.id}
                    onClick={() => onToggleSticker(sticker.id)}
                    style={{
                      backgroundColor: sticker.color,
                      fontSize: '14px',
                      padding: '10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      border: '2px solid transparent',
                      transition: 'all 0.2s',
                      userSelect: 'none',
                      // Desaturate and make semi-transparent when not selected
                      filter: isSelected ? 'none' : 'saturate(0.3) brightness(1.2)',
                      opacity: isSelected ? 1 : 0.6
                    }}
                    title={sticker.details || sticker.label}
                  >
                    {sticker.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {selectedStickerFilters.length === 0 ? (
                'No stickers selected (showing all venues)'
              ) : selectedStickerFilters.length === 1 ? (
                '1 sticker selected'
              ) : (
                `${selectedStickerFilters.length} stickers selected`
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClear}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
