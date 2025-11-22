// app/billing/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setMessage('Missing checkout session ID.');
      return;
    }

    const confirm = async () => {
      try {
        console.log('[BILLING/SUCCESS] Confirming session:', sessionId);

        // Get current user
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!meRes.ok) {
          setStatus('error');
          setMessage('You must be signed in to confirm your subscription.');
          return;
        }
        const meData = await meRes.json();
        const userId = meData.user?.id;

        if (!userId) {
          setStatus('error');
          setMessage('Could not determine current user.');
          return;
        }

        console.log('[BILLING/SUCCESS] Confirming for user:', userId);

        const res = await fetch('/api/billing/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error('[BILLING/SUCCESS] Confirmation failed:', data);
          setStatus('error');
          setMessage(data.error || 'Failed to confirm subscription.');
          return;
        }

        console.log('[BILLING/SUCCESS] ✅ Subscription confirmed:', data);
        setStatus('ok');
        setMessage('Your subscription is active! You now have full access.');
      } catch (err) {
        console.error('[BILLING/SUCCESS] Error confirming subscription:', err);
        setStatus('error');
        setMessage('Unexpected error confirming subscription.');
      }
    };

    confirm();
  }, [searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
      <div style={{
        maxWidth: 480,
        padding: 32,
        borderRadius: 12,
        background: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        {status === 'pending' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #E5E7EB',
              borderTop: '4px solid #111827',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 12 }}>Finalizing your subscription...</h1>
            <p style={{ fontSize: '0.95rem', color: '#6B7280' }}>
              Please wait while we confirm your payment with Stripe.
            </p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}

        {status === 'ok' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 12, color: '#111827' }}>Welcome to Art Venues!</h1>
            <p style={{ fontSize: '0.95rem', marginBottom: 24, color: '#6B7280' }}>
              {message}
            </p>
            <p style={{ fontSize: '0.85rem', marginBottom: 24, color: '#9CA3AF' }}>
              Your 30-day free trial has started. You won't be charged until the trial ends.
            </p>
            <button
              onClick={() => router.push('/venues')}
              style={{
                padding: '12px 24px',
                borderRadius: 6,
                border: 'none',
                background: '#111827',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#000'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#111827'}
            >
              Go to Venues
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 12, color: '#DC2626' }}>Subscription Error</h1>
            <p style={{ fontSize: '0.95rem', marginBottom: 24, color: '#6B7280' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 24px',
                borderRadius: 6,
                border: 'none',
                background: '#111827',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

