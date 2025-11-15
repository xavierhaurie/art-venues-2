'use client';

import React from 'react';

const VENUE_TYPES = [
  'gallery - commercial',
  'gallery - non-profit',
  'library',
  'cafe-restaurant',
  'association',
  'market',
  'store',
  'online',
  'open studios',
  'public art',
  'other'
];

interface TypePickerModalProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  onClose: () => void;
}

export default function TypePickerModal({
  selectedType,
  onSelectType,
  onClose,
}: TypePickerModalProps) {
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
          zIndex: 10000
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
          zIndex: 10001,
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Select Venue Type</h2>
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

          {/* Content */}
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {VENUE_TYPES.map((type) => {
                const isSelected = selectedType === type;
                return (
                  <div
                    key={type}
                    onClick={() => {
                      onSelectType(type);
                      onClose();
                    }}
                    style={{
                      backgroundColor: isSelected ? '#fed7aa' : '#e5e7eb',
                      fontSize: '14px',
                      padding: '10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      border: '2px solid transparent',
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#d1d5db';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }}
                  >
                    {type}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {selectedType ? `Selected: ${selectedType}` : 'No type selected'}
            </div>
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
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

