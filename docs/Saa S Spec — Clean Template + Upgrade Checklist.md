Product Name [TBD] — PRD v1.0 (updated with
new decisions)
Updated with: passkeys later, note attachments ≤10MB total per note, public blog + gated
comments/participant profiles, artist→artist referrals with 1‑mo credit, multi‑region scope
(Boston now; LA/NYC next), map toggle, defaults, and pricing tiers + matching rubric.
0) One‑pager summary
   Problem: Artists and venues struggle to find each other; info is fragmented, stale, and calls are
   ephemeral.
   ICP: Artists (student → mid‑career) in metro areas; venues incl. galleries, cafés, libraries, markets, art
   centers, online‑only.
   Value: Curated venue DB + fast search/filter; personal notes + color stickers; rich artist profiles;
   venue claim/edit; open‑call broadcast; daily matching; public blog that builds community and
   funnels conversions.
   Markets: Boston (MVP, ~250 venues) → LA (~500) → NYC (~1000); region segregation at DB or
   hosting level.
   Why us: Local depth (MBTA etc.), data freshness (nudges + allow‑listed metadata scrape),
   transparent matching, credit incentives, community content.
   North‑star: Matches that lead to outreach; 2nd: venue‑claim rate; 3rd: open‑call apply‑rate; GTM:
   referral‑driven growth.
   Metrics: D7 activation, WAU (artists/venues), venue‑claim rate, matches/artist/week, open‑call CTR/
   apply‑rate, MRR & NRR.
1) Scope
   In: Venue directory; search/filter/group/sort; bookmarks; notes with attachments (≤10MB per note);
   stickers (10 colors, user‑defined meanings); optional artist profiles (≤100 images + 1×5‑min video); venue
   claim/edit; open‑call broadcast/feed; daily matching w/ 7‑day cooldown; credits for data fixes; email nudges;
   public blog (posts + comments); referral program; admin console.
   Out: Payments between artists/venues; contract workflows; full messaging; escrow/shipping/insurance;
   juried application tooling.
   Non‑goals: Guaranteeing acceptance; public ranking of artists.
   •
   •
   •
   •
   •
   •
   •
   1
2) Personas & JTBD
   Artist: Find suitable venues, track outreach, and act on open calls.
   Venue: Maintain listing, broadcast calls, discover relevant artists.
   Admin: Keep data clean, manage credits/claims, moderate content.
   Service: Scheduled jobs (scrape/nudge/match).
3) Core flows (acceptance criteria)
   3.1 Auth & onboarding
   Email‑link or OAuth (Google/Meta) + mandatory 2FA (TOTP). Passkeys: roadmap (M3).
   Venue claim via email loop, domain email verification or admin approval; 2FA enforced after claim.
   Accept: Artist signs up → views venues → adds note ≤2 min; Venue claims & edits ≤5 min.
   3.2 Browse venues (Artist)
   Pagination (10/25/50); search, filter, group, sort by stickers/type/locality/distance (from Park St
   42.3564 −71.0623)/MBTA/has‑note/has‑open‑call; bookmarks; Map toggle (off by default).
   Accept: p95 search < 600 ms; zero‑result guidance; saved views.
   3.3 Notes & stickers
   Per‑venue rich‑text notes; attachments allowed (images/pdf/doc), total ≤10MB per note; version
   history; export CSV.
   Stickers: 10 colors; per‑artist meanings (label/emoji); multiple stickers per venue.
   3.4 Artist profile (optional)
   Statement, works, links, availability/goals; media quotas: ≤100 images + 1×5‑min video; import from
   site + scheduled refresh.
   Visibility: none (default) / venues / public.
   3.5 Open calls
   Venues create/broadcast calls (title, summary, URL, deadline); Artists get feed, annotate (“applied
   YYYY‑MM‑DD”), pin to To‑Do Wall (kanban + calendar). Auto‑expire past deadlines; reminders T‑7/T‑1.
   3.6 Venue claim & editing
   Edit listing fields (blurb, address, locality, transit, mediums, commission %, fees, insurance,
   submission policy, media incl. 1×5‑min video). Browse/search artists; intent‑to‑contact log (no
   in‑app messaging M0–M2).
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   2
   3.7 Matching (Service)
   Nightly job surfaces artist↔venue candidates with score + short explanation; write
   last_match_tried ; do not reconsider < 7 days; per‑user opt‑out and per‑venue daily cap.
   3.8 Data fixes & credits
   Reports for missing/incorrect info → Admin review → 1‑month credit applied on approval; audit
   trail.
   3.9 Blog & comments
   Public blog posts (by team); comments from subscribers only.
   Gating: readers can view posts; subscribers can comment and see participant profiles (artist/
   venue) on each post; non‑subs see counts only.
   Moderation (spam/abuse), rate limits, notifications.
   3.10 Referrals
   Artist invites via unique link. If invitee subscribes, sender receives 1‑month credit. Sender may
   invite unlimited people. Fraud checks (no self‑referrals, cooling‑off before credit).
   3.11 Admin controls
   Full edit, block/unblock users/venues, broadcast email to Artists/Venues, approve credits, override
   claims, moderation queue, audit log.
4) Functional requirements (FR‑XX)
   Auth & RBAC - FR‑01: OAuth/email‑link + 2FA (TOTP). Passkeys deferred to M3. - FR‑02: Roles: Admin, Artist,
   Venue, Service; server‑side checks. - FR‑03: Venue claim workflow with domain verification or admin
   approval.
   Directory & Search - FR‑10: Venue fields include region_code (BOS/LA/NYC), type, locality, coords, MBTA
   (BOS), distance_km, commission %, fees, insurance, mediums[], submission policy, website/social, claimed. -
   FR‑11: Full‑text search (blurbs + notes + profiles) + filters; saved views. - FR‑12: Map toggle on venue list
   (clustered markers, bbox filter).
   Notes, Stickers, Bookmarks - FR‑20: Notes with attachments (≤10MB total per note), versioning, export. -
   FR‑21: Sticker meanings per artist; assignments per venue; multiple stickers. - FR‑22: Bookmark venues/
   artists; lists.
   Profiles & Media - FR‑30: Artist profiles with visibility controls; media processing; quotas. - FR‑31: Scheduled
   profile refresh from external website.
   •
   •
   •
   •
   •
   •
   •
   3
   Open Calls - FR‑40: Venue‑authored calls; artist feed; To‑Do Wall; reminders; expiry. - FR‑41: Unclaimed
   venues ingestion via allow‑listed, metadata‑only scrape (respect robots.txt; store minimal text/preview;
   takedowns honored).
   Matching - FR‑50: Nightly match job; record score + explanation + last_match_tried; 7‑day cooldown;
   opt‑out & per‑venue daily cap.
   Credits & Reports - FR‑60: Data‑fix credits (1 month each) with ledger; referral credits upon conversion;
   separate credit types and caps.
   Blog & Comments - FR‑70: Blog posts (markdown/RTE), tags, SEO meta; comments from subscribers;
   participant profile visibility gated to subscribers; moderation tools.
   Referrals - FR‑80: Unique links/codes; track invites → conversion; apply 1‑mo credit to referrer; unlimited
   invites; fraud checks.
   Comms - FR‑90: Transactional emails (claims, credits, open‑call reminders), weekly/monthly nudges to
   claimed venues; blog/comment notifications.
   Admin - FR‑95: Moderation queue; broadcasts; audit log; claim overrides; blocks.
5) Non‑functional requirements (NFRs)
   Availability: 99.9%/mo; DR: RPO ≤ 15 min, RTO ≤ 1 h.
   Performance: p50 200 ms / p95 600 ms for list/search; uploads backgrounded.
   Security: HTTPS/HSTS, CSP, CSRF; 2FA mandatory; secrets in KMS; basic media moderation.
   Privacy: GDPR/CCPA; export/delete ≤ 30 days; blog comment IP/user agent logged for abuse.
   Accessibility: WCAG 2.2 AA.
   Cost guardrails: media quotas; per‑tenant rate limits; fair‑use on blog comments.
6) Data model (high‑level)
   User {id, email, name, role, 2fa_enabled, status}
   ArtistProfile {user_id, statement, goals, visibility, site_url, region_home?}
   ArtistMedia {id, artist_user_id, type(image|video), url, meta, moderation}
   Venue {id, region_code(BOS|LA|NYC), name, type, locality, coords, mbta_access?, distance_km,
   commission_pct, fees, insurance_req, mediums[], website, social[], claimed_by_user_id?,
   claim_status}
   VenueOpenCall {id, venue_id, title, summary, url, deadline, status}
   VenueClaim {id, venue_id, user_id, method(domain|admin), approved_at}
   Note {id, artist_user_id, venue_id, body, attachments_meta(total_bytes≤10MB), created_at,
   updated_at}
   StickerMeaning {artist_user_id, color, label}
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   4
   StickerAssignment {artist_user_id, venue_id, color}
   Bookmark {user_id, target_type, target_id}
   Match {id, artist_user_id, venue_id, score, explanation, last_match_tried, surfaced_at}
   Report {id, reporter_user_id, type(missing|incorrect), target, details, status}
   Credit {id, user_id, months, reason(data_fix|referral), cap_policy, applied_subscription_id?,
   created_at}
   Subscription {id, user_id, plan, status, current_period_end, stripe_customer_id}
   BlogPost {id, slug, title, body, tags[], author_user_id, published_at}
   Comment {id, post_id, user_id, body, status, created_at}
   Referral {id, referrer_user_id, code, invitee_user_id?, status(sent|converted|rejected), credited_at?}
   AuditLog {id, actor_user_id, action, target_type, target_id, meta, at}
7) API surface (REST)
   Auth: POST /auth/signup, /auth/login, /auth/2fa/verify, /auth/logout
   Venues: GET /venues (filters, paging, bbox), GET /venues/:id, PATCH /venues/:id (Venue/Admin), POST /
   venues/:id/claim, POST /venues/:id/claim/verify, GET/POST /venues/:id/open‑calls
   Artists: GET/PATCH /me/profile, POST/DELETE /me/media, CRUD /me/notes, POST /me/stickers/meanings,
   POST /me/stickers/assign, POST/DELETE /me/bookmarks, GET /me/matches
   Search: POST /search (text), POST /search/images (image/text)
   Blog: GET /blog, GET /blog/:slug, POST /blog (Admin), POST /blog/:slug/comments (subs only), GET /
   blog/:slug/comments
   Referrals: POST /referrals (create link), GET /referrals, POST /referrals/:code/accept
   Admin: GET /admin/reports, POST /admin/reports/:id/approve, POST /admin/credits, POST /admin/
   broadcasts, POST /admin/block/:id, POST /admin/unblock/:id, GET /admin/moderation
   Idempotency: header on POSTs. Rate limits: 60 req/min IP; 600 req/min user; stricter on comments.
8) UI map
   Dashboard: Saved views, recent matches, open‑call highlights, referral link card.
   Venues: Faceted list + map toggle; grouping by locality/type/sticker.
   Venue detail: Blurb, transit, commission/fees, submission policy, media, open calls, my notes &
   stickers.
   Open calls: Feed + calendar; To‑Do Wall; reminders.
   Artists (for Venues): Directory with filters; profile pages.
   Blog: Post index/detail; comments (subs only); participant list (subs only).
   Referrals: Invite link, status of invites, credits earned.
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   5
   My Profile: Editor, media manager, visibility.
   Admin: Reports, credits, broadcasts, moderation, claims, audit log.
9) Integrations & Services
   Stripe: subscriptions, invoices, credits as coupons or billing adjustments.
   Email: Postmark/SES (transactional, broadcasts, comment notifications).
   Storage: S3/GCS (signed URLs); image/video processing.
   Search: Postgres FTS + trigram; optional vector index for image search.
   Scheduler/Queue: cron + workers for scrape/match/nudge.
   Scrape policy: allow‑list + metadata‑only; robots‑aware; takedown flow.
10) Matching rubric (signals + weights)
    Score = 100 × σ(Σ wᵢ·fᵢ) where σ is logistic; show top 3 factors in UI. - Medium fit (w=0.30): cosine similarity
    between artist media tags/embeddings and venue accepted mediums. - Location fit (w=0.20): proximity to
    venue locality/region; decay over distance; MBTA access bonus for BOS. - Profile freshness (w=0.10):
    penalty if artist profile >90 days since update. - Submission policy fit (w=0.10): open‑call presence or rolling
    submissions. - Commission/fees tolerance (w=0.10): align venue commission/fees vs artist‑set
    preferences. - Past outcomes (w=0.10): de‑prioritize venues previously rejected by artist; prioritize
    bookmarked venues. - Open‑call timing (w=0.05): deadline within 30 days gets boost. - Availability/goals
    fit (w=0.05): overlap of artist goals with venue positioning.
    Cooldown: do not re‑surface same pair within 7 days. Per‑venue daily cap to avoid feed spam. A/B test
    weights; store explanation text.
11) Pricing & packaging (tailored)
    Artist - Browse (Free): view venues (limited filters), read blog; cannot add notes/stickers; cannot comment;
    profiles hidden. - Pro ($12/mo): full filters, notes + stickers, bookmarks, open‑call feed + To‑Do, profile (100
    imgs + 1 video), blog comments + see participant profiles, 10 matches/week. - Studio ($24/mo): everything
    in Pro + 30 matches/week, saved views, export notes CSV, image search, referral bonus multiplier [TBD].
    Venue - Basic ($19/mo): claim + edit listing, open‑call broadcast (1 active), artist directory browse,
    intent‑to‑contact log. - Pro ($49/mo): 5 active calls, boosted placement in artist browse, analytics (views/
    clicks), venue video, team seats (3). - Business ($99/mo): unlimited calls, SSO, audit export, priority support.
    Credits - Data‑fix credits: 1 month each, max 3 months stacked. - Referral credits: 1 month per
    converted invitee, no cap; apply after cooling‑off (e.g., 14 days paid).
    All prices placeholders; finalize after smoke tests.
    •
    •
    •
    •
    •
    •
    •
    •
    6
12) Events/Webhooks/Analytics
    Events: user.signup, venue.claimed, note.created, note.attachment_added, sticker.assigned,
    open_call.created, open_call.clicked, open_call.applied, match.surfaced, blog.post_published,
    blog.comment.created, referral.invite.sent, referral.converted, credit.applied. - Webhooks: HMAC
    signatures; retries with backoff. - Product analytics: activation funnels, search usage, notes/stickers
    adoption, map toggle usage, open‑call CTR/apply, match→outreach, blog engagement, referral k‑factor.
13) Security, privacy, abuse prevention
    2FA mandatory; session/device mgmt; audit log.
    Rate limits + anomaly detection; anti‑scrape controls (pagination caps, watermarking, honey tokens,
    ToS).
    Blog/comment moderation, spam filtering, report abuse; block users/venues.
    Data export + deletion; DPA + takedown process for scraped metadata.
14) Reliability & ops
    Envs: dev/stage/prod; blue/green deploys; observability (logs, metrics, traces); status page.
    Backups nightly + 15‑min WAL; quarterly restore drills.
    Region segregation: Option A single cluster with region_code ; Option B per‑region deploys
    (BOS/LA/NYC) with separate DBs; feature flags for rollout.
15) Roadmap & milestones
    M0 (2–3 wks): Auth + 2FA, venue list + search, notes + stickers (attachments ≤10MB per note), basic
    profiles, seed 250 venues, Free/Pro pricing for Artists, Basic for Venues.
    M1 (3–5 wks): Venue claim/edit, open‑calls (manual), To‑Do Wall, bookmarks, saved views, Stripe,
    blog (read) + Pro comments + participant gating, referral links MVP, admin console.
    M2 (3–5 wks): Matching with explanations + cooldown, allow‑listed metadata scrape for unclaimed,
    credits (data‑fix + referral), image search MVP, analytics dashboards, map toggle, moderation tools.
    M3 (GA): Passkeys, per‑region deploys (LA, NYC), anti‑scrape hardening, enterprise venue plan, SOC2
    pre‑work.
16) Test plan
    Unit/integration; E2E for signup/claim/search/notes/attachments/stickers/matching/open‑call
    pinning/blog comments/referrals.
    Security (SAST/DAST), dependency scans; job resilience; rate‑limit & moderation tests.
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    7
17) Risks & open questions
    [RISK] Scraping legality; mitigation: allow‑list + metadata‑only + takedowns.
    [RISK] Storage costs; mitigation: quotas/compression.
    [RISK] Comment spam; mitigation: moderation, rate limits, 2FA.
    [OPEN] Exact prices; [OPEN] referral cooling‑off length; [OPEN] Studio entitlements; [OPEN] venue
    analytics depth.
18) Raw spec dump (verbatim)
    (Unchanged; see previous section for your original text pasted in full.)
    •
    •
    •
    •
    8