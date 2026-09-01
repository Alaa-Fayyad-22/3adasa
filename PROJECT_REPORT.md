# Project Report — `3adasa` (photography-portfolio)

_Read-only investigation. Nothing in the codebase was modified to produce this. Generated 2026-08-28._

---

## 1. Overview

This is the marketing/portfolio website **and** session-booking system for a
single photographer. The site brands itself as **"Jad Daou — Photographer in
Beirut & across Lebanon"** in its page metadata (`src/pages/Index.tsx`,
`src/data/photos.ts`), while the Vercel project, the repo folder, and the
Instagram handle linked in the footer are all **`3adasa`** / `instagram.com/3adasa.lb`
(_ʿadasa_ / عدسة is Arabic for "lens"). The footer credits **Alaa Fayyad** as the
builder, and the git author on every commit is `AlaaFayyad`.

Functionally the site has two halves:

1. **A portfolio / marketing SPA.** A single-page React app with a home page
   (animated hero, about teaser, gallery teaser, a "how it works" section, a
   Three.js "exploded camera" showcase, and stats), plus standalone routes for a
   filterable gallery with a lightbox, an about page, and a small file-based
   blog. Heavy use of scroll-driven animation (GSAP ScrollTrigger, Framer
   Motion) and a dark, editorial visual style driven by CSS custom properties
   and Tailwind.

2. **A booking system.** A `/reservation` form where a prospective client picks
   a session type, a date/time (interpreted as Beirut wall-clock time), and a
   location via a Google Maps autocomplete + draggable-pin picker. Submitting
   writes a `pending` row to a Supabase Postgres table through a Vercel
   serverless function, then hands the client a pre-filled WhatsApp
   click-to-chat link addressed to the photographer. That message contains two
   HMAC-signed "magic links" — confirm and decline — which the photographer taps
   to move the booking to `confirmed` / `cancelled`. There is deliberately **no
   admin panel and no automated messaging** (an earlier Twilio integration was
   removed; see git history).

The audience is (a) potential photography clients in Lebanon browsing work and
booking sessions, and (b) the photographer themselves, who administers bookings
entirely through WhatsApp links on their phone.

---

## 2. Tech stack

**Language & runtime.** TypeScript throughout (app, API, and build scripts),
ES modules (`"type": "module"`). No Node version is pinned anywhere — there is no
`.nvmrc`, `.node-version`, or `engines` field. Runtime for the `api/` folder is
Vercel's Node serverless runtime (version chosen by Vercel's platform default).

**Package manager.** npm — `package-lock.json` is committed (v3 lockfile,
~112 KB). No pnpm/yarn/bun lockfiles.

**Frontend.**

| Concern | Library (declared version) |
|---|---|
| UI framework | `react` / `react-dom` `^19.2.7` |
| Routing | `react-router-dom` `^7.18.1` (`BrowserRouter`, `Routes`) |
| Build tool | `vite` `^8.1.1` + `@vitejs/plugin-react` `^6.0.3` |
| Styling | `tailwindcss` `^3.4.19`, `tailwindcss-animate` `^1.0.7`, `postcss` `^8.5.22`, `autoprefixer` `^10.5.4` |
| Animation | `framer-motion` `^12.42.2`, `gsap` `^3.15.0` (+ `ScrollTrigger`), `three` `^0.185.1` |
| SEO / meta | `react-helmet-async` `^3.0.0` |
| Icons | `react-icons` `^5.7.0` (only `FaInstagram`, `FaWhatsapp` used) |
| Validation | `zod` `^4.4.3` (shared client + server) |
| Dates / timezones | `date-fns` `^4.4.0`, `date-fns-tz` `^3.2.0` |
| _Declared but unused_ | `bootstrap` `^5.3.8` — no import anywhere in `src/` or `index.html` |

**Backend / infra libraries.**

| Concern | Library |
|---|---|
| Database client | `@supabase/supabase-js` `^2.110.8` (service-role, server-only) |
| Rate limiting | `@upstash/ratelimit` `^2.0.8` + `@upstash/redis` `^1.38.0` (with in-memory fallback) |
| Token signing | Node built-in `node:crypto` (`createHmac`, `timingSafeEqual`) — no JWT lib |

**Tooling.**

- **Lint:** `oxlint` `^1.71.0` (`.oxlintrc.json`, plugins: react/typescript/oxc;
  only two rules configured: `react/rules-of-hooks`, `react/only-export-components`).
  Type-aware linting is *not* enabled.
- **TypeScript:** `~6.0.2` with `tsx` `^4.23.1` for running the `.ts` build scripts.
- **Types:** `@types/node ^24`, `@types/react ^19.2`, `@types/react-dom ^19.2`,
  `@types/three ^0.185`, `@types/google.maps ^3.65`.

> **Version note:** several declared versions (`typescript ~6.0.2`,
> `vite ^8.1.1`, `@vitejs/plugin-react ^6`, `react ^19.2.7`, `@types/node ^24.13`)
> are ahead of, or at the bleeding edge of, what is publicly released as of the
> assistant's knowledge. Treat the exact resolved versions in
> `package-lock.json` as the source of truth and verify a clean `npm install`
> before relying on them.

**Deployment.** Vercel. `vercel.json` contains a single SPA rewrite
(`/(.*)` → `/index.html`). `.vercel/project.json` links this working copy to
Vercel project `3adasa` (`projectId prj_GPU2lxg84aDLDEiRuLBFo72CuOqE`, org
`team_kk8gwZVicPzg45nStvqkvSfg`). The `api/` directory is picked up by Vercel's
zero-config function build; there is no `@vercel/node` dependency (the request/
response types are hand-rolled in `api/_lib/types.ts` to avoid pulling in that
package's dependency tree).

---

## 3. Architecture

The project is a **static SPA + serverless-function backend** deployed as one
Vercel project. It is not MVC, not a monorepo, not microservices — it is a
single app with a thin "backend-for-frontend" layer of independent function
handlers. The pieces:

**Client (`src/`).** A React 19 SPA. `index.html` loads `src/main.tsx`, which
mounts `src/App.tsx`. `App.tsx` wraps everything in `HelmetProvider` (for
per-route `<title>`/meta) and `BrowserRouter`, and declares a flat route table
(8 routes). There is no server-side rendering and no data-fetching framework;
pages that need server data (`/reservation`, `/booking-action`) call the
`/api/*` endpoints with `fetch` and manage their own loading/error state with
`useState`.

**API (`api/`).** Four public endpoints plus a private `_lib/` folder of shared
helpers. Each top-level `.ts` file default-exports a `(req, res) => …` handler.
There is no router, no middleware chain, no shared framework — cross-cutting
concerns (IP extraction, JSON body parsing, rate limiting, Turnstile
verification, Supabase admin client, token signing) are plain functions in
`api/_lib/` that each handler calls explicitly, in an order the handler
controls.

**Data store.** A single hosted Supabase Postgres database with one application
table, `public.reservations`. Row-Level Security is **enabled with zero
policies**, so the `anon`/`authenticated` roles have no access at all; table
privileges are additionally `REVOKE`d from them. The only path to the data is
the `api/` handlers using `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS).
`src/` must never import the admin client — this is called out in comments in
`api/_lib/supabaseAdmin.ts` and the migration.

**Supporting services.** Upstash Redis (rate limiting, optional), Cloudflare
Turnstile (bot check, currently unconfigured), Google Maps JS + Places APIs
(location picker), and WhatsApp via plain `wa.me` click-to-chat links (no API,
no account).

**Photo gallery (live from Instagram).** The gallery is no longer built from
local files. `api/instagram-photos.ts` (a Vercel function) fetches the owner's
media from the official Instagram Graph API server-side, normalizes it to
`Photo[]` (`{id, src, title, caption, permalink, timestamp, categories, …}`),
and caches it (Upstash Redis, or in-memory fallback — `api/_lib/instagramCache.ts`).
The React app reads it once via `src/hooks/useInstagramPhotos.tsx` (a context
provider mounted in `App.tsx`) and splits it into hero / gallery / behind-the-lens
buckets. `INSTAGRAM_ACCESS_TOKEN` is server-only. Categories come from caption
hashtags, with `src/data/photoCategoryOverrides.ts` as a manual override.
`src/data/fallbackPhotos.ts` + `public/fallback/**` are a small bundled safety
net used when the API/cache is unavailable (also the blog cover images).
`npm run dev` serves the endpoint via a small Vite plugin
(`scripts/instagram-dev-plugin.ts`).

**Build-time code generation.** One `tsx` script runs inside the build:
`scripts/generate-seo-files.ts` reads the route list + blog posts and emits
`public/sitemap.xml` and `public/robots.txt`. It uses `scripts/site-url.ts` to
resolve the canonical origin (`VERCEL_PROJECT_PRODUCTION_URL` in prod, else
`VITE_SITE_URL`, else `http://localhost:5173`).

### Booking data flow (the non-obvious part)

```
Client browser                       Vercel Functions                 Supabase
--------------                       ----------------                 --------
/reservation form
  zod validate (UX only)
  POST /api/reservations  ───────▶   reservations.ts
                                       1. method gate (POST)
                                       2. verifyTurnstile()  ── (skipped: no key)
                                       3. checkRateLimit(ip)  ── Upstash / in-mem
                                       4. zod re-validate (real boundary)
                                       5. pre-insert conflict check ──▶ SELECT
                                       6. insert status='pending'   ──▶ INSERT ──▶ row
                                       7. HMAC-sign confirm+decline tokens
                                     ◀── {id, status, confirmUrl,
                                          declineUrl, photographerWhatsapp}
  build wa.me link w/ the two URLs
  user taps → sends to photographer

Photographer taps confirm/decline link
  /booking-action?token=…
  GET /api/booking-action-info  ──▶  booking-action-info.ts (READ ONLY —
                                     safe for WhatsApp link-preview bots)
                                       verifyActionToken() ──▶ SELECT ──▶ details
  shows summary + explicit button
  POST /api/booking-action-execute ▶ booking-action-execute.ts (only writer)
                                       verifyActionToken() (action is read
                                         FROM the token, never the body)
                                       UPDATE … WHERE id=? AND status='pending'
                                         (atomic; closes the double-tap race) ──▶ row
                                     ◀── on confirm: also returns client_phone
                                          so photographer can wa.me the client
```

The design goal, stated repeatedly in comments: the **only** state-changing
request is a `POST` behind an explicit button press; every GET is safe to be
fetched by a link-preview crawler; the action (`confirm` vs `decline`) is
encoded in the signed token, so a tampered request body cannot turn a decline
into a confirm; and races (link tapped twice, two bookings for one slot) are
resolved at the database level via a conditional `UPDATE` and a partial unique
index, not read-then-write.

---

## 4. Directory structure

```
3adasa/
├── api/                       Vercel serverless functions (Node runtime)
│   ├── _lib/                  Shared, non-endpoint helpers
│   │   ├── actionToken.ts     HMAC-SHA256 sign/verify for confirm/decline magic links (trust boundary)
│   │   ├── instagramCache.ts  Upstash (or in-memory) TTL cache for the Instagram media list
│   │   ├── ratelimit.ts       Upstash sliding-window limiter (5/IP/hr) + in-memory fallback
│   │   ├── request.ts         getClientIp(), getJsonBody()
│   │   ├── supabaseAdmin.ts   Lazy service-role Supabase client + ReservationRow type
│   │   ├── turnstile.ts       Cloudflare Turnstile siteverify (no-ops if unconfigured)
│   │   └── types.ts           Hand-rolled VercelRequest/VercelResponse shapes
│   ├── booking-action-execute.ts  POST — the one writer; confirm/decline a booking
│   ├── booking-action-info.ts     GET  — read-only booking summary for the action page
│   ├── instagram-photos.ts        GET  — Instagram Graph API proxy + cache; drives the gallery
│   └── reservations.ts            POST — create a pending booking
├── scripts/                   Build/dev tooling (run via tsx / by vite)
│   ├── generate-seo-files.ts      routes + posts → public/sitemap.xml, robots.txt
│   ├── instagram-dev-plugin.ts    Vite plugin: serves /api/instagram-photos in `npm run dev`
│   └── site-url.ts                resolveSiteUrl() shared by seo script + vite.config
├── supabase/
│   └── migrations/            Plain SQL, applied manually / via `supabase db push`
│       ├── 0001_reservations.sql     table, checks, partial unique index, RLS-with-no-policies
│       ├── 0002_session_location.sql add required session_location text
│       └── 0003_location_picker.sql  add lat/lng + maps_url for the pin picker
├── public/
│   ├── photos/                Source of truth for gallery images; folder layout encodes category
│   │   ├── hero/<category>/NN-title.jpeg
│   │   ├── gallery/<category|catA+catB>/NN-title.jpeg
│   │   └── behind-the-lens/<category>/NN-title.jpeg
│   ├── sitemap.xml, robots.txt    GENERATED — do not hand-edit
│   └── favicon.ico, logo-nav.png, about-image*.jpeg
├── src/
│   ├── main.tsx              React entry — mounts <App/> in StrictMode
│   ├── App.tsx               Route table (Helmet + Router)
│   ├── index.css             Tailwind directives + CSS vars (theme) + keyframes
│   ├── vite-env.d.ts         Typed import.meta.env
│   ├── pages/                One component per route
│   │   ├── Index.tsx         Home — composes the section/* components + loader
│   │   ├── Gallery.tsx / About.tsx / Blog.tsx / BlogPost.tsx
│   │   ├── Reservation.tsx   The booking form (largest page, 422 lines)
│   │   ├── BookingAction.tsx The photographer's confirm/decline page
│   │   └── NotFound.tsx
│   ├── sections/             Home-page building blocks
│   │   ├── Hero, AboutTeaser, GalleryTeaser, BehindTheLens, Stats
│   │   ├── About, Gallery    (full versions reused by the /about and /gallery pages)
│   │   ├── CraftShowcase.tsx  UNTRACKED — Three.js "exploded camera" wrapper (scroll vs reduced-motion)
│   │   └── CraftScene.tsx     UNTRACKED — the actual three.js scene + GSAP scrub + label overlay
│   ├── components/           Reusable UI
│   │   ├── Navbar, Footer, GalleryCard, Lightbox, LoadingScreen
│   │   ├── Seo.tsx           <Helmet> block (title/canonical/OG/Twitter)
│   │   ├── JsonLd.tsx        Injects a application/ld+json script
│   │   ├── LocationPicker.tsx Google Maps autocomplete + draggable pin (250 lines, many workarounds)
│   │   └── Turnstile.tsx     Cloudflare Turnstile widget loader
│   ├── data/
│   │   ├── photos.ts         Photo/PhotoCategory types, photographer info, stats, category list
│   │   ├── photoCategoryOverrides.ts  Hand-edited media-id → categories map (wins over hashtags)
│   │   ├── fallbackPhotos.ts  ~6 bundled Photo[] — offline safety net + blog covers
│   │   └── posts.ts          3 hard-coded blog posts (title, date, excerpt, cover, body)
│   ├── hooks/
│   │   ├── useInstagramPhotos.tsx  Context provider — fetches /api/instagram-photos, splits buckets
│   │   └── useSectionNav.ts  Scroll-to-section on "/", else navigate to "/#id"
│   └── lib/
│       ├── reservationSchema.ts  zod schema + SESSION_TYPES — shared by client & API
│       ├── seo.ts               SITE_URL, absoluteUrl(), AREA_SERVED (Lebanon regions for JSON-LD)
│       ├── timezone.ts          Beirut ↔ UTC conversion (DST-correct via date-fns-tz)
│       ├── whatsappLink.ts      buildWhatsAppLink(e164, message) → wa.me URL
│       └── gsapSetup.ts         Registers ScrollTrigger, configures ignoreMobileResize
├── index.html                Vite entry HTML; preloads Google Fonts (Inter, Instrument Serif)
├── vite.config.ts            React plugin + define VITE_SITE_URL at build
├── tsconfig.json             Solution file → references app / node / api
├── tsconfig.app.json         src/ — DOM libs, bundler resolution, react-jsx
├── tsconfig.api.json         api/ — node types, bundler resolution
├── tsconfig.node.json        vite.config.ts only — nodenext
├── tailwind.config.js        Theme tokens map to CSS vars; custom keyframes; tailwindcss-animate
├── postcss.config.js         tailwindcss + autoprefixer
├── .oxlintrc.json            Minimal oxlint config
├── vercel.json               SPA fallback rewrite
├── .env.example              Documented template for every env var (tracked)
└── README.md                 Stock Vite template README (not project-specific)
```

Non-obvious conventions worth knowing:

- **Photo categories come from caption hashtags** (`#portrait`, `#landscape`,
  `#street`, `#events` + synonyms — see `HASHTAG_CATEGORY` in
  `api/instagram-photos.ts`). Anything unmatched is `Uncategorized`.
  `src/data/photoCategoryOverrides.ts` (media id → categories, hand-edited) wins
  over hashtags.
- **The photo list is fetched at runtime, not built.** There is no generated
  photo file. A fresh checkout with no `INSTAGRAM_ACCESS_TOKEN` falls back to the
  ~6 bundled images in `src/data/fallbackPhotos.ts` / `public/fallback/**`.
- **`public/sitemap.xml` and `public/robots.txt` are generated** but *are*
  tracked in git, so they show up as diffs (e.g. `lastmod` date churn) on every
  build.
- Relative imports inside `api/` and from `api/` into `src/lib`/`scripts` use
  explicit `.js` extensions on `.ts` files (e.g.
  `import … from "../src/lib/reservationSchema.js"`) — a deliberate choice for
  Vercel's bundler; see commit `82e35ac`.

---

## 5. Entry points

- **Browser app:** `index.html` → `<script type="module" src="/src/main.tsx">`
  → `src/main.tsx` calls `createRoot(...).render(<App/>)` → `src/App.tsx`
  defines the router. Routes:

  | Path | Component |
  |---|---|
  | `/` | `pages/Index.tsx` |
  | `/about` | `pages/About.tsx` |
  | `/gallery` | `pages/Gallery.tsx` |
  | `/reservation` | `pages/Reservation.tsx` |
  | `/booking-action` | `pages/BookingAction.tsx` (`?token=…`) |
  | `/blog` | `pages/Blog.tsx` |
  | `/blog/:slug` | `pages/BlogPost.tsx` |
  | `*` | `pages/NotFound.tsx` |

- **API:** each file in `api/` (not `api/_lib/`) is an endpoint via its default
  export: `POST /api/reservations`, `GET /api/booking-action-info`,
  `POST /api/booking-action-execute`, `GET /api/instagram-photos`.

- **Build scripts:** `scripts/generate-seo-files.ts` (invoked by `build`, or
  standalone via `npm run generate-seo`).

- **Vite config:** `vite.config.ts` is itself an entry the toolchain executes;
  it injects `VITE_SITE_URL` at build via `define`.

---

## 6. Key modules / components

1. **`src/App.tsx`** — the whole route map and the two context providers
   (`HelmetProvider`, `BrowserRouter`). Every page is a direct child; no lazy
   route splitting.

2. **`src/lib/reservationSchema.ts`** — the single zod schema
   (`reservationSchema`) plus `SESSION_TYPES`. Imported by both
   `pages/Reservation.tsx` (client-side, UX validation) and `api/reservations.ts`
   (server-side, the real boundary — extended there with a `turnstile_token`
   field). This is the contract between the form and the database; the SQL
   `CHECK` constraints in migration `0001` mirror it.

3. **`api/reservations.ts`** — booking creation. Fixed pipeline: method gate →
   Turnstile → rate limit → zod → friendly conflict check → service-role
   `INSERT` → mint HMAC confirm/decline tokens → minimal JSON response (never
   echoes contact details back). Depends on every `api/_lib/*` helper.

4. **`api/_lib/actionToken.ts`** — `generateActionToken()` /
   `verifyActionToken()`. Compact stateless token: `base64url(JSON payload)` +
   `.` + `base64url(HMAC-SHA256(payload, BOOKING_ACTION_SECRET))`, 14-day TTL,
   constant-time comparison. `verify` never throws (returns `null` for every
   failure mode). This one small file is the entire auth model for the
   photographer's actions.

5. **`api/booking-action-execute.ts`** — the *only* endpoint that mutates a
   booking after creation. The action comes from the verified token, not the
   body. The state transition is an atomic
   `UPDATE … WHERE id = ? AND status = 'pending'`, with explicit handling for
   the "no row matched" (`PGRST116`) and unique-violation (`23505`) races, and
   is idempotent for already-handled bookings.

6. **`api/booking-action-info.ts`** — read-only companion to the above; exists
   specifically so link-preview bots can `GET` `/booking-action` without
   side effects.

7. **`src/pages/Reservation.tsx`** — the booking form (422 lines). Holds all
   form state, does a *loose* completeness check to gate the submit button and a
   *real* `reservationSchema.safeParse` on submit, converts the
   `datetime-local` value from Beirut local to a UTC ISO string
   (`beirutLocalToUtcIso`), posts to `/api/reservations`, then on success
   renders a "Notify photographer on WhatsApp" button whose `href` is a
   `wa.me` link built from the returned confirm/decline URLs.

8. **`src/components/LocationPicker.tsx`** — Google Maps autocomplete
   (`PlaceAutocompleteElement`) + a draggable-pin map. Emits
   `{address, lat, lng, mapsUrl}`. Contains a lot of hard-won workarounds
   documented inline: uses the **legacy `google.maps.Marker`** on purpose
   (AdvancedMarkerElement got stuck "UNINITIALIZED" with no interactivity); uses
   the classic `libraries=`/`callback=` script-load pattern rather than
   `importLibrary`; and always writes a `"lat, lng"` fallback address
   immediately on click/drag so an unresolved reverse-geocode can't silently
   block form submission (that bug is commit `9b5df79`). Reverse geocoding
   needs the Geocoding API enabled on the same Google Cloud project.

9. **`api/instagram-photos.ts` + `src/hooks/useInstagramPhotos.tsx` +
   `src/data/photos.ts`** — the live photo pipeline. The function fetches +
   normalizes + caches the owner's Instagram media server-side (token never
   reaches the browser); the hook (a context provider in `App.tsx`) fetches it
   once and derives the hero / gallery / behind-the-lens buckets;
   `photos.ts` defines the `Photo` / `PhotoCategory` types and the
   `photographer`, `stats`, `categories`, `specialties` constants.
   `src/data/fallbackPhotos.ts` is the offline safety net. Every photo-rendering
   component (`Hero`, `GalleryTeaser`, `sections/Gallery`, `GalleryCard`,
   `Lightbox`) reads from the hook.

10. **`src/sections/CraftShowcase.tsx` + `src/sections/CraftScene.tsx`**
    (**both untracked / work-in-progress**) — a Three.js scene of a stylised
    camera whose five parts (front element, aperture, barrel, mount, body)
    "explode" apart as you scroll, with an SVG leader-line label overlay.
    `CraftShowcase` picks a static single-frame render for
    `prefers-reduced-motion` and a 280vh pinned/scroll-scrubbed version
    otherwise; `CraftScene` does the imperative three.js + GSAP ScrollTrigger
    work and cleans up GPU resources on unmount. Already imported by
    `src/pages/Index.tsx` (which is itself uncommitted).

11. **`src/components/Seo.tsx` + `JsonLd.tsx` + `src/lib/seo.ts`** — SEO layer.
    `Seo` renders a `<Helmet>` with title/description/canonical/OpenGraph/Twitter
    tags per page; `JsonLd` injects structured data. Pages emit `Person`,
    `BlogPosting`, and `CollectionPage` JSON-LD, with `AREA_SERVED` enumerating
    Lebanese governorates/districts for regional search visibility.

12. **`src/lib/timezone.ts`** — the "all times are Beirut wall-clock" rule in
    one place. `beirutLocalToUtcIso` (form input → storage) and
    `formatBeirutTime` (storage → every human-facing string, including WhatsApp
    messages), DST-correct via `date-fns-tz`.

**Dependency shape:** `pages/*` compose `sections/*` and `components/*`; nearly
everything reads from `src/data/photos.ts`. `pages/Reservation` and
`pages/BookingAction` additionally depend on `src/lib/{reservationSchema,
timezone,whatsappLink}` and talk to `api/*` over `fetch`. The `api/*` handlers
depend only on `api/_lib/*`, plus `src/lib/reservationSchema.ts` and
`scripts/site-url.ts` (shared across the client/server boundary). There is no
import from `api/` into `src/` or vice-versa except those two shared leaf
modules.

---

## 7. Data layer

**Database:** one hosted Supabase Postgres instance. Accessed only via
`@supabase/supabase-js`'s query builder with the **service-role** key — there is
no ORM, no query files, no generated types beyond the hand-written
`ReservationRow` type in `api/_lib/supabaseAdmin.ts`.

**Schema — `public.reservations`** (from the three migrations):

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` (pgcrypto) |
| `client_name` | `text` NOT NULL | `CHECK` length 2–100 |
| `client_phone` | `text` NOT NULL | `CHECK` E.164 regex |
| `client_email` | `text` NULL | `CHECK` basic email regex when present |
| `session_date` | `timestamptz` NOT NULL | stored UTC; means Beirut wall-clock |
| `session_type` | `text` NOT NULL | `CHECK IN ('Portrait','Street','Landscape','Events')` |
| `session_location` | `text` NOT NULL | added in `0002`; `CHECK` length 1–200 |
| `session_location_lat` | `double precision` NULL | added in `0003`; `CHECK` −90..90 |
| `session_location_lng` | `double precision` NULL | added in `0003`; `CHECK` −180..180 |
| `session_location_maps_url` | `text` NOT NULL | added in `0003`; backfilled for old rows |
| `notes` | `text` NULL | `CHECK` length ≤ 1000 |
| `status` | `text` NOT NULL | `default 'pending'`, `CHECK IN ('pending','confirmed','cancelled')` |
| `client_reminded_at` | `timestamptz` NULL | **see note below** |
| `photographer_reminded_at` | `timestamptz` NULL | **see note below** |
| `created_at` | `timestamptz` NOT NULL | `default now()` |

**Indexes:**

- `reservations_confirmed_session_date_key` — **partial UNIQUE** on
  `session_date` `WHERE status = 'confirmed'`. This is the hard double-booking
  backstop; two *pending* rows may share a slot, two *confirmed* rows cannot.
- `reservations_reminder_lookup_idx` — partial on `session_date`
  `WHERE status = 'confirmed' AND client_reminded_at IS NULL`. Supports a
  reminder job that **no longer exists in the codebase** (see §10/§11).

**Security model:** `ALTER TABLE … ENABLE ROW LEVEL SECURITY` with **no policies
created**, plus `REVOKE ALL … FROM anon` and `FROM authenticated`. Net effect:
the public Supabase anon key can do nothing with this table; every read and
write goes through `api/*` on the service-role key. The migration comment
explicitly warns against adding policies.

**Migrations:** three plain `.sql` files under `supabase/migrations/`, written
to be run once in the Supabase SQL editor or via `supabase db push`. There is no
`supabase/config.toml`, no seed file, and no automated migration step in the
build or any CI — applying them to an environment is a manual action.

**Client-side "data":** blog posts (`src/data/posts.ts`, 3 entries) and
photographer bio/stats (`src/data/photos.ts`) are hard-coded TypeScript. The
photo gallery is *not* — it is fetched at runtime from `/api/instagram-photos`.

---

## 8. External integrations

All configuration is via environment variables. `.env.example` is the tracked,
fully-commented template; a local `.env.local` exists on disk (gitignored, not
inspected for this report). The `VITE_`-prefixed vars are inlined into the
client bundle by Vite and are public by design; everything else is server-only
and must never get a `VITE_` prefix.

| Integration | Env vars | Purpose / status |
|---|---|---|
| **Supabase** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Postgres store for reservations. Service-role key bypasses RLS — server-only. Required for the booking system to work; handlers return a clean 500 ("Booking system is not configured yet") if unset. |
| **Upstash Redis** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | (1) Rate limiting the booking form: sliding window **5 requests / IP / hour**. (2) Server-side cache for the Instagram photo feed (`api/_lib/instagramCache.ts`, ~30 min TTL). **Optional** — if unset, both fall back to a per-instance in-memory equivalent the code describes as "a stopgap." |
| **Instagram Graph API** | `INSTAGRAM_ACCESS_TOKEN` (server-only), `INSTAGRAM_USER_ID` (optional) | Drives the entire photo gallery (`api/instagram-photos.ts`). Long-lived token generated manually via a Meta Developer app on an Instagram professional account (~60-day expiry, must be refreshed). If unset/invalid, the endpoint returns 503/502 and the client falls back to `src/data/fallbackPhotos.ts` — the page never blanks. |
| **Cloudflare Turnstile** | `VITE_TURNSTILE_SITE_KEY` (public), `TURNSTILE_SECRET_KEY` (server) | Bot verification on the booking form. **Currently unconfigured.** `api/_lib/turnstile.ts` logs a loud warning and returns `{success: true}` when the secret is absent, and `pages/Reservation.tsx` hides the widget when the site key is absent. Until both are set, the only bot defense is IP rate limiting. |
| **Google Maps** | `VITE_GOOGLE_MAPS_API_KEY` (public, domain/API-restricted) | Maps JavaScript API + Places API (New) for the location picker; Geocoding API also needs enabling for reverse-geocoding of dropped pins. Billing must be enabled on the Google Cloud project. If the key is missing, `LocationPicker` renders an error state and the form can't be completed. |
| **WhatsApp** | `PHOTOGRAPHER_WHATSAPP_NUMBER` (E.164, server-only) | Click-to-chat only (`wa.me`). No API, no account, no billing. Returned to the client after booking so the browser can build the "notify photographer" link. If unset, that button is hidden and the booking still succeeds. |
| **Booking action links** | `BOOKING_ACTION_SECRET` (server-only) | HMAC-SHA256 key signing the confirm/decline magic links. If unset, `api/reservations.ts` catches the error, logs a warning, and returns `confirmUrl`/`declineUrl` as `null` (booking still created); the frontend then hides the notify button. |
| **Site URL** | `VITE_SITE_URL` (local), `VERCEL_PROJECT_PRODUCTION_URL` (auto in prod) | Canonical origin for SEO tags, `sitemap.xml`, `robots.txt`, and the absolute confirm/decline URLs. Falls back to `http://localhost:5173`. |
| **Google Fonts** | — | `Inter` and `Instrument Serif` loaded via `<link>` in `index.html` (preconnect + stylesheet). |
| **Instagram / WhatsApp (footer)** | — | Hard-coded in `src/components/Footer.tsx`: `instagram.com/3adasa.lb`, `wa.me/+96181872651`. |
| **Unsplash** | — | `contactBackground` in `photos.ts` hot-links an Unsplash image, but nothing imports that export. |

The consistent design principle across every optional integration: **an
unconfigured service degrades to a logged warning, never a hard failure of the
booking flow.**

---

## 9. Build, run, and test

Commands are from `package.json` `scripts` (there is no Makefile, Taskfile, or
`CONTRIBUTING`/`README` guidance — the README is the stock Vite template).

| Task | Command | What it does |
|---|---|---|
| Install | `npm install` | Standard npm install from `package-lock.json`. |
| Dev server | `npm run dev` | `vite` (default `http://localhost:5173`). Serves the SPA plus `/api/instagram-photos` (via `scripts/instagram-dev-plugin.ts`); the other `api/` functions still need `vercel dev`. |
| Regenerate SEO files | `npm run generate-seo` | `tsx scripts/generate-seo-files.ts` — rewrites `public/sitemap.xml` + `public/robots.txt`. |
| Production build | `npm run build` | `generate-seo` → `tsc -b` (typechecks all three tsconfig projects) → `vite build` (output to `dist/`). |
| Preview build | `npm run preview` | `vite preview` — serves `dist/` locally. |
| Lint | `npm run lint` | `oxlint` with the 2-rule `.oxlintrc.json`. |

**Running the API locally:** `npm run dev` serves `/api/instagram-photos` (a Vite
plugin loads the real handler — set `INSTAGRAM_ACCESS_TOKEN` in `.env.local` for
live data, otherwise the client uses its bundled fallback set). The *other* `api/`
functions require the Vercel runtime (`vercel dev`, **not installed**), so with
just `npm run dev` any `fetch('/api/…')` from `/reservation` or `/booking-action`
will 404.

**Tests:** **there are none.** No test runner is installed (no vitest, jest,
playwright, etc.), there is no `test` script, and there are no `*.test.*` /
`*.spec.*` files or `__tests__` directories anywhere in the repo. Test coverage
is 0%.

---

## 10. Current state

**CI/CD.** No CI configuration in the repo — there is no `.github/` directory,
no GitLab/CircleCI/etc. config. Deployment is via Vercel's Git integration
(the repo is linked to Vercel project `3adasa` through `.vercel/project.json`),
so pushes to the connected branch presumably trigger Vercel builds, but nothing
in the repo defines or gates that. No lint/typecheck/test gate exists anywhere
except whatever Vercel's build (`npm run build`, which includes `tsc -b`) enforces.

**Branches.** Only `main` (local and `origin/main`); the local branch is even
with the remote. No feature branches, no tags.

**Test suite.** None (see §9).

**Git history.** Long but very low-signal: the large majority of commit messages
are `mod`, `mod:`, `mpod`, `push`, `mpod`. A handful of recent ones are
descriptive and show what the recent work has been:

- `59e7312` "Replace text location field with Google Maps picker; remove Twilio
  for click-to-chat" — the pivot away from automated messaging.
- `4f54943` "Add magic-link booking confirmation, replacing the planned admin
  page" — the current confirm/decline model.
- `723c547`, `03aadd1`, `4fc8712`, `721c93b`, `4e225de`, `1b9431a`, `9b5df79` —
  a run of debugging the Google Maps `LocationPicker` (marker init, autocomplete
  dropdown clipping, click/drag submission blocked on reverse geocode). Two
  `DEBUG:` commits in that run were follow-up-reverted by later fixes but the
  commits remain in history.
- `42c28f6` — the last commit that still mentions the (now-removed) reminder /
  Twilio flow.

**Uncommitted work in progress (working tree is dirty):**

- **Untracked:** `src/sections/CraftScene.tsx`, `src/sections/CraftShowcase.tsx`
  — a new Three.js "The Craft" home-page section.
- **Modified:** `src/pages/Index.tsx` (now imports and renders `<CraftShowcase/>`),
  `package.json` (adds `three` + `@types/three`), `package-lock.json` (matching),
  `public/sitemap.xml` (`lastmod` date bump from a build).

  The modified `Index.tsx` depends on the two untracked files, so this change set
  is only coherent as a unit — committing `Index.tsx` (or `package.json`)
  without also adding the `sections/Craft*` files would break the build.

**Incomplete / half-removed features:**

- **Reminder system.** Migration `0001` created `client_reminded_at`,
  `photographer_reminded_at`, and `reservations_reminder_lookup_idx`;
  `api/_lib/supabaseAdmin.ts` still carries those fields on `ReservationRow`; and
  comments in `supabaseAdmin.ts` and `0001_reservations.sql` reference
  `api/send-reminders.ts`. **That file does not exist.** The reminder/cron
  feature was removed with Twilio but left schema, an index, type fields, and
  dangling comment references behind. There is also no `crons` config
  (`vercel.json` has only the rewrite).

- **Dead CTAs.** `src/sections/Hero.tsx` "Book a Session" button links to
  `href="#"` (should be `/reservation`); `src/sections/About.tsx` "Get in touch"
  links to `href="#"` with a commented-out `mailto:` and no
  `photographer.email` defined.

**TODO/FIXME markers:** essentially none — a repo-wide search of `src/`, `api/`,
`scripts/` finds no `TODO`/`FIXME`/`HACK`/`XXX`, only two
`// eslint-disable-next-line react-hooks/exhaustive-deps` comments (in
`LocationPicker.tsx` and `Turnstile.tsx`). There are, however, several blocks of
commented-out JSX/code left in place (`AboutTeaser.tsx` specialties block,
`GalleryCard.tsx` halftone overlay, `Hero.tsx` `scrollTo`, `About.tsx` mailto).

---

## 11. Notable issues & tech debt

Roughly in priority order for anyone about to build on this:

1. **Turnstile is not configured, so the booking form's only bot defense is IP
   rate limiting** — and if Upstash isn't configured either, that rate limiting
   is a per-instance in-memory map that resets on every cold start. Both gaps
   are acknowledged in code comments. Before any real launch, set
   `TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY` and the Upstash vars.

2. **The working tree is mid-feature.** The Three.js "Craft" section
   (`src/sections/CraftScene.tsx`, `CraftShowcase.tsx`) is untracked while
   `src/pages/Index.tsx` and `package.json` already depend on it. A clean
   checkout of `HEAD` doesn't include these files; a partial `git add` breaks
   the build. Resolve (commit as a unit, or stash) before branching off.

3. **Half-removed reminder feature.** Dead columns
   (`client_reminded_at`, `photographer_reminded_at`), a dead partial index
   (`reservations_reminder_lookup_idx`), dead `ReservationRow` fields, and
   comments pointing at a non-existent `api/send-reminders.ts`. Either
   reinstate the feature or clean the schema/type/comments so the next reader
   isn't misled.

4. **`bootstrap` (5.3.8) is a declared dependency with zero imports.** Dead
   weight; the whole visual system is Tailwind + CSS variables. Safe to remove
   after a grep confirms (done for this report: no references).

5. **Bleeding-edge / possibly-unreleased dependency versions.**
   `typescript ~6.0.2`, `vite ^8.1.1`, `@vitejs/plugin-react ^6`,
   `react ^19.2.7`, `@types/node ^24.13` are ahead of, or at the very edge of,
   public releases. Confirm `npm ci` reproduces cleanly and that the resolved
   versions in `package-lock.json` are real published artifacts before assuming
   the stack is stable.

6. **No local full-stack dev story.** `npm run dev` (Vite) doesn't serve `api/`.
   Anyone touching the booking flow needs `vercel dev` (CLI not installed, not
   documented). Worth adding a `dev:api` note or script.

7. **Migrations are applied by hand.** No `supabase/config.toml`, no CLI link
   artifacts, no migration step in build/CI. Schema drift between environments
   is entirely on the operator to prevent. Consider adopting the Supabase CLI
   properly or at least documenting the apply procedure.

8. **Git hygiene.** The commit log is mostly `mod`/`push`/`mpod`. History is
   effectively un-bisectable and un-reviewable. Not a code problem, but it means
   "check the git log" is not a viable way to understand past decisions — the
   descriptive comments in the code are the real record.

9. **No CI gate.** Lint (`oxlint`, only 2 rules) and typecheck (`tsc -b`, part
   of `build`) exist but nothing runs them on push except Vercel's build. A
   broken `tsc` fails the deploy but there's no earlier signal, and lint is
   never enforced.

10. **`getClientIp` trusts the first `x-forwarded-for` entry.** Fine behind
    Vercel's proxy in practice, but it's a client-controlled header; if any
    request path reaches the function without Vercel rewriting that header, the
    per-IP rate limit is trivially bypassed by spoofing it. Low severity given
    the deployment, worth knowing.

11. **Duplicated markup between `sections/Gallery.tsx` and
    `sections/GalleryTeaser.tsx`** (the "Selected Work / Featured shots" header
    block is copy-pasted), and `sections/Gallery.tsx` has an empty
    `accent-gradient` `<button>` (lines ~60–63) that renders nothing.

12. **`Lightbox` wraps its content in `AnimatePresence` but is conditionally
    mounted** by its parent (`{lightboxIndex !== null && <Lightbox/>}`), so the
    exit animation can never run — the whole subtree unmounts instantly. Minor
    visual polish bug.

13. **Taxonomy is slightly inconsistent.** `Photo.categories` and
    `SESSION_TYPES` both include `Street`, but the gallery filter
    (`categories` export in `photos.ts`) is `["All","Portrait","Landscape","Events"]`
    — no Street. `specialties` is `["Portrait","Landscape","Events"]`. Depending
    on intent, Street work either can't be filtered to or shouldn't be a session
    type.

14. **`LocationPicker` uses the deprecated `google.maps.Marker`** on purpose
    (documented reason: `AdvancedMarkerElement` wouldn't initialise). Google
    will eventually force migration; this is a known future task, not a current
    bug.

15. **No React error boundary** anywhere in the tree — a throw in any section
    (e.g. the imperative Three.js code, or a Google Maps failure mode not
    already handled) blanks the page.

16. **`src/lib/seo.ts` casts `import.meta.env.VITE_SITE_URL as string`
    unconditionally.** It's injected via `vite.config.ts` `define`, so it's
    present at build — but there's no runtime guard if that ever changes.

17. **Mixed import-extension convention.** `api/` and cross-boundary imports use
    explicit `.js` on `.ts` files; `src/` internal imports don't. Intentional
    (Vercel bundler) but a footgun for contributors who "fix" one to match the
    other.

---

## 12. Open questions

Things the code alone doesn't answer — worth clarifying before building on top:

1. **Whose site is this?** Metadata says "Jad Daou"; the brand, repo, Vercel
   project, and Instagram are "3adasa" / `3adasa.lb`; the footer credits Alaa
   Fayyad as builder and that's the git author. Is "Jad Daou" the client and
   "3adasa" the studio/brand name, or is the metadata a placeholder?

2. **Is the Three.js "Craft" section meant to ship?** It's already wired into
   the home page but untracked. Finish, or is it an experiment to drop?

3. **Is the reminder feature coming back?** Should the leftover columns/index/
   type fields be cleaned up, or is `api/send-reminders.ts` (+ a Vercel cron)
   planned to return?

4. **Target Node version / are the exotic dependency versions deliberate?**
   No `engines`, and several deps are ahead of public releases. Is this pinned
   to a nightly/canary channel on purpose, or should versions be rolled back to
   current stable?

5. **Environment topology.** Is there a separate Supabase project (and separate
   Upstash / Turnstile / Google keys) for Vercel Preview deployments vs
   Production, or does everything point at one database? The `api/` code has no
   notion of environment beyond the presence/absence of a var.

6. **How are migrations applied to production, and by whom?** There's no
   automation and no runbook in the repo.

7. **Is `bootstrap` intentionally a dependency?** Nothing imports it.

8. **Launch readiness for bot protection** — is there a plan/timeline to
   configure Turnstile and Upstash before the booking form is publicly
   advertised?

9. **Blog** — is the 3-post hard-coded `src/data/posts.ts` the intended
   long-term model, or a placeholder for a future CMS/MDX pipeline?

10. **`vercel dev` workflow** — is anyone actually running the API locally, or
    is the booking flow only ever tested on Vercel Preview deployments?
