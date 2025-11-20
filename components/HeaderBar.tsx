'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export default function HeaderBar() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        setIsSignedIn(response.ok);
      } catch (err) {
        setIsSignedIn(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Sign out error:', err);
      window.location.reload();
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
        {isSignedIn && (
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
              transition: 'color 0.2s'
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
