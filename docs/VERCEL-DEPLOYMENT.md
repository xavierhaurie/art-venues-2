# Vercel Deployment Guide

This guide helps you deploy Art Venues to Vercel reliably. It covers environment variables, Vercel settings, Supabase configuration, local validation, and common build issues.

## Prerequisites
- Vercel project created (Framework: Next.js)
- Supabase project with schema applied and storage bucket created
- SMTP creds (for magic link emails)

## Required environment variables (Vercel → Project → Settings → Environment Variables)
Set these for Production (and Preview if you deploy from PRs):

- NEXT_PUBLIC_SUPABASE_URL = https://YOUR-PROJECT.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
- SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
- JWT_SECRET = a long random string
- STORAGE_BUCKET_VENUE_IMAGES = artwork (or the bucket you created)
- SESSION_DURATION = 604800
- BYPASS_AUTH = false

Optional (if you use SMTP emails):
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

## Vercel project settings
- Install command: npm ci
- Build command: npm run build
- Output directory: .next
- Node.js version: 18.x or 20.x
- Do not force Edge Runtime globally. The image upload route is explicitly set to Node.js runtime.

## Supabase configuration checklist
- Storage bucket exists and its name matches STORAGE_BUCKET_VENUE_IMAGES.
- Config table contains the image-related keys (string values are fine, numeric values can include commas; the app parses them):
  - max_image_weight
  - target_image_size
  - thumbnail_image_size
  - max_image_count
  - signed_url_ttl_seconds
- RPC function create_default_stickers_for_user exists. The API endpoint /api/stickers/initialize depends on it.

## Images, sharp, and runtimes
- The route src/app/api/venues/[venueId]/images/route.ts declares:
  - export const runtime = 'nodejs'
- sharp is imported as ESM (import sharp from 'sharp') and is allowed in next.config.js via experimental.serverComponentsExternalPackages = ['sharp'].

## Local validation (Windows CMD)
Run these before pushing to Vercel:

```bat
npm ci
npm run build
npm start
```

Visit http://localhost:3000 and test:
- /venues loads and fetches lists (localities, types, stickers)
- Modal opens and loads full venue data
- Auth flows (magic link, TOTP) if you configured SMTP

## Troubleshooting build failures
- Module not found: '@/...'
  - Ensure tsconfig.json has "baseUrl": "." and paths { "@/*": ["./src/*"] }.
- sharp native build issues
  - Ensure Node runtime for the images route (export const runtime = 'nodejs') and Next config includes sharp in experimental.serverComponentsExternalPackages.
- Dynamic server usage warnings
  - These are informational for API routes that read cookies/search params. They do not fail the build.
- useSearchParams() missing Suspense
  - Client pages that use useSearchParams must be wrapped in a Suspense boundary or be explicitly dynamic. This repo already wraps:
    - /auth/magic-link/verify
    - /feedback/confirm
    - /feedback/confirm-success
- Stickers initialize fails
  - Ensure the RPC function create_default_stickers_for_user exists in your DB.
- Uploads fail
  - Confirm STORAGE_BUCKET_VENUE_IMAGES matches your bucket name. Verify storage policies if you tightened RLS.

## Production deployment checklist
- [ ] Vercel env vars set as listed
- [ ] Supabase storage bucket matches env var name
- [ ] Config table has image keys
- [ ] RPC create_default_stickers_for_user exists
- [ ] JWT_SECRET is strong and not reused
- [ ] Build succeeds locally (npm run build)
- [ ] Redeploy on Vercel from latest commit

## Security hardening tips (post-MVP)
- Enable CSP and security headers (e.g., Helmet at edge or custom headers in next.config.js)
- Monitor auth failures and suspicious IPs
- Rotate secrets (JWT, SMTP) periodically
- Configure SPF/DKIM/DMARC for your email domain

