'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function FeedbackConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success'>('processing');

  useEffect(() => {
    const email = searchParams.get('email');

    if (email) {
      // Store confirmed email in sessionStorage
      sessionStorage.setItem('confirmed_feedback_email', email);
      setStatus('success');

      // Redirect to venues page after 3 seconds
      setTimeout(() => {
        router.push('/venues');
      }, 3000);
    }
  }, [searchParams, router]);

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '50px auto',
      padding: '20px',
      textAlign: 'center'
    }}>
      {status === 'processing' && (
        <>
          <h1>Processing...</h1>
          <div style={{ marginTop: '20px' }}>
            <div style={{
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}

      {status === 'success' && (
        <>
          <h1 style={{ color: '#10b981' }}>✓ Thank You!</h1>
          <p style={{ color: '#374151', lineHeight: 1.6 }}>
            Your feedback has been successfully submitted. Our team will review your message and respond to <strong>{searchParams.get('email')}</strong> if needed.
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
            Redirecting you back to Art Venues...
          </p>
          <a
            href="/venues"
            style={{
              display: 'inline-block',
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px'
            }}
          >
            Return Now
          </a>
        </>
      )}
    </div>
  );
}

