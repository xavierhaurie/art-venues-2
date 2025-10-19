'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function TotpSetupPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [manualEntry, setManualEntry] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const router = useRouter();

  useEffect(() => {
    setupTotp();
  }, []);

  const setupTotp = async () => {
    try {
      const response = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to setup TOTP');
      }

      const data = await response.json();
      setSecret(data.secret);
      setManualEntry(data.manualEntry);

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(data.qrCodeUrl);
      setQrCodeUrl(qrUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to setup TOTP');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid code');
      }

      // Generate backup codes
      const backupResponse = await fetch('/api/auth/backup-codes/generate', {
        method: 'POST',
        credentials: 'include',
      });

      if (!backupResponse.ok) {
        throw new Error('Failed to generate backup codes');
      }

      const backupData = await backupResponse.json();
      setBackupCodes(backupData.codes);
      setStep('backup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'art-venues-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'setup') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: '600' }}>
            Set Up Two-Factor Authentication
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {qrCodeUrl && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <img src={qrCodeUrl} alt="TOTP QR Code" style={{ maxWidth: '100%' }} />
            </div>
          )}

          {manualEntry && (
            <div style={{
              background: '#f5f5f5',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                Can't scan? Enter this code manually:
              </p>
              <code style={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}>
                {manualEntry}
              </code>
            </div>
          )}

          <button
            onClick={() => setStep('verify')}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#5568d3'}
            onMouseOut={(e) => e.currentTarget.style.background = '#667eea'}
          >
            Next: Verify Code
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: '600' }}>
            Verify Your Code
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Enter the 6-digit code from your authenticator app
          </p>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontFamily: 'monospace'
              }}
            />

            <button
              type="submit"
              disabled={loading || token.length !== 6}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: token.length === 6 ? '#667eea' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: token.length === 6 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={() => setStep('setup')}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Back to QR Code
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: '600' }}>
            Save Your Backup Codes
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </p>

          <div style={{
            background: '#f5f5f5',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            {backupCodes.map((code, index) => (
              <div key={index} style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                padding: '0.5rem',
                borderBottom: index < backupCodes.length - 1 ? '1px solid #e0e0e0' : 'none'
              }}>
                {code}
              </div>
            ))}
          </div>

          <button
            onClick={downloadBackupCodes}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'transparent',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            📥 Download Backup Codes
          </button>

          <button
            onClick={handleComplete}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#5568d3'}
            onMouseOut={(e) => e.currentTarget.style.background = '#667eea'}
          >
            Continue to Dashboard
          </button>

          <p style={{
            fontSize: '0.875rem',
            color: '#999',
            textAlign: 'center',
            marginTop: '1rem'
          }}>
            ⚠️ Each code can only be used once
          </p>
        </div>
      </div>
    );
  }

  return null;
}

