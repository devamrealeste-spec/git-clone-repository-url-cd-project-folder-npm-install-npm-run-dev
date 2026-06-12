# DEVAM — Real Estate CRM & ERP (Gujarat Edition)

## Original Problem Statement
User shared https://property-lead-hub-9.preview.emergentagent.com/ (a real-estate CRM
named DEVAM for the Gujarat property market — Gandhinagar / Ahmedabad / NRI investors —
tagline "One platform. Every property deal.", 21 modules, AI Lead Scoring, 8 user roles).
User asked agent to build it with best judgment and then implement "all" of the next-action items.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth (HS256 — 12h access + 7d refresh, cookie + Bearer),
  bcrypt password hashing, AI lead-scoring via `emergentintegrations` → Claude Sonnet 4.5,
  RBAC (`require_admin` dependency on /users endpoints), public unauthenticated lead-capture endpoint.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind 3, Sonner toasts, Lucide icons.
- **Database**: MongoDB — collections: users, leads, lead_activities, projects, builders, site_visits, bookings, inventory.
- **Design system**: Custom Organic & Earthy theme — sand background `#F9F6F0`, terracotta accent
  `#C25934`, Fraunces display + IBM Plex Sans + IBM Plex Mono, no blue/purple, grain texture overlays.

## User Personas & Roles
- **admin** — full access incl. user management.
- **sales_manager** — operational management; sees all leads/projects (RBAC scaffolding in place).
- **sales_agent** — owns assigned leads, schedules site visits, captures feedback.
- **builder_partner** — read-only view of their projects/inventory (scaffold).
- **viewer** — read-only auditor (scaffold).
- **NRI Investor / Client** — public-facing inquiry via `/capture/:projectId` micro-site.

## Core Requirements (Static)
1. Marketing landing page that converts to login.
2. Secure email/password login (demo: admin@devam.com / Admin@123).
3. Dashboard with KPI cards, lead funnel, source breakdown, recent leads.
4. Leads module — capture inquiry, AI scoring (Hot/Warm/Cold + reason), stage pipeline,
   click-row detail drawer with activity timeline.
5. Projects module — list/manage with builder linkage, status, pricing, units, and a
   "Share form" button that copies a public capture URL.
6. Builders module — directory with contacts, rating, project count.
7. Site Visits module — schedule, assign agent, capture feedback, status flow.
8. Bookings module — token → agreement → registered; auto-moves lead stage to "Booked".
9. Inventory module — towers × floors × units grid with click-to-cycle status + bulk generator.
10. Users (Team) module — admin-only CRUD with role assignment & password reset.
11. Public lead-capture micro-site at `/capture/:projectId` for embedding on IG bios / WA links.

## What's Been Implemented

### Iteration 1 (2026-06-12)
- ✅ JWT auth (cookie + Bearer fallback), admin auto-seeding, bcrypt hashing
- ✅ Landing, Login, Dashboard layout (sidebar + topbar, search, profile chip, sign-out)
- ✅ Overview dashboard (4 KPIs, lead funnel, source distribution, recent leads)
- ✅ Leads — list/filter/search/create (with live AI scoring) / stage select / re-score / delete
- ✅ Projects — card grid with imagery, status badge, RERA, create/delete
- ✅ Builders — directory with rating star, create/delete
- ✅ Site Visits — datetime scheduling, status flow, agent assignment, delete
- ✅ Bookings — table with INR formatting, auto-promotes lead to "Booked"
- ✅ Inventory — tower/floor grid, click-to-cycle status, status counts
- ✅ 16/16 backend tests pass; frontend e2e verified

### Iteration 2 (2026-06-12)
- ✅ **Edit-in-place** for Leads, Projects, Builders (prefilled modal + PATCH)
- ✅ **Lead Detail Drawer** with activity timeline (Note/Call/WhatsApp/Email/Meeting),
      inline stage chips and key facts
- ✅ **Inventory bulk generator** — towers × floors × units modal creates N units in one call
- ✅ **Users / Team management** with 5 roles + admin-only RBAC (cannot delete self or seeded admin)
- ✅ **Public lead-capture micro-site** at `/capture/:projectId` — project hero + form,
      no auth needed; submitted leads land in CRM with AI score
- ✅ **Share form** button on each project card copies the public URL to clipboard
- ✅ 16/16 iteration-2 backend tests pass; frontend 100% pass after tester auto-fixed a missing
      useState (now committed) — no further action needed

## Prioritized Backlog
### P0 (next session)
- Drag-and-drop Kanban view for leads (alternative to table view)
- Lead assignment to specific sales agent + agent-only filter
- Auto-block inventory unit when booking is created
- "My Leads" filter for sales agents (currently all users see all leads)

### P1
- WhatsApp Business / SendGrid integration for outbound drips on cold leads
- File uploads for project brochures / floor plans / KYC docs
- CSV import/export for bulk lead intake
- Trend charts (recharts already installed) on dashboard
- Rate-limit on /api/public/leads (slowapi)

### P2
- Builder partner portal (read-only view scoped to their projects)
- Document signing / agreement PDF generation
- Calendar sync for site visits (Google Calendar)
- Multi-language UI (Gujarati / Hindi)

## Next Tasks
1. Kanban + lead assignment for sales agents.
2. WhatsApp drip automation for cold/idle leads.
3. CSV bulk import.
