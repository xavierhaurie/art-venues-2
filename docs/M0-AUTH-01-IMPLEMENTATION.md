# M0-AUTH-01 Implementation Guide

## Overview
Complete authentication system with:
- Magic-link email authentication
- OAuth (Google & Facebook/Meta)
- Mandatory TOTP (Time-based One-Time Password) on first login
- 10 backup codes (hashed storage)
- Session rotation on 2FA enable
- Rate limiting on all auth endpoints
- Comprehensive audit logging

## Architecture

### Database Schema
Location: `docs/auth-1.schema.sql`

Key tables:
- `magic_link_token` - Stores hashed magic link tokens
- `oauth_account` - Links OAuth providers to users
- `backup_code` - Stores hashed backup codes
- `user_session` - Tracks active sessions with JTI
- `rate_limit` - Rate limiting tracking

Extensions to `app_user`:
- `totp_secret` (encrypted) - TOTP secret key
- `totp_enabled` (boolean) - Whether 2FA is active
- `first_login_completed` (boolean) - First-time setup flag
- `last_login_at` (timestamp) - Last login tracking

### API Endpoints

#### Magic Link Authentication
```
POST /api/auth/magic-link
Body: { email: string }
Response: { message: string }
Rate limit: 5 requests/hour per email
```

```
GET /api/auth/magic-link/verify?token=xxx
Response: { requiresTOTPSetup: boolean, user: {...} }
Sets session cookie on success
```

#### OAuth Authentication
```
GET /api/auth/oauth/google/callback?code=xxx
Redirects to: /auth/setup-totp or /dashboard
Sets session cookie on success
```

```
GET /api/auth/oauth/facebook/callback?code=xxx
Redirects to: /auth/setup-totp or /dashboard
Sets session cookie on success
```

#### TOTP Management
```
POST /api/auth/totp/setup
Headers: Cookie: session=xxx
Response: { qrCode: string, backupCodes: string[] }
```

```
POST /api/auth/totp/verify
Headers: Cookie: session=xxx
Body: { token: string, isBackupCode?: boolean }
Response: { message: string, sessionRotated?: boolean }
Rate limit: 5 attempts/5 minutes per user
```

#### Backup Codes
```
POST /api/auth/backup-codes/generate
Headers: Cookie: session=xxx
Response: { backupCodes: string[] }
```

```
GET /api/auth/backup-codes/count
Headers: Cookie: session=xxx
Response: { count: number }
```

#### Logout
```
POST /api/auth/logout
Headers: Cookie: session=xxx
Response: { message: string }
Clears session cookie
```

## Security Features

### Encryption & Hashing
- **TOTP secrets**: AES-256-GCM encryption
- **Backup codes**: bcrypt hashing (salt rounds: 10)
- **Magic link tokens**: bcrypt hashing
- **Session tokens**: JWT signed with HS256

### Rate Limiting
Implemented per-IP and per-account:
- Magic link requests: 5/hour per email
- Login attempts: 5/15 minutes per IP
- TOTP verification: 5/5 minutes per user

### Session Management
- JWT with 7-day expiry
- Unique JTI (JWT ID) stored in database
- Session rotation on 2FA enable (revokes other sessions)
- Revocation checking on each request

### Audit Logging
All auth events logged to `audit_log`:
- `auth.magic_link.requested`
- `auth.magic_link.consumed`
- `auth.oauth.login`
- `auth.login.success`
- `auth.login.failed`
- `auth.totp.setup`
- `auth.totp.enabled`
- `auth.totp.verified`
- `auth.totp.failed`
- `auth.backup_code.used`
- `auth.session.created`
- `auth.session.revoked`
- `auth.rate_limit.exceeded`

## First Login Flow

1. User signs up/logs in via magic-link or OAuth
2. System checks `first_login_completed` flag
3. If false and `totp_enabled` false:
   - User redirected to TOTP setup page
   - Must scan QR code and verify token
   - Receives 10 backup codes to save
   - Session rotated, other sessions revoked
   - `first_login_completed` set to true
4. User can now access the application

## Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
JWT_SECRET=minimum_32_characters_random_string
ENCRYPTION_KEY=exactly_32_characters_string!!

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (for magic links)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@yourdomain.com

# Rate Limits (optional, defaults shown)
RATE_LIMIT_MAGIC_LINK_PER_HOUR=5
RATE_LIMIT_LOGIN_ATTEMPTS_PER_15MIN=5
RATE_LIMIT_TOTP_ATTEMPTS_PER_5MIN=5
```

## Setup Instructions

### 1. Database Setup
```bash
# Apply auth schema to your Supabase database
psql $DATABASE_URL -f docs/auth-1.schema.sql
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. OAuth Configuration

#### Google OAuth
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/api/auth/oauth/google/callback`
4. Add scopes: `email`, `profile`

#### Facebook OAuth
1. Go to Facebook Developers
2. Create app and add Facebook Login
3. Add redirect URI: `http://localhost:3000/api/auth/oauth/facebook/callback`
4. Request `email` permission

### 5. Run Development Server
```bash
npm run dev
```

## Testing

Run unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Test coverage includes:
- ✅ Crypto utilities (encrypt/decrypt, hash/verify)
- ✅ TOTP generation and verification
- ✅ Session creation and validation
- ✅ Backup code generation
- ✅ Rate limiting behavior

## Usage Examples

### Client-Side: Request Magic Link
```typescript
const response = await fetch('/api/auth/magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' }),
});
```

### Client-Side: Setup TOTP
```typescript
const response = await fetch('/api/auth/totp/setup', {
  method: 'POST',
  credentials: 'include', // Send session cookie
});

const { qrCode, backupCodes } = await response.json();
// Display qrCode image and backupCodes to user
```

### Client-Side: Verify TOTP
```typescript
const response = await fetch('/api/auth/totp/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ token: '123456' }),
});
```

### Server-Side: Protect Routes
```typescript
import { authMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  if (authResult) return authResult; // Returns 401 if unauthorized
  
  const session = (request as any).session;
  // Use session.userId, session.role, etc.
}
```

## Maintenance

### Cleanup Expired Tokens
Run periodically (e.g., daily cron job):
```sql
SELECT cleanup_expired_auth_tokens();
```

This removes:
- Consumed magic links older than 24 hours
- Expired unused magic links
- Expired sessions
- Old rate limit entries

## Security Considerations

1. **HTTPS Required**: All auth endpoints must use HTTPS in production
2. **Secret Rotation**: Rotate JWT_SECRET and ENCRYPTION_KEY periodically
3. **Monitoring**: Monitor audit logs for suspicious activity
4. **CSP Headers**: Configure Content Security Policy headers
5. **CORS**: Configure CORS properly for OAuth callbacks
6. **Email Security**: Use SPF, DKIM, and DMARC for magic link emails

## Acceptance Criteria Status

✅ Sign up/login via magic-link  
✅ Sign up/login via Google OAuth  
✅ Sign up/login via Facebook/Meta OAuth  
✅ Mandatory TOTP setup on first login  
✅ 10 backup codes generated (hashed storage)  
✅ Session rotation on 2FA enable  
✅ Rate limiting (per-IP and per-account)  
✅ Audit logging for all auth events  
✅ Encrypted TOTP secrets  
✅ Replay protection on magic links  
✅ Automated tests for core functionality  

## Next Steps

1. Build frontend UI components for auth flows
2. Implement role-based access control (M0-AUTH-02)
3. Add Row-Level Security policies (M0-AUTH-03)
4. Set up monitoring and alerting
5. Load testing for rate limiting
6. Security audit

