'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { setIsAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [signinInlineMessage, setSigninInlineMessage] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showSignupInstructionOnly, setShowSignupInstructionOnly] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [justConfirmedSignup, setJustConfirmedSignup] = useState(false);

  // Check for redirect parameter (from protected route) OR Supabase hash
  useEffect(() => {
    // 1) Existing query-param based handling
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);
    const redirect = (params.get('redirect') || '').toLowerCase().trim();

    if (redirect === 'auth') {
      // User tried to access a protected page while unauthenticated
      setAuthMessage('You must sign in before you can access this page');
      setSigninInlineMessage('');
      setAwaitingEmailConfirmation(false);
      setJustConfirmedSignup(false);
      setShowSignupInstructionOnly(false);
      setShowAuthModal(true);
      setAuthMode('signin');
      window.history.replaceState({}, '', '/');
      return;
    }

    if (redirect === 'email_confirmation') {
      // User just signed up; we want the signup instruction-only state
      setAwaitingEmailConfirmation(true);
      setJustConfirmedSignup(false);
      setShowSignupInstructionOnly(true);
      setShowAuthModal(true);
      setAuthMode('signup');
      setAuthMessage('In order to create your account, please follow the instructions we sent to your email.');
      setSigninInlineMessage('');
      window.history.replaceState({}, '', '/');
      return;
    }

    if (redirect === 'confirmed') {
      // Our own confirmed flag (kept for completeness, but Supabase is currently using hash)
      setAwaitingEmailConfirmation(false);
      setJustConfirmedSignup(true);
      setShowSignupInstructionOnly(false);
      setShowAuthModal(true);
      setAuthMode('signin');
      setAuthMessage('');
      setSigninInlineMessage('Your account was created. Please sign-in below:');
      window.history.replaceState({}, '', '/');
      return;
    }

    if (redirect === 'billing') {
      // User needs to subscribe - show billing modal
      setAwaitingEmailConfirmation(false);
      setJustConfirmedSignup(false);
      setShowSignupInstructionOnly(false);
      setShowAuthModal(false);
      setAuthMessage('');
      setSigninInlineMessage('');
      // Trigger billing flow directly by calling checkout
      handleStartSubscription();
      window.history.replaceState({}, '', '/');
      return;
    }

    // 2) Supabase hash-based flow: http://localhost:3000/#access_token=...&type=signup
    if (typeof window !== 'undefined' && window.location.hash) {
      const rawHash = window.location.hash; // e.g. '#access_token=...&type=signup'
      // Strip leading '#' and parse as query string
      const hashString = rawHash.startsWith('#') ? rawHash.substring(1) : rawHash;
      const hashParams = new URLSearchParams(hashString);
      const typeParam = (hashParams.get('type') || '').toLowerCase().trim();

      if (typeParam === 'signup') {
        // Treat this as: "user has just confirmed their account via magic link"
        setAwaitingEmailConfirmation(false);
        setJustConfirmedSignup(true);
        setShowSignupInstructionOnly(false);
        setShowAuthModal(true);
        setAuthMode('signin');
        setAuthMessage('');
        setSigninInlineMessage('Your account was created. Please sign-in below:');

        // Clear the hash so reloads / navigation are clean
        window.location.hash = '';
      }
    }
  }, []);

  // Check if user is signed in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        setIsSignedIn(response.ok);
      } catch (err) {
        setIsSignedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAuthModal) {
        handleCloseAuthModal();
      }
    };

    if (showAuthModal) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAuthModal]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (authMode === 'signin') {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        if (response.ok) {
          setIsAuthenticated(true);
          router.push('/venues');
        } else {
          const data = await response.json();
          setError(data.error || 'Sign in failed');
        }
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        if (response.ok) {
          // Keep modal open, hide form elements, and show only the requested message.
          setIsAuthenticated(false);
          setShowAuthModal(true);
          setAuthMode('signup');
          setShowSignupInstructionOnly(true);
          setAuthMessage('In order to create your account, please follow the instructions we sent to your email.');
          setSigninInlineMessage('');
          setAwaitingEmailConfirmation(true);
        } else {
          const data = await response.json();
          setError(data.error || 'Sign up failed');
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAuthModal = () => {
    setShowAuthModal(true);
    setAuthMode('signin');
    setAuthMessage('');
    setSigninInlineMessage('');
    setError('');
    setShowSignupInstructionOnly(false);
    setAwaitingEmailConfirmation(false);
    setJustConfirmedSignup(false);
  };

  const handleAuthModeChange = (newMode: 'signin' | 'signup') => {
    setAuthMode(newMode);
    setAuthMessage('');
    setSigninInlineMessage('');
    setError('');
    setShowSignupInstructionOnly(false);
    // If switching modes manually, we’re not in the magic-link or signup-complete flows anymore.
    setAwaitingEmailConfirmation(false);
    setJustConfirmedSignup(false);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    setAuthMessage('');
    setSigninInlineMessage('');
    setError('');
    setShowSignupInstructionOnly(false);
    setAwaitingEmailConfirmation(false);
    setJustConfirmedSignup(false);
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setIsAuthenticated(false);
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleStartSubscription = async () => {
    try {
      console.log('[HOME] Starting subscription checkout...');
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error('[HOME] Checkout error:', data);
        const errorMsg = data.details
          ? `${data.error}\n\nDetails: ${data.details}`
          : data.error || 'Could not start subscription';
        alert(`Checkout session creation failed:\n\n${errorMsg}`);
        return;
      }
      console.log('[HOME] Redirecting to Stripe Checkout:', data.url);
      window.location.href = data.url;
    } catch (err) {
      console.error('[HOME] Unexpected error:', err);
      alert('Unexpected error creating subscription');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* Hero Section with Centered Logo */}
      <section style={{
        background: '#FFFFFF',
        padding: '80px 20px 60px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Centered Square Logo (always shown now; header logo unchanged) */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px'
          }}>
            <Image
              src="/logo.webp"
              alt="Mini List"
              width={120}
              height={120}
              style={{ display: 'block' }}
            />
          </div>

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '24px',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>
            Venue lists for artists
          </h1>
          <p style={{
            fontSize: '1.5rem',
            color: '#6B7280',
            marginBottom: '48px',
            lineHeight: 1.5,
            maxWidth: '700px',
            margin: '0 auto 48px'
          }}>
            Find your way in the world of opportunities for showing and selling your art - from local markets to high-end galleries
          </p>
          <button
            onClick={openAuthModal}
            style={{
              padding: '18px 48px',
              fontSize: '1.125rem',
              fontWeight: 600,
              background: '#111827',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#000000';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111827';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Take me to the Boston list
          </button>
        </div>
      </section>

      {/* What You'll Get Section */}
      <section style={{
        padding: '80px 20px',
        background: '#FAFAFA'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '60px',
            textAlign: 'center',
            letterSpacing: '-0.02em'
          }}>
            What you'll get
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            {/* Card 1 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '40px 32px',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '20px',
                color: '#111827'
              }}>📍</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Comprehensive directory
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                lineHeight: 1.6
              }}>
                Explore galleries, studios, markets, and exhibition spaces across Greater Boston
              </p>
            </div>

            {/* Card 2 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '40px 32px',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '20px',
                color: '#111827'
              }}>✏️</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Personal notes & stickers
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                lineHeight: 1.6
              }}>
                Organize venues your way with custom notes, colored stickers, and personal tags
              </p>
            </div>

            {/* Card 3 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '40px 32px',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '20px',
                color: '#111827'
              }}>🔍</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Smart filtering
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                lineHeight: 1.6
              }}>
                Filter by location, venue type, transit access, and more to find exactly what you need
              </p>
            </div>

            {/* Card 4 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '40px 32px',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '20px',
                color: '#111827'
              }}>📸</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Image galleries
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                lineHeight: 1.6
              }}>
                Upload and view photos of venues, exhibitions, and your work displayed there
              </p>
            </div>

            {/* Card 5 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '40px 32px',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '20px',
                color: '#111827'
              }}>🚇</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Transit information
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                lineHeight: 1.6
              }}>
                Know which venues are accessible by public transportation
              </p>
            </div>

            {/* Card 6 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '40px 32px',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '20px',
                color: '#111827'
              }}>📊</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Export your data
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6B7280',
                lineHeight: 1.6
              }}>
                Download your venue list as CSV for use in spreadsheets or other tools
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* A Sampler Section */}
      <section style={{
        padding: '80px 20px',
        background: '#FFFFFF'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '60px',
            textAlign: 'center',
            letterSpacing: '-0.02em'
          }}>
            A Sampler
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px'
          }}>
            {/* Snapshot 1 - Details Modal */}
            <div
              onClick={openAuthModal}
              style={{
                background: '#FAFAFA',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '24px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#111827';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🖼️</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Venue Details
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                textAlign: 'center'
              }}>
                View detailed information, images, and your notes
              </p>
            </div>

            {/* Snapshot 2 - List with Tooltip */}
            <div
              onClick={openAuthModal}
              style={{
                background: '#FAFAFA',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '24px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#111827';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Interactive List
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                textAlign: 'center'
              }}>
                Browse venues with helpful tooltips and previews
              </p>
            </div>

            {/* Snapshot 3 - Custom Venue Form */}
            <div
              onClick={openAuthModal}
              style={{
                background: '#FAFAFA',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '24px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#111827';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Add Your Own
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                textAlign: 'center'
              }}>
                Create custom venue entries for places you discover
              </p>
            </div>

            {/* Snapshot 4 - Filtering */}
            <div
              onClick={openAuthModal}
              style={{
                background: '#FAFAFA',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '24px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#111827';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚡</div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Advanced Filters
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                textAlign: 'center'
              }}>
                Find venues by location, type, transit, and more
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Passive email-confirmation message when user has just signed up */}
      {awaitingEmailConfirmation && (
        <section
          style={{
            padding: '40px 20px',
            background: '#F9FAFB',
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
              padding: '24px 28px',
              background: '#FFFFFF',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#111827',
              }}
            >
              Check your email
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#374151',
                lineHeight: 1.6,
              }}
            >
              Please follow the instructions in the message we sent to your email address.
              Once you confirm your email, you&apos;ll be able to sign in and access your venues.
            </p>
          </div>
        </section>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
            onClick={handleCloseAuthModal}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                width: '100%',
                maxWidth: 440,
                padding: '40px',
                boxShadow:
                  '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* X Close Button */}
              <button
                onClick={handleCloseAuthModal}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                aria-label="Close"
              >
                ×
              </button>

              <h2
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: '#111827',
                }}
              >
                {authMode === 'signin' ? 'Sign in' : 'Create account'}
              </h2>

              {authMessage && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    marginBottom: '16px',
                    border: '1px solid #FCD34D',
                  }}
                >
                  {authMessage}
                </div>
              )}

              {/* Only hide the form in the "signup message only" state; still show inline message and form after magic link */}
              {!showSignupInstructionOnly && (
                <>
                  {/* Inline message for magic-link completion, above the form */}
                  {signinInlineMessage && authMode === 'signin' && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#ECFDF5',
                        color: '#065F46',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        marginBottom: '16px',
                        border: '1px solid #A7F3D0',
                      }}
                    >
                      {signinInlineMessage}
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#6B7280',
                      marginBottom: '32px',
                    }}
                  >
                    {authMode === 'signin'
                      ? 'Welcome back! Enter your credentials to continue.'
                      : 'Get started with your free account.'}
                  </p>

                  <form onSubmit={handleAuthSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                      <label
                        htmlFor="email"
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          marginBottom: '8px',
                          color: '#111827',
                        }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: 6,
                          fontSize: '1rem',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label
                        htmlFor="password"
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          marginBottom: '8px',
                          color: '#111827',
                        }}
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: 6,
                          fontSize: '1rem',
                        }}
                      />
                    </div>

                    {error && (
                      <div style={{
                        padding: '12px',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: 6,
                        fontSize: '0.875rem',
                        marginBottom: '20px',
                      }}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isSubmitting ? '#9CA3AF' : '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        marginBottom: '16px',
                      }}
                    >
                      {isSubmitting
                        ? 'Please wait...'
                        : authMode === 'signin' ? 'Sign in' : 'Create account'}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleAuthModeChange(authMode === 'signin' ? 'signup' : 'signin')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#111827',
                          fontSize: '0.875rem',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        {authMode === 'signin'
                          ? 'Need an account? Sign up'
                          : 'Already have an account? Sign in'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

