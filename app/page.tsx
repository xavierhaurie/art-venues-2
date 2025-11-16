export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Art Venues - Authentication Test Page</h1>
      <p>M0-AUTH-01 Implementation - API endpoints are ready for testing</p>

      <h2>Available API Endpoints:</h2>

      <div style={{ marginTop: '2rem' }}>
        <h3>1. Magic Link Authentication</h3>
        <p><strong>Request Magic Link:</strong></p>
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
{`POST /api/auth/magic-link
Body: { "email": "test@example.com" }`}
        </pre>

        <p><strong>Verify Magic Link:</strong></p>
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
{`GET /api/auth/magic-link/verify?token=YOUR_TOKEN`}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>2. TOTP Setup (requires session)</h3>
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
{`POST /api/auth/totp/setup`}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>3. TOTP Verification (requires session)</h3>
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
{`POST /api/auth/totp/verify
Body: { "token": "123456" }`}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>4. Backup Codes (requires session)</h3>
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
{`GET /api/auth/backup-codes/count
POST /api/auth/backup-codes/generate`}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>5. Logout (requires session)</h3>
        <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
{`POST /api/auth/logout`}
        </pre>
      </div>

      <div style={{ marginTop: '3rem', padding: '1rem', background: '#e3f2fd', borderRadius: '4px' }}>
        <h3>Testing Instructions:</h3>
        <ol>
          <li>Use Postman, Insomnia, or cURL to test the API endpoints</li>
          <li>Start with requesting a magic link for an email</li>
          <li>Get the token from your database or email (if SMTP configured)</li>
          <li>Verify the magic link to get a session cookie</li>
          <li>Use the session cookie for subsequent requests</li>
        </ol>
        <p>📖 See <code>/docs/TESTING-GUIDE.md</code> for detailed testing instructions with cURL commands</p>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
        <h3>⚠️ Configuration Required:</h3>
        <ul>
          <li>Update <code>.env.local</code> with your Supabase credentials</li>
          <li>Apply <code>docs/schema.sql</code> to your database</li>
          <li>Apply <code>docs/auth-schema.sql</code> to your database</li>
          <li>Set JWT_SECRET and ENCRYPTION_KEY (32+ characters)</li>
        </ul>
      </div>
    </div>
  );
}

