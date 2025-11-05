'use client';

import React from 'react';

interface OtherFiltersModalProps {
  transitKnown: boolean;
  onToggleTransitKnown: (value: boolean) => void;
  onClose: () => void;
}

export default function OtherFiltersModal({ transitKnown, onToggleTransitKnown, onClose }: OtherFiltersModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}
      >
        <div
          style={{ backgroundColor: 'white', borderRadius: 8, width: '100%', maxWidth: '40rem', maxHeight: '70vh', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', fontFamily: 'Arial, Helvetica, sans-serif' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Other filters</h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <div
                onClick={() => onToggleTransitKnown(!transitKnown)}
                style={{
                  backgroundColor: transitKnown ? '#fed7aa' : '#e5e7eb',
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
                  if (!transitKnown) e.currentTarget.style.backgroundColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  if (!transitKnown) e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
              >
                Know to be accessible by public transit
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              onClick={() => onToggleTransitKnown(false)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
            >
              Clear
            </button>
            <button
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
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

