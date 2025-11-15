'use client';

import React, { useState } from 'react';

interface FeedbackModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function FeedbackModal({ onClose, onSuccess }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!message.trim()) { setError('Please enter a message'); return; }
    if (message.length > 5000) { setError('Message is too long (max 5000 characters)'); return; }
    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to submit message');
      onSuccess(message.trim()); // parent will close + show popup
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10000 }} onClick={onClose} />
      <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10001, pointerEvents:'none' }}>
        <div style={{ background:'#fff', borderRadius:8, width:'100%', maxWidth:500, maxHeight:'90vh', display:'flex', flexDirection:'column', pointerEvents:'auto', fontFamily:'Arial, Helvetica, sans-serif' }} onClick={(e)=>e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.5rem', borderBottom:'1px solid #e5e7eb' }}>
            <h2 style={{ fontSize:'1.5rem', fontWeight:600, margin:0 }}>Help & Feedback</h2>
            <button type='button' onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'2rem', fontWeight:'bold', cursor:'pointer', padding:0, lineHeight:1 }}>×</button>
          </div>
          <div style={{ padding:'1.5rem', flex:1, overflow:'auto' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:'1rem' }}>
                <label htmlFor='feedback-message' style={{ display:'block', fontSize:'0.875rem', fontWeight:500, marginBottom:'0.5rem', color:'#374151' }}>Message</label>
                <textarea id='feedback-message' value={message} onChange={e=>setMessage(e.target.value)} placeholder='Tell us how we can help or share your feedback...' rows={6} style={{ width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6, fontSize:'1rem', resize:'vertical', fontFamily:'Arial, Helvetica, sans-serif' }} />
                <div style={{ fontSize:'0.75rem', color:'#6b7280', marginTop:'0.25rem' }}>{message.length} / 5000 characters</div>
              </div>
              {error && <div style={{ padding:'0.75rem', background:'#fee2e2', color:'#991b1b', borderRadius:6, fontSize:'0.875rem', marginBottom:'1rem' }}>{error}</div>}
              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                <button type='button' onClick={onClose} disabled={isSubmitting} style={{ padding:'0.5rem 1rem', background:'#e5e7eb', color:'#374151', border:'none', borderRadius:6, fontSize:'0.875rem', fontWeight:500, cursor:isSubmitting?'not-allowed':'pointer', opacity:isSubmitting?0.5:1 }} onMouseEnter={e=>{ if(!isSubmitting) e.currentTarget.style.background='#d1d5db'; }} onMouseLeave={e=>{ if(!isSubmitting) e.currentTarget.style.background='#e5e7eb'; }}>Cancel</button>
                <button type='submit' disabled={isSubmitting} style={{ padding:'0.5rem 1rem', background:isSubmitting?'#93c5fd':'#3b82f6', color:'#fff', border:'none', borderRadius:6, fontSize:'0.875rem', fontWeight:500, cursor:isSubmitting?'not-allowed':'pointer' }} onMouseEnter={e=>{ if(!isSubmitting) e.currentTarget.style.background='#2563eb'; }} onMouseLeave={e=>{ if(!isSubmitting) e.currentTarget.style.background='#3b82f6'; }}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
