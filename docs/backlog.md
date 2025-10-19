Here’s a tight M0 sprint backlog (2–3 weeks). Each ticket has crisp acceptance criteria.

Epic A — Auth, RBAC, RLS

M0-AUTH-01: Email/OAuth + 2FA (TOTP)

AC: Sign up/login via magic-link, Google, Meta. On first login, user must set up TOTP. Backup codes (10). Sessions rotate on 2FA enable. Rate-limited attempts.

M0-AUTH-02: RBAC (admin/artist/venue/service)

AC: JWT/session carries role; server enforces role on all endpoints; 403 on violation; audit log entry for denies.

M0-AUTH-03: RLS policies (Supabase-style)

AC: Row-level security active for all tables touching user data; artists can only read/write their notes/stickers/media; venues read-only until claim feature ships (blocked by role).

Epic B — Venues list & search (list view only)

M0-VEN-01: Venue list API (paging, filters, sort)

AC: GET /venues supports page/page_size, filters: locality, type, mbta, has_open_call (stub false), sort by name/locality. p95 < 600ms @ 250 rows.

M0-VEN-02: Full-text search (name+blurb)

AC: Query param q searches FTS & trigram fallback; returns highlight snippets; no SQL injection; index-only scans.

M0-VEN-03: Distance & MBTA fields

AC: Distance from Park St generated/populated; filter by MBTA yes/partial/no works.

M0-VEN-04: Seed import (250 BOS venues)

AC: One-shot 6.seed.sql + CSV importer; idempotent; 0 invalid rows; sample screenshots of 10 random records.

Epic C — Notes & Stickers (with attachments)

M0-NOTE-01: Per-venue notes (rich text)

AC: Create/edit/delete note inline on venue detail; optimistic UI; autosave; undo within 10s.

M0-NOTE-02: Note attachments ≤10MB total

AC: Uploads via signed URLs; server rejects >10MB total; UI shows running total; attachments listed with size; delete updates total.

M0-NOTE-03: Stickers (10 colors)

AC: Manage meanings (label/emoji) per artist; assign multiple stickers to a venue; list shows dots; accessible tooltips.

M0-NOTE-04: Export notes (CSV)

AC: Download CSV contains venue id/name, note text, created_at, stickers applied at export time.

Epic D — Artist profiles (basic, images only)

M0-PROF-01: Profile CRUD + visibility

AC: RTE for statement/goals; visibility default none; switch to venues/public persists; public page hides if none.

M0-PROF-02: Image uploads (quota)

AC: Upload up to 100 images; progress + background processing; set cover; alt-text field; delete works; quota UI.

Epic E — Plans & gating (no Stripe yet)

M0-BILL-01: Plan flags + gating (Free vs Pro Artist)

AC: Admin can set plan on user (UI toggle). Free: view venues only; Pro: notes, stickers, profile, CSV export. Upsell banners appear on gated actions.

M0-BILL-02: Venue Basic (placeholder)

AC: Role venue exists; no claim yet; venue sees read-only venues list; dashboard tile explains upcoming features.

Epic F — Observability, Analytics, CI/CD

M0-OBS-01: Logging/metrics/health

AC: /healthz green; structured logs (request id, user id, role); basic error monitoring (alerts on 5xx > 1%/5m).

M0-ANL-01: Event schema + capture

AC: Emit: user.signup, user.login, venue.list.viewed, venue.search, note.created, sticker.assigned, profile.updated, notes.csv.exported. Stored with user_id, ts, props.

M0-CI-01: CI + preview deploys

AC: Lint, tests, typecheck; PR previews; main → prod; env secrets managed; rollbacks documented.

Epic G — UX shell

M0-UX-01: App shell & routing

AC: Top nav (Logo, Region=BOS, Search, Open Calls (disabled), Blog (disabled), Referrals (disabled), My Profile). 404 page. Auth guard redirects.

M0-UX-02: Venue detail page (read-only fields)

AC: Shows blurb, locality, MBTA, mediums, commission/fees, website link; artist’s notes/stickers pane.

Definition of Done (M0 exit)

New artist can sign up (with 2FA), browse + search venues, add a note with attachments, define/apply stickers, create a profile and upload images, and export notes CSV—all behind Pro gating; Free users can browse only.

p95 API latency for /venues and /notes < 600ms; error rate < 0.5%.

RLS enabled; basic audit log writes for auth and content changes.

Analytics events land and can produce D7 activation query.

Seeded 250 venues visible in prod.

Test matrix (condensed)

E2E: signup→2FA→browse→search→venue detail→add note (+attachments)→apply stickers→export CSV→logout.

Security: RLS denies cross-user note access; attachment limit enforced; rate-limit auth endpoints.

Accessibility: keyboard nav for stickers/notes; color-only stickers have labels.

Nice-to-have if time remains

Cached search results keyed by filters.

Quick-add stickers from list view.

Profile public page skeleton (no SEO yet).

Want me to generate GitHub issues (titles, descriptions, AC, labels, estimates) from this now?
