'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No token provided');
      setVerifying(false);
      return;
    }

    // Call the API route to verify the token
    fetch(`/api/auth/magic-link/verify?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Verification failed');
        }
        return res.json();
      })
      .then((data) => {
        // Check if TOTP setup is required
        if (data.requiresTOTPSetup) {
          router.push('/totp-setup');
        } else {
          router.push('/dashboard');
        }
      })
      .catch((err) => {
        console.error('Verification error:', err);
        setError(err.message || 'Failed to verify magic link');
        setVerifying(false);
      });
  }, [searchParams, router]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your magic link...</h2>
          <p className="text-gray-600">Please wait while we sign you in.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/auth"
              className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Request a new magic link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

