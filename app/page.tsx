'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Check if user is signed in
  React.useEffect(() => {
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

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAuthModal) {
        setShowAuthModal(false);
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
        // Sign in logic - connect to your auth backend
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (response.ok) {
          router.push('/venues');
        } else {
          const data = await response.json();
          setError(data.error || 'Sign in failed');
        }
      } else {
        // Sign up logic
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (response.ok) {
          router.push('/venues');
        } else {
          const data = await response.json();
          setError(data.error || 'Sign up failed');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAuthModal = () => {
    setShowAuthModal(true);
    setAuthMode('signin');
  };

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
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* HeaderBar now comes from RootLayout */}

      {/* Hero Section with Centered Logo */}
      <section style={{
        background: '#FFFFFF',
        padding: '80px 20px 60px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Centered Square Logo */}
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

      {/* Auth Modal */}
      {showAuthModal && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000
            }}
            onClick={() => setShowAuthModal(false)}
          />
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
          }}>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                width: '100%',
                maxWidth: 440,
                padding: '40px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* X Close Button */}
              <button
                onClick={() => setShowAuthModal(false)}
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
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                aria-label="Close"
              >
                ×
              </button>

              <h2 style={{
                fontSize: '1.875rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#111827'
              }}>
                {authMode === 'signin' ? 'Sign in' : 'Create account'}
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                marginBottom: '32px'
              }}>
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
                      color: '#111827'
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
                      fontSize: '1rem'
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
                      color: '#111827'
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
                      fontSize: '1rem'
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
                    marginBottom: '20px'
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
                    marginBottom: '16px'
                  }}
                >
                  {isSubmitting
                    ? 'Please wait...'
                    : authMode === 'signin' ? 'Sign in' : 'Create account'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#111827',
                      fontSize: '0.875rem',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    {authMode === 'signin'
                      ? 'Need an account? Sign up'
                      : 'Already have an account? Sign in'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
