# MONÂM OS

Platform + landing page for Monâm Skin Studio (Mexico City — Roma Norte, Prado Norte).

## Specs (source of truth — read these, not this README, for requirements)

- `../MONAM_OS_System_Specification.md` — Admin / Vendedor / Cliente panels, shared data model, business rules, phasing
- `../MONAM_Landing_Page_Build_Spec.md` — public landing page: brand tokens, copy, sitemap
- `../MONAM_Discovery_Onboarding_Document.docx` — client's original discovery doc (overrides the spec where they disagree)
- `../MONAM_OS_Fase1_35kMXN_ES.docx` / `../MONAM_OS_Phase1_Rescope_35kMXN.docx` — signed Fase 1 scope ($35,000 MXN)

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- Supabase (Auth, Postgres, Storage) via `@supabase/ssr`
- Prisma 7 (`@prisma/adapter-pg`) over the same Supabase Postgres instance
- `next/font/google` stand-ins for licensed brand fonts (swap before production — spec §12 asset checklist): Fraunces→Riccione, Prata→Donatello, Beau Rivage→Respondent; Inter is the real brand font already.

## Structure

```
app/
  (marketing)/     public landing page — unauthenticated
  admin/           Owner + Clinic Manager panel
  staff/           Front Desk + Esthetician panel ("Vendedor")
  my/              Client panel (booking, Skin ID, packages) — scope TBC, spec §14
  login/           role-aware auth entry, redirects by role
lib/
  supabase/        browser / server / admin (service-role) clients
  prisma.ts        app-runtime PrismaClient singleton (pooled DATABASE_URL via @prisma/adapter-pg)
prisma/
  schema.prisma    full data model, written and validated (see Status) — not yet migrated
                   against a live database or wired into any page
prisma.config.ts   Prisma 7 CLI config (migrations use the direct, non-pooled DIRECT_URL)
content/
  en.json, es.json, mixed.json   i18n content strings — mixed.json is the brand-authentic
                                  default (English marketing copy + Spanish structural
                                  labels, per Landing Spec §1 voice rules); en/es are the
                                  full single-language toggle targets (Landing Spec §11)
components/panel/
  Sidebar, TopBar, LocationSwitcher, Card    shared Admin/Staff chrome
  StaffRoleContext, RoleToggle, StaffShell   Front Desk / Esthetician variant switching
  ClientNav                                  Cliente panel top nav
lib/
  content.ts       typed loader for content/*.json
  mock-data.ts      static fixtures powering all three panel UIs (no backend yet)
  whatsapp.ts       wa.me link builder (real number pending — see .env.local.example)
```

## Status

**UI-first build complete — no backend yet** (per explicit direction: build UX/UI, wire up
Supabase/Prisma after). All screens are Spanish-first (spec §13) and built and verified
(typecheck + lint + build clean across all 33 routes, checked live in-browser at desktop,
tablet, and mobile widths). Everything below runs against `lib/mock-data.ts` — no real data,
no auth, no persistence, though several list/queue screens (Approvals, Check-in, Consent
Center, retail tagging) update local state on click so the flows feel real.

- **Landing page** (`/`) — full build per `MONAM_Landing_Page_Build_Spec.md` §8-10: all
  sections, brand tokens/fonts, defaults to Spanish with an EN/ES/mixed toggle. Uses the
  System Spec's corrected 8-protocol treatment menu, not the Landing Spec's own placeholder
  menu table (the two docs disagree — flagged in `content/*.json`).
- **Login** (`/login`) — role picker (Administración / Personal / Cliente) that routes into
  the matching panel — the actual entry point tying the four surfaces together. Clearly
  labeled as a pre-auth stand-in; real logins will be individually named, not a role picker
  (spec §2/§10).
- **Admin** (`/admin`) — full IA built out: Dashboard (exact §6.2 content order), Calendar
  (all-location room/time grid), Clients (directory + full record detail with audit trail),
  **Inventory** (`/admin/inventory` — one screen, Todos/Retail/Backbar tabs, KPI row; the two
  ledgers stay logically separate — never summed into one stock line, per spec §5.3 — but no
  longer need two separate nav clicks to check), **Financials** (the
  §6.3 deep-dive: gross margin KPI, 8-week revenue trend, revenue-and-margin-per-protocol
  table — COGS only, labeled as excluding labor/commission/rent — service-vs-retail margin
  comparison, room *and* esthetician occupancy, inventory value *and* consumption, accountant
  export), Commissions (per-staff totals + attribution override log),
  Staff (roster), Approvals (queue with working approve/reject), Audit Log (anomaly flags +
  access history), Settings (locations, protocol menu, deposit/cancellation rules).
  Promotions & Packages and Purchase Orders stay as disabled "Fase 2" nav items, per scope.
- **Staff/Vendedor** (`/staff`) — one panel, Front Desk/Esthetician role toggle switches nav
  + content throughout: Today, Check-in (working "registrar llegada"), Checkout/POS, Client
  Profile (role-scoped — Front Desk sees safety flags only, Esthetician sees the full Skin
  ID, per §7.4), Treatment Record (protocol assigned post-arrival, real selection state, per
  §5.2), Retail Recommendation Tags (interactive 1-of-3 tagging — the shared feature feeding
  checkout/commissions/attach-rate per §5.4), My Schedule. My Commission stays disabled
  (Phase 2 per the signed rescope).
- **Cliente** (`/my`) — full IA: Home, an interactive 5-step Book flow (location → duration
  → slot → deposit-if-Signature → confirmation, per §8.2), My Appointments, My Skin ID
  (read-only + ARCO correction request), Preferences (editable), Packages, Purchases,
  Consent Center (per-document revoke, working toggle), Payment Methods.
- **Responsive chrome** — Admin/Staff sidebars collapse to an off-canvas drawer below the
  `lg` breakpoint (`components/panel/PanelNavContext.tsx` + `Sidebar.tsx`), matching spec
  §4's device-context requirement (phone-first Admin, tablet-dense Esthetician). TopBar
  progressively hides the location switcher and user detail on narrow screens rather than
  wrapping.
- **Favicon** — `app/icon.svg`, the brand isologo (circumflexed M in a Ciruela circle, spec
  §4) as a placeholder redraw pending the licensed SVG export.
- **Location switcher** (`components/panel/LocationSwitcher.tsx`) — a dropdown driven
  entirely by the `LOCATIONS` array, not a hardcoded pill toggle, so it scales to future
  locations with zero layout changes. Admin gets a checkbox multiselect + "todas las
  sucursales"; Staff gets single-select (sessions are location-scoped, spec §2). Inactive
  locations (Prado Norte, pre-opening) show disabled with "Próximamente".
- **User menu** (`components/panel/UserMenu.tsx`) — the avatar in every panel (Admin, Staff,
  Cliente) is now a real dropdown: "Editar perfil" (routes to a per-panel `/profile` page —
  `ProfileForm.tsx` — pre-filled from mock identity data, with a password section) and
  "Cerrar sesión" (routes back to `/login`).

- **Data model** (`prisma/schema.prisma`) — written and validated (`npx prisma validate`),
  connected to a Supabase project (`lib/prisma.ts` singleton over `@prisma/adapter-pg`,
  `prisma.config.ts` for CLI/migrations). Not yet migrated against the live database, and no
  page reads from it yet — every screen still reads `lib/mock-data.ts`.

Not built: auth, and any of it actually persisting — every screen is still a static read of
`lib/mock-data.ts`. See `../MONAM_OS_System_Specification.md` and the architecture plan for
the migration/seed/page-cutover order once the Supabase connection is live.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + integration keys
npm run dev
```

## WhatsApp & Stripe setup

Both integrations (`lib/whatsapp/`, `lib/payments/stripe.ts`) are fully built and wired into
the real booking engine (`lib/booking-core.ts` — the same `insertAppointment` every other
entry point uses), but stay inert until their env vars are set — see
`lib/feature-flags.ts`'s `WHATSAPP_BOOKING_ENABLED`/`STRIPE_ENABLED`, which auto-detect this.
No code change is needed to turn either on; just add the keys below and register the webhook
URLs.

**WhatsApp booking bot** — a numbered-menu conversation (location → duration → protocol →
date → time → name → confirm) that books directly into the calendar, reusing
`Client.phone` as the identifier (spec §5.1) and the shared device/room/esthetician conflict
engine (spec §5.2) exactly like every other booking path. State lives in
`WhatsAppConversation` (one row per phone number), not in memory, so it survives serverless
cold starts.

1. In [Meta Business Manager](https://business.facebook.com), create/select an App → add the
   WhatsApp product.
2. Under WhatsApp → API Setup, note the **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`, and
   generate a permanent token under System Users (not the 24h test token) → `WHATSAPP_API_TOKEN`.
3. Invent any string for `WHATSAPP_VERIFY_TOKEN` — you'll enter the same value in both the env
   var and Meta's webhook config in the next step.
4. Under WhatsApp → Configuration, set the webhook URL to
   `https://<your-domain>/api/whatsapp/webhook`, paste the verify token, and subscribe to the
   `messages` field.
5. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to the real WhatsApp Business number (used by the
   landing page's "Book via WhatsApp" deep link — opening a chat is what triggers the bot).

**Stripe deposit checkout** — when a Signature appointment needs a deposit (spec §5.2), the
bot sends a real Stripe Checkout link instead of just holding an unpaid deposit row; the
appointment itself is only created once `checkout.session.completed` fires (see
`app/api/stripe/webhook/route.ts`), so a slot is never reserved for an unpaid booking. The
web `/my/book` flow still creates a manual (unpaid) deposit today — wiring Checkout into that
flow too is a short follow-up once this is live, not done yet.

1. From the [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys, copy
   the **Secret key** → `STRIPE_SECRET_KEY`.
2. Under Developers → Webhooks, add an endpoint at `https://<your-domain>/api/stripe/webhook`
   subscribed to `checkout.session.completed`, then copy its **Signing secret** →
   `STRIPE_WEBHOOK_SECRET`.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed site's origin (used to build the Checkout
   success/cancel redirect URLs).

Both webhook routes need a public HTTPS URL to register against — a local `npm run dev`
instance isn't reachable from Meta/Stripe's servers. Use a tunnel (e.g. `ngrok http 3000`)
for local testing, or test against a deployed preview URL.
