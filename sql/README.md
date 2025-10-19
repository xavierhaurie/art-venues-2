# Database Setup Guide

## Overview
All SQL files have been updated to use the `public` schema (Supabase's default exposed schema) instead of the `app` schema.

## Setup Order

Run these files **in order** in the Supabase SQL Editor:

1. **0.clear-all.sql** - Clears all existing database objects (tables, functions, types)
2. **1.schema.sql** - Creates main application tables (users, venues, notes, etc.)
3. **2.auth-schema.sql** - Creates authentication tables (magic links, OAuth, TOTP, sessions)
4. **3.policies-reset.sql** - Drops existing RLS policies and enables RLS
5. **4.policies.sql** - Creates RLS policies for data security
6. **5.policies.test.sql** - (Optional) Validates that policies are configured correctly
7. **6.seed.sql** - (Optional) Adds sample data for testing

## Quick Setup

### First Time Setup
```sql
-- Run each file in the Supabase SQL Editor in this order:
-- 1. 0.clear-all.sql
-- 2. 1.schema.sql
-- 3. 2.auth-schema.sql
-- 4. 3.policies-reset.sql
-- 5. 4.policies.sql
-- 6. 6.seed.sql (optional)
```

### Reset & Rebuild
If you need to start fresh:
```sql
-- Run 0.clear-all.sql, then follow the First Time Setup order
```

## Important Notes

1. **Schema**: All tables are in the `public` schema (not `app`) because Supabase's PostgREST API only exposes the `public` schema by default.

2. **Service Role Key**: Make sure your `.env.local` has the correct `SUPABASE_SERVICE_ROLE_KEY`. You can find it at:
   - https://app.supabase.com/project/YOUR_PROJECT/settings/api
   - Look for "service_role" key (not "anon" key)

3. **RLS Policies**: The policies use `auth.uid()` which comes from Supabase's JWT authentication. When you log in via the app, the JWT token contains the user ID that the policies check.

4. **Testing**: The `5.policies.test.sql` script validates policy structure but doesn't fully test RLS enforcement (since it runs with service_role which bypasses RLS). Real RLS testing requires JWT tokens from actual user logins.

## Troubleshooting

### "Could not find the table 'public.app_user' in the schema cache"
- Run `0.clear-all.sql` followed by `1.schema.sql` and `2.auth-schema.sql`
- Make sure you're using the service_role key in your `.env.local`

### "permission denied for schema auth"
- This is expected if you try to create objects in the `auth` schema
- All our tables are in `public` schema now

### "relation already exists"
- Run `0.clear-all.sql` first to drop all existing objects

### RLS policies not working
- Make sure you ran `4.policies.sql` after creating tables
- Check that `auth.uid()` is populated (requires valid JWT token from Supabase Auth)
- Use `5.policies.test.sql` to validate policy structure

## Next Steps

After database setup:

1. **Start Next.js dev server**:
   ```powershell
   npm run dev
   ```

2. **Test magic link signup**:
   - Navigate to http://localhost:3000/auth
   - Enter your email
   - Check your email for the magic link (or check Supabase Inbucket if using local dev)

3. **Set up TOTP on first login**:
   - After clicking magic link, you'll be redirected to TOTP setup
   - Scan QR code with authenticator app
   - Save backup codes

4. **Access dashboard**:
   - After TOTP setup, you'll be redirected to /dashboard

