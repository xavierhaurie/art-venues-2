'use client';

import React from 'react';

interface Locality { id: string; name: string; }
interface LocalityPickerModalProps {
  localities: Locality[];
  selectedLocalities: string[];
  onToggleLocality: (localityName: string) => void;
  onClear: () => void;
  onClose: () => void;
  singleSelect?: boolean;
  title?: string;
}

export default function LocalityPickerModal(props: LocalityPickerModalProps) {
  const { localities, selectedLocalities, onToggleLocality, onClear, onClose, singleSelect = false, title } = props;

  return (
    <>
      <div
        style={{ position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', zIndex:10000 }}
        onClick={onClose}
      />
      <div
        style={{ position:'fixed', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10001, pointerEvents:'none' }}
      >
        <div
          style={{ backgroundColor:'white', borderRadius:8, width:'100%', maxWidth:'56rem', maxHeight:'90vh', display:'flex', flexDirection:'column', pointerEvents:'auto', fontFamily:'Arial, Helvetica, sans-serif' }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.5rem', borderBottom:'1px solid #e5e7eb' }}>
            <h2 style={{ fontSize:'1.5rem', fontWeight:600, margin:0 }}>{title || (singleSelect ? 'Select Locality' : 'Select Localities')}</h2>
            <button type="button" onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'2rem', fontWeight:'bold', cursor:'pointer', padding:0, lineHeight:1 }}>×</button>
          </div>
          <div style={{ padding:'1.5rem', flex:1, overflow:'auto' }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {localities.map(loc => {
                const isSelected = selectedLocalities.includes(loc.name);
                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      if (singleSelect) {
                        onToggleLocality(isSelected ? '' : loc.name);
                      } else {
                        onToggleLocality(loc.name);
                      }
                    }}
                    style={{
                      backgroundColor: isSelected ? '#fed7aa' : '#e5e7eb',
                      fontSize:'14px', padding:'10px', borderRadius:'5px', cursor:'pointer', fontWeight:500,
                      border:'2px solid transparent', transition:'all 0.2s', userSelect:'none'
                    }}
                    onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.backgroundColor = '#d1d5db'; }}
                    onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                  >{loc.name}</div>
                );
              })}
            </div>
          </div>
          <div style={{ padding:'1.5rem', borderTop:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'0.875rem', color:'#6b7280' }}>
              {singleSelect ? (
                selectedLocalities.length === 0 ? 'No locality selected' : selectedLocalities[0]
              ) : selectedLocalities.length === 0 ? (
                'No localities selected (showing all venues)'
              ) : selectedLocalities.length === 1 ? (
                '1 locality selected'
              ) : (
                `${selectedLocalities.length} localities selected`
              )}
            </div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button
                type="button"
                onClick={onClear}
                style={{ padding:'0.5rem 1rem', backgroundColor:'#e5e7eb', color:'#374151', border:'none', borderRadius:6, fontSize:'0.875rem', fontWeight:500, cursor:'pointer' }}
                onMouseEnter={e=> e.currentTarget.style.backgroundColor='#d1d5db'}
                onMouseLeave={e=> e.currentTarget.style.backgroundColor='#e5e7eb'}
              >Clear</button>
              <button
                type="button"
                onClick={onClose}
                style={{ padding:'0.5rem 1rem', backgroundColor:'#3b82f6', color:'white', border:'none', borderRadius:6, fontSize:'0.875rem', fontWeight:500, cursor:'pointer' }}
                onMouseEnter={e=> e.currentTarget.style.backgroundColor='#2563eb'}
                onMouseLeave={e=> e.currentTarget.style.backgroundColor='#3b82f6'}
              >Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
