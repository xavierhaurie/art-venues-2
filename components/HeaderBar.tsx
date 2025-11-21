'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';

export default function HeaderBar() {
  const { isAuthenticated, setIsAuthenticated } = useAuth();

  const handleSignOut = async () => {
    try {
      console.log('[HEADER] Signing out...');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('[HEADER] Logout response:', response.status);

      // Update auth state immediately
      setIsAuthenticated(false);

      // Redirect to home page after sign-out
      window.location.href = '/';
    } catch (err) {
      console.error('[HEADER] Sign out error:', err);
      // Still update state and redirect
      setIsAuthenticated(false);
      window.location.href = '/';
    }
  };

  return (
    <header
      style={{
        background: '#050505',
        borderBottom: '1px solid #111111',
        padding: '12px 20px',
        position: 'relative'
      }}
    >
      {/* Centered logo */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Image
          src="/logo.149x146.png"
          alt="Mini List"
          width={149}
          height={146}
          style={{ display: 'block' }}
        />

        {/* Sign-out link (only when signed in) */}
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            style={{
              position: 'absolute',
              right: 0,
              color: '#D1D5DB',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#D1D5DB';
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}

