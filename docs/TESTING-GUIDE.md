# Manual Testing Guide for M0-AUTH-01

## Prerequisites

1. **Start the development server**:
   ```powershell
   cd C:\Users\xavie\projects\Artist-Copilot\art-venues-2
   npm run dev
   ```
   Server should start at: **http://localhost:3000**

2. **Apply database schema** to your Supabase instance:
   - Run `docs/1.schema.sql` first
   - Then run `docs/auth-1.schema.sql`

3. **Configure `.env.local`** with valid credentials

## API Endpoints for Manual Testing

### 1. Magic Link Authentication

#### Request Magic Link
**Endpoint**: `POST http://localhost:3000/api/auth/magic-link`

**Test with cURL**:
```powershell
curl -X POST http://localhost:3000/api/auth/magic-link `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\"}'
```

**Test with Postman/Insomnia**:
- Method: POST
- URL: `http://localhost:3000/api/auth/magic-link`
- Body (JSON):
  ```json
  {
    "email": "test@example.com"
  }
  ```

**Expected Response**:
```json
{
  "message": "Magic link sent to your email"
}
```

#### Verify Magic Link
**Endpoint**: `GET http://localhost:3000/api/auth/magic-link/verify?token=YOUR_TOKEN`

**Test in Browser**:
- After requesting a magic link, check your database for the token
- Or intercept the email link (if SMTP configured)
- Visit: `http://localhost:3000/api/auth/magic-link/verify?token=abc123...`

**Expected Response**:
```json
{
  "requiresTOTPSetup": true,
  "user": {
    "id": "user-uuid",
    "email": "test@example.com",
    "name": null,
    "role": "artist",
    "totp_enabled": false
  }
}
```
- Sets session cookie
- Returns `requiresTOTPSetup: true` for first-time users

---

### 2. TOTP Setup

#### Initialize TOTP Setup
**Endpoint**: `POST http://localhost:3000/api/auth/totp/setup`

**Test with cURL** (must have session cookie):
```powershell
curl -X POST http://localhost:3000/api/auth/totp/setup `
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

**Test with Postman**:
- Method: POST
- URL: `http://localhost:3000/api/auth/totp/setup`
- Must have session cookie from magic link verification

**Expected Response**:
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "..."
  ],
  "message": "Scan the QR code with your authenticator app"
}
```

**What to do**:
1. Copy the QR code data URL
2. Open in browser or decode to image
3. Scan with Google Authenticator / Authy
4. Save the backup codes
5. Use the 6-digit code from your app for verification

#### Verify TOTP Token
**Endpoint**: `POST http://localhost:3000/api/auth/totp/verify`

**Test with cURL**:
```powershell
curl -X POST http://localhost:3000/api/auth/totp/verify `
  -H "Content-Type: application/json" `
  -H "Cookie: session=YOUR_SESSION_TOKEN" `
  -d '{\"token\":\"123456\"}'
```

**Body (JSON)**:
```json
{
  "token": "123456"
}
```

**Expected Response** (first time setup):
```json
{
  "message": "TOTP enabled successfully",
  "sessionRotated": true
}
```
- New session cookie issued
- Other sessions revoked
- User marked as completed first login

#### Verify Backup Code
**Endpoint**: `POST http://localhost:3000/api/auth/totp/verify`

**Body (JSON)**:
```json
{
  "token": "A1B2C3D4",
  "isBackupCode": true
}
```

---

### 3. Backup Code Management

#### Get Backup Code Count
**Endpoint**: `GET http://localhost:3000/api/auth/backup-codes/count`

**Test in Browser**:
```
http://localhost:3000/api/auth/backup-codes/count
```
(Must have session cookie)

**Expected Response**:
```json
{
  "count": 10
}
```

#### Regenerate Backup Codes
**Endpoint**: `POST http://localhost:3000/api/auth/backup-codes/generate`

**Test with cURL**:
```powershell
curl -X POST http://localhost:3000/api/auth/backup-codes/generate `
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

**Expected Response**:
```json
{
  "backupCodes": [
    "NEW1CODE",
    "NEW2CODE",
    "..."
  ],
  "message": "New backup codes generated. Store them securely."
}
```

---

### 4. OAuth Authentication

#### Google OAuth
**Endpoint**: `GET http://localhost:3000/api/auth/oauth/google/callback?code=AUTH_CODE`

**Manual Test**:
1. Set up Google OAuth app in Google Cloud Console
2. Configure redirect URI: `http://localhost:3000/api/auth/oauth/google/callback`
3. Navigate to Google OAuth URL:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_GOOGLE_CLIENT_ID&
     redirect_uri=http://localhost:3000/api/auth/oauth/google/callback&
     response_type=code&
     scope=email%20profile
   ```
4. After authorization, you'll be redirected to callback with code
5. Callback processes the code and creates/logs in user

**Expected Result**:
- Redirects to `/auth/setup-totp` (first login) or `/dashboard`
- Session cookie set

#### Facebook OAuth
**Endpoint**: `GET http://localhost:3000/api/auth/oauth/facebook/callback?code=AUTH_CODE`

**Manual Test**:
1. Set up Facebook app in Facebook Developers
2. Configure redirect URI: `http://localhost:3000/api/auth/oauth/facebook/callback`
3. Navigate to Facebook OAuth URL:
   ```
   https://www.facebook.com/v18.0/dialog/oauth?
     client_id=YOUR_FACEBOOK_APP_ID&
     redirect_uri=http://localhost:3000/api/auth/oauth/facebook/callback&
     scope=email
   ```

---

### 5. Logout

#### Logout
**Endpoint**: `POST http://localhost:3000/api/auth/logout`

**Test with cURL**:
```powershell
curl -X POST http://localhost:3000/api/auth/logout `
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

**Expected Response**:
```json
{
  "message": "Logged out successfully"
}
```
- Session revoked in database
- Session cookie cleared

---

## Complete Test Flow

### Scenario 1: New User with Magic Link + TOTP

1. **Request magic link**:
   ```powershell
   curl -X POST http://localhost:3000/api/auth/magic-link `
     -H "Content-Type: application/json" `
     -d '{\"email\":\"newuser@example.com\"}'
   ```

2. **Get token from database** (or email if SMTP configured):
   ```sql
   SELECT token_hash FROM magic_link_token WHERE email = 'newuser@example.com';
   ```

3. **Verify magic link** (in browser):
   ```
   http://localhost:3000/api/auth/magic-link/verify?token=TOKEN_FROM_DB
   ```
   - Save the session cookie from response

4. **Setup TOTP**:
   ```powershell
   curl -X POST http://localhost:3000/api/auth/totp/setup `
     -H "Cookie: session=SESSION_COOKIE_FROM_STEP_3"
   ```
   - Save the QR code and backup codes
   - Scan QR code with authenticator app

5. **Verify TOTP** (get 6-digit code from app):
   ```powershell
   curl -X POST http://localhost:3000/api/auth/totp/verify `
     -H "Content-Type: application/json" `
     -H "Cookie: session=SESSION_COOKIE" `
     -d '{\"token\":\"123456\"}'
   ```
   - Session will be rotated (new cookie issued)

6. **Verify you can't reuse old session**:
   ```powershell
   curl http://localhost:3000/api/auth/backup-codes/count `
     -H "Cookie: session=OLD_SESSION_COOKIE"
   ```
   - Should return 401 Unauthorized

### Scenario 2: Rate Limiting Test

1. **Request magic links rapidly**:
   ```powershell
   # Run this 6 times quickly
   1..6 | ForEach-Object {
     curl -X POST http://localhost:3000/api/auth/magic-link `
       -H "Content-Type: application/json" `
       -d '{\"email\":\"ratelimit@example.com\"}'
   }
   ```

2. **6th request should fail** with:
   ```json
   {
     "error": "Too many requests",
     "retryAfter": 3600
   }
   ```

### Scenario 3: Backup Code Usage

1. Complete TOTP setup (Scenario 1, steps 1-5)
2. **Try to login again** (request new magic link)
3. **Verify magic link** (you'll have session but need TOTP)
4. **Use backup code instead of TOTP**:
   ```powershell
   curl -X POST http://localhost:3000/api/auth/totp/verify `
     -H "Content-Type: application/json" `
     -H "Cookie: session=SESSION_COOKIE" `
     -d '{\"token\":\"A1B2C3D4\",\"isBackupCode\":true}'
   ```

5. **Check remaining backup codes**:
   ```powershell
   curl http://localhost:3000/api/auth/backup-codes/count `
     -H "Cookie: session=SESSION_COOKIE"
   ```
   - Should return `{ "count": 9 }`

---

## Database Verification Queries

Check the database to verify operations:

```sql
-- Check users
SELECT id, email, totp_enabled, first_login_completed, last_login_at 
FROM app_user;

-- Check magic link tokens
SELECT email, expires_at, consumed_at, created_at 
FROM magic_link_token 
ORDER BY created_at DESC;

-- Check sessions
SELECT user_id, jti, expires_at, revoked_at, created_at 
FROM user_session 
ORDER BY created_at DESC;

-- Check backup codes (should see hashes, not plain text)
SELECT user_id, used_at, created_at 
FROM backup_code 
WHERE user_id = 'USER_UUID';

-- Check audit log
SELECT action, target_type, meta, at 
FROM audit_log 
ORDER BY at DESC 
LIMIT 20;

-- Check rate limits
SELECT key, endpoint, attempts, blocked_until 
FROM rate_limit 
WHERE blocked_until > NOW();
```

---

## Browser Testing Tools

### Using Browser DevTools

1. **Open DevTools** (F12)
2. **Network tab** to see requests/responses
3. **Application tab** > Cookies to inspect session cookie
4. **Console** to make fetch requests:

```javascript
// Request magic link
fetch('http://localhost:3000/api/auth/magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com' })
}).then(r => r.json()).then(console.log);

// Check backup code count (with session cookie)
fetch('http://localhost:3000/api/auth/backup-codes/count', {
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

---

## Expected Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
- Missing or invalid session cookie

### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "retryAfter": 3600
}
```
- Rate limit exceeded

### 400 Bad Request
```json
{
  "error": "Email is required"
}
```
- Missing required parameters

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
- Check server logs for details

---

## Notes

- **Session cookies are HttpOnly** - can't access via JavaScript in production
- **TOTP codes expire every 30 seconds** - use fresh codes
- **Magic links expire after 15 minutes**
- **Backup codes are one-time use** - each can only be used once
- **Rate limits reset based on configured windows** (hour/15min/5min)

