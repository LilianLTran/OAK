# 🌸 OAK — Nail Appointment Marketplace (MVP)

An Airbnb-style marketplace connecting customers with independent nail technicians. Technicians manage profiles, services, and availability; customers search by **real appointment availability** and book exact time slots. Styled with the OAK palette.

**Stack:** React + TypeScript + Tailwind · Node.js + Express + TypeScript · PostgreSQL + Prisma · JWT auth · Stripe (architected, stubbed).

---

## Quick start

Prereqs: Node 18+, Docker (or a local PostgreSQL 14+).

```bash
cd backend && cp .env.example .env && cd ..

# 1. Database + backend (both in Docker)
docker compose up -d --build
docker compose exec backend npm run db:setup   # prisma db push + EXCLUDE constraints + demo seed
                                                 # API now on http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev             # App on http://localhost:5173 (proxies /api)
```

Prefer running the backend outside Docker for faster iteration (auto-reload on save)? Skip `docker compose up -d --build` for the backend and instead run only the db service plus the local dev server:

```bash
docker compose up -d db
cd backend
npm install
npm run db:setup
npm run dev             # API on http://localhost:4000
```

### Demo accounts (password `Password123!`)

| Role | Email | Notes |
|---|---|---|
| Admin | admin@oak.app | Full admin dashboard |
| Customer | lilian@example.com | Has upcoming + past appointments, favorites, reviews |
| Customer | maya@example.com / sofia@example.com | More sample data |
| Technician | vy@oak.app | San Jose · auto-approve · 15-min buffer |
| Technician | han@oak.app | San Jose · **manual approval** (bookings start Pending) |
| Technician | jess@oak.app | Oakland · mobile service · 30-min buffer |
| Technician | thao@oak.app | Houston · no buffer |

Seeded techs work **Tue–Sat, 9:00–12:30 and 13:30–18:00** (the gap is a lunch break), so search a Tue–Sat date to see slots.

---

## Architecture

```
nailbloom/
├── docker-compose.yml          # PostgreSQL 16
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # 12 normalized models
│   │   ├── constraints.sql     # Postgres EXCLUDE constraints (anti double-booking)
│   │   ├── applyConstraints.ts
│   │   └── seed.ts             # full demo dataset
│   └── src/
│       ├── app.ts / server.ts
│       ├── config/ lib/ utils/ # env, prisma client, logger, errors, pagination
│       ├── middleware/         # authenticate, authorize(role), validate(zod), error handler
│       └── modules/            # feature modules (routes → service → repository)
│           ├── auth/  users/  technicians/  services/
│           ├── availability/   # ⭐ slot engine (pure, unit-testable) + repository
│           ├── appointments/  reviews/  payments/  admin/
└── frontend/
    └── src/
        ├── i18n/               # en.ts now; drop in vi.ts to localize
        ├── lib/ context/ components/
        └── pages/{public,customer,tech,admin}/
```

Backend is organized by **feature module**, each with routes (HTTP + validation), a service (business rules), and — where data access is non-trivial — a repository. Cross-cutting concerns (auth, validation, errors, pagination, logging) are middleware/utilities.

## The availability engine (core)

`modules/availability/availability.engine.ts` is a pure function:

```
computeSlotsForDate(date, duration, weeklyWindows, blockedTimes, activeAppointments, config)
```

- Weekly windows are stored per weekday in minutes-since-midnight; **multiple windows per day model breaks** (9:00–12:30 + 13:30–18:00 ⇒ lunch break).
- Blocked times cover vacations/one-off blocks; active (pending/confirmed) appointments are expanded by the technician's **buffer** on both sides.
- Candidate starts step by the technician's **slot interval**; a slot is offered only if the whole service duration (+ add-ons) fits inside a window and collides with nothing. All wall-clock math is done in the technician's timezone (Luxon), stored as UTC.

**Double-booking is prevented at three layers:**
1. The engine never offers taken slots (search & booking UI).
2. Booking runs in a **Serializable transaction** that re-checks overlaps for both the technician *and* the customer.
3. Postgres **EXCLUDE constraints** (`tsrange && tsrange` with btree_gist, filtered to PENDING/CONFIRMED) make races impossible at the database level; violations surface as a friendly 409.

## Search

`GET /api/technicians/search` filters in SQL (city/state **location matching**, service name/category, price range, min rating, technician/salon name), then — when a date is given — runs the slot engine per candidate and **drops any technician without an open slot at/near the requested time** (±60 min). Fully booked technicians never appear. Results are paginated and include the first available slots for one-tap booking.

## API summary

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` · `/login` · `/logout` · `GET /me` |
| Users | `PATCH /api/users/me` · favorites `GET/POST/DELETE /api/users/me/favorites[/:techId]` |
| Technicians | `GET /search` · `GET /:id` · `GET/PATCH /me` · portfolio `POST/DELETE /me/portfolio` |
| Services | `GET /me` · `POST /` · `PATCH /:id` · `DELETE /:id` (soft) |
| Availability | `GET /:techId/slots?date&serviceId[&addOnIds]` · `GET/PUT /me/schedule` · `POST/DELETE /me/blocked` |
| Appointments | `POST /` · `GET /mine` · `/technician` · `/earnings` · `/:id` · `POST /:id/{cancel,pay,confirm,reject,tech-cancel,complete,no-show}` |
| Reviews | `POST /` · `GET /mine` · `GET /technician/:id` |
| Payments | `POST /webhook` (Stripe stub, raw body) |
| Admin | `GET /stats` · `/users` · `/appointments` · `/reviews` · `POST /users/:id/suspend` · `DELETE /users/:id` · `POST /reviews/:id/hide` · `GET/PUT /settings` |

All list endpoints support `page`/`pageSize`. Validation is Zod; auth is JWT Bearer with role-based `authorize()` guards; suspended accounts are rejected on every request.

## Business rules enforced

- No overlapping appointments per technician **or** per customer (3 layers, see above).
- Appointments must fall inside working windows, respect breaks/blocked time/buffer, and start ≥30 min from now.
- Duration & price = service + selected add-ons, snapshotted onto the appointment (history survives later edits).
- Status flow: `PENDING → CONFIRMED → COMPLETED/NO_SHOW`, with cancel/reject paths; auto-approve technicians skip PENDING. Completing before start time is rejected.
- Only **completed** appointments can be reviewed, once each; ratings cached (avg/count) on the profile and recomputed on moderation.
- Technicians can only edit their own profile/services/schedule (ownership checks in every service).
- Admin: suspend/remove users, hide reviews, view everything, edit platform settings.

## Stripe (placeholder by design)

`modules/payments/` documents the production flow: PaymentIntent with manual capture at booking → client confirms via Stripe Elements → webhook transitions payment status → refunds on cancellation → payouts via Stripe Connect Express with a platform fee (`PlatformSetting.platformFeePercent`). The MVP ships a demo "pay now" that flips the Payment row to PAID.

## Brand

OAK palette: `#FFAEBA` blossom · `#CCABD6` lilac · `#00C6E3` aqua · `#0061BF` trust blue · `#016273` deep teal · `#F2FB7A` lime · `#C6A15B` gold accent, on cream `#FBF7F0` with deep plum text — defined in `frontend/tailwind.config.js`. Display serif (Fraunces) + Inter. UI copy lives in `frontend/src/i18n/en.ts`, ready for a Vietnamese `vi.ts`.

## Known MVP simplifications

- Portfolio/review images are URLs (production: S3/Cloudinary signed uploads).
- Distance search is a future enhancement (lat/lng columns already exist).
- Admin "settings/reports" UI is minimal (APIs exist); email/SMS notifications not included.
- Availability search checks up to 200 SQL-filtered candidates per query; at scale, precompute a slot index or cache.

## Scripts

Backend: `npm run dev` · `build` · `start` · `typecheck` · `db:push` · `db:constraints` · `db:seed` · `db:setup`
Frontend: `npm run dev` · `build` · `typecheck` · `preview`
