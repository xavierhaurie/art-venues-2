# Art Venues - Artist & Venue SaaS Platform

A comprehensive platform connecting artists with venues in Boston (with future expansion to LA and NYC).

## 🚀 Current Sprint: M0 (MVP Foundation)

### ✅ M0-AUTH-01: Complete Authentication System
Fully implemented secure authentication with:
- **Magic-link email authentication** (passwordless)
- **OAuth integration** (Google & Facebook/Meta)
- **Mandatory 2FA** (TOTP) on first login
- **10 backup codes** with secure hashed storage
- **Session rotation** when 2FA is enabled
- **Rate limiting** on all auth endpoints
- **Comprehensive audit logging**

See [M0-AUTH-01 Implementation Guide](docs/M0-AUTH-01-IMPLEMENTATION.md) for details.

## 📋 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Custom JWT + TOTP (Speakeasy) + OAuth
- **Database**: PostgreSQL 15+ (Supabase)
- **Deployment**: Vercel
- **Email**: Nodemailer (SMTP)
- **Testing**: Jest + ts-jest

## 🏗️ Project Structure

```
art-venues-2/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/              # Authentication endpoints
│   │           ├── magic-link/
│   │           ├── oauth/
│   │           ├── totp/
│   │           ├── backup-codes/
│   │           └── logout/
│   ├── lib/                       # Core utilities
│   │   ├── crypto.ts             # Encryption & hashing
│   │   ├── totp.ts               # TOTP generation/verification
│   │   ├── session.ts            # JWT session management
│   │   ├── rate-limit.ts         # Rate limiting
│   │   ├── db.ts                 # Database operations
│   │   ├── email.ts              # Email sending
│   │   └── middleware.ts         # Auth middleware
│   └── types/
│       └── auth.ts               # TypeScript types
├── tests/
│   └── lib/                      # Unit tests
├── docs/
│   ├── 1.schema.sql                # Main database schema
│   ├── auth-1.schema.sql           # Auth extensions
│   └── M0-AUTH-01-IMPLEMENTATION.md
└── .env.example                  # Environment variables template
```

## 🔐 Security Features

### Encryption & Hashing
- **TOTP secrets**: AES-256-GCM encryption at rest
- **Backup codes**: bcrypt hashing (salt rounds: 10)
- **Magic link tokens**: bcrypt hashing
- **Session tokens**: JWT with HS256 signature

### Rate Limiting
- Magic link requests: 5/hour per email
- Login attempts: 5/15 minutes per IP
- TOTP verification: 5/5 minutes per user

### Session Management
- JWT tokens with 7-day expiry
- Unique JTI stored in database
- Session rotation on 2FA enable
- Revocation checking on protected routes

### Audit Logging
All authentication events logged with:
- User ID, IP address, user agent
- Action type and timestamp
- Metadata (success/failure, reason)

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (via Supabase)
- Google OAuth credentials
- Facebook OAuth credentials
- SMTP server access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xavierhaurie/art-venues-2.git
   cd art-venues-2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up database**
   ```bash
   # Apply main schema
   psql $DATABASE_URL -f docs/1.schema.sql
   
   # Apply auth schema
   psql $DATABASE_URL -f docs/auth-1.schema.sql
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

Visit http://localhost:3000

### OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/oauth/google/callback`
4. Copy Client ID and Secret to `.env.local`

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create app and add Facebook Login product
3. Add redirect URI: `http://localhost:3000/api/auth/oauth/facebook/callback`
4. Copy App ID and Secret to `.env.local`

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Test coverage:
- ✅ Crypto utilities (encryption, hashing, token generation)
- ✅ TOTP generation and verification
- ✅ JWT session management
- ✅ Backup code generation

## 📚 API Documentation

### Authentication Endpoints

#### Request Magic Link
```http
POST /api/auth/magic-link
Content-Type: application/json

{
  "email": "artist@example.com"
}
```

#### Verify Magic Link
```http
GET /api/auth/magic-link/verify?token=xxxxx
```

#### Setup TOTP
```http
POST /api/auth/totp/setup
Cookie: session=xxxxx
```

#### Verify TOTP
```http
POST /api/auth/totp/verify
Cookie: session=xxxxx
Content-Type: application/json

{
  "token": "123456",
  "isBackupCode": false
}
```

#### Logout
```http
POST /api/auth/logout
Cookie: session=xxxxx
```

See [Implementation Guide](docs/M0-AUTH-01-IMPLEMENTATION.md) for complete API documentation.

## 🎯 Roadmap

### Sprint M0 (Current)
- ✅ M0-AUTH-01: Authentication system
- ⏳ M0-AUTH-02: RBAC enforcement
- ⏳ M0-AUTH-03: Row-Level Security
- ⏳ M0-VEN-01-04: Venue management
- ⏳ M0-NOTE-01-04: Notes & stickers
- ⏳ M0-PROF-01-02: Artist profiles
- ⏳ M0-BILL-01-02: Plan gating
- ⏳ M0-OBS-01: Observability
- ⏳ M0-ANL-01: Analytics events
- ⏳ M0-CI-01: CI/CD pipeline
- ⏳ M0-UX-01-02: App shell & UI

### Future Sprints
- M1: Venue claiming & open calls
- M2: Matching algorithm
- M3: Blog & community features
- M4: Referral system

## 🛡️ Security Considerations

⚠️ **Production Checklist**:
- [ ] Use HTTPS for all endpoints
- [ ] Rotate JWT_SECRET and ENCRYPTION_KEY periodically
- [ ] Set up monitoring for auth failures
- [ ] Configure CSP headers
- [ ] Enable CORS properly
- [ ] Set up SPF/DKIM/DMARC for emails
- [ ] Review rate limit thresholds
- [ ] Set up automated backups
- [ ] Enable database encryption at rest
- [ ] Implement security headers (Helmet.js)

## 🤝 Contributing

This is a private project currently in development. Contributing guidelines will be added when the project is ready for external contributions.

## 📄 License

ISC

## 📞 Support

For questions or issues, please contact the development team or create an issue in the GitHub repository.

---

**Status**: 🟢 M0-AUTH-01 Complete | 🟡 M0 Sprint In Progress

