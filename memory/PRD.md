# DEVAM — Real Estate CRM & ERP (Gujarat Edition)

## Original Problem Statement
User shared the URL https://property-lead-hub-9.preview.emergentagent.com/ (a real-estate CRM
named DEVAM targeting the Gujarat property market — Gandhinagar / Ahmedabad / NRI investors —
with a tagline "One platform. Every property deal.", 21 modules, AI Lead Scoring and 8 user roles).
User asked agent to build it from scratch with best judgment ("a" → option A — build the full CRM).

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth (HS256, 12h access + 7d refresh, cookie + Bearer),
  bcrypt password hashing, AI lead-scoring via `emergentintegrations` → Claude Sonnet 4.5.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind 3, Sonner for toasts, Lucide icons.
- **Database**: MongoDB (collections: users, leads, projects, builders, site_visits, bookings, inventory).
- **Design system**: Custom Organic & Earthy theme — sand background `#F9F6F0`, terracotta accent
  `#C25934`, Fraunces display + IBM Plex Sans body, no tailwind blue/purple, grain texture overlays.

## User Personas
- **Sales Admin** (default seeded admin) — full access to leads, projects, builders, inventory.
- **Sales Agent** — owns leads, schedules site visits, captures feedback. (role field exists; full RBAC future scope.)
- **Builder Partner** — read-only view of their projects/inventory. (future)
- **NRI Investor / Client** — public landing; can be expanded to portal. (future)

## Core Requirements (Static)
1. Marketing landing page that converts to login.
2. Secure email/password login (demo: admin@devam.com / Admin@123).
3. Dashboard with KPI cards, lead funnel, source breakdown, recent leads.
4. Leads module — capture inquiry, AI scoring (Hot/Warm/Cold + reasoning), stage pipeline.
5. Projects module — list & manage projects with builder linkage, status, pricing, units.
6. Builders module — directory with contacts, rating, project count.
7. Site Visits module — schedule, assign agent, capture feedback, status flow.
8. Bookings module — token → agreement → registered, auto-moves lead stage to "Booked".
9. Inventory module — towers × floors × units grid with cycle-through status (Available/Blocked/Booked/Sold).

## What's Been Implemented (2026-06-12)
- ✅ JWT auth (cookie + Bearer fallback), admin auto-seeding, bcrypt hashing
- ✅ Landing page (hero, modules grid, why-devam testimonial, CTA, footer)
- ✅ Login page with side architecture image and demo creds card
- ✅ Dashboard layout (sidebar + topbar, search, user chip, sign-out)
- ✅ Overview dashboard (4 KPIs, lead funnel, source distribution, recent leads table)
- ✅ Leads — list/filter/search/create (with live AI scoring) / stage select / re-score / delete
- ✅ Projects — card grid with imagery, status badge, RERA, create/delete
- ✅ Builders — directory table with rating star, create/delete
- ✅ Site Visits — table, datetime scheduling, status flow, agent assignment, delete
- ✅ Bookings — table with INR formatting, status flow, auto-promotes lead to "Booked"
- ✅ Inventory — tower/floor grid, click-to-cycle status, status counts (defaults to first project with units)
- ✅ Seed data: 4 builders, 4 projects, 80 inventory units, 8 AI-scored leads, 3 visits, 1 booking
- ✅ 16/16 pytest backend tests pass; frontend e2e verified by testing subagent

## Prioritized Backlog
### P0 (nice to ship soon)
- Edit-in-place for leads/projects/builders (currently delete + recreate)
- Lead detail drawer with timeline (calls, visits, notes)
- Inventory generator — create N towers × N floors × N units in one go

### P1
- Role-based access (sales agent vs admin vs builder partner)
- Email/WhatsApp drip campaigns for cold leads (SendGrid / Twilio integration)
- File uploads for project brochures / floor plans
- CSV import/export for bulk lead intake
- Charts library (recharts already installed) for trend lines on dashboard

### P2
- NRI investor portal (read-only dashboards by user)
- Document signing / agreement generation
- Calendar sync for site visits (Google Calendar)

## Next Tasks
1. Wire up lead detail page with activity timeline.
2. Add inventory bulk-create.
3. Build user management & role assignment screens.
