// app/billing/cancelled/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function BillingCancelledPage() {
  const router = useRouter();

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
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 12, color: '#111827' }}>Subscription Cancelled</h1>
        <p style={{ fontSize: '0.95rem', marginBottom: 24, color: '#6B7280' }}>
          You cancelled the subscription process. No charges have been made.
        </p>
        <p style={{ fontSize: '0.85rem', marginBottom: 24, color: '#9CA3AF' }}>
          You can restart the subscription process anytime from your account.
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
            fontWeight: 600,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#000'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#111827'}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

