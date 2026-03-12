# ReviewsFeedback SaaS

**The enterprise-grade operating system for modern business feedback and reviews.**

A fully multi-tenant SaaS platform for managing bookings, customers, invoices, portfolios, staff, and finances — built on a NestJS + Next.js monorepo.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Backend Modules](#5-backend-modules)
6. [Frontend Pages & Sections](#6-frontend-pages--sections)
7. [Auth Model](#7-auth-model)
8. [Environment Variables](#8-environment-variables)
9. [Local Development Setup](#9-local-development-setup)
10. [Database Options (Free Alternatives)](#10-database-options-free-alternatives)
11. [Free Service Stack](#11-free-service-stack)
12. [API Reference](#12-api-reference)
13. [Test Credentials](#13-test-credentials)
14. [Security](#14-security)
15. [Design System](#15-design-system)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│                                                         │
│   Next.js 16 App Router (port 3000)                    │
│   ┌────────────┐ ┌───────────────┐ ┌────────────────┐  │
│   │  /portal   │ │ /(dashboard)  │ │    /admin      │  │
│   │ (Customer) │ │ (Studio Owner)│ │ (Platform Mgmt)│  │
│   └────────────┘ └───────────────┘ └────────────────┘  │
│   ┌──────────────────────────────────┐                  │
│   │    /studio/[slug]  (Public)      │                  │
│   └──────────────────────────────────┘                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────────┐
│                   API Layer                              │
│                                                         │
│   NestJS 11 (port 3001)                                 │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │   Auth   │ │ Booking  │ │ Invoice  │ │  Admin   │  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │ Customer │ │ Service  │ │Portfolio │ │Analytics │  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│   Rate Limiting · CSRF Middleware · JWT Guard            │
│   Tenant Interceptor · Global Exception Filter          │
└─────────┬──────────────────────┬───────────────────────┘
          │                      │
┌─────────▼──────┐   ┌───────────▼───────────────────────┐
│  PostgreSQL    │   │  Redis (Upstash / local)            │
│  via Prisma    │   │  Bull queues + response cache       │
│  (Supabase /   │   └───────────────────────────────────┘
│   Neon / local)│
└────────────────┘
```

**Multi-tenancy model:** Every database row (booking, customer, invoice, service, etc.) is scoped to a `studioId`. A `TenantInterceptor` automatically injects the authenticated studio's ID into every guarded request, making cross-studio data leaks structurally impossible.

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend framework | Next.js | 16 | App Router, RSC, Suspense |
| Frontend language | TypeScript | 5 | Strict mode |
| Styling | Tailwind CSS | 4 | Custom `@theme inline`, no external component lib |
| State management | Zustand | 5 | Auth + global UI state |
| Data fetching | Axios + TanStack Query | — | |
| Forms | React Hook Form + Zod | — | |
| Charts | Recharts | 2 | Analytics dashboard |
| Drag & drop | dnd-kit | — | Kanban board |
| Backend framework | NestJS | 11 | Modular architecture |
| ORM | Prisma | 7 | Schema-first, typed queries |
| Database | PostgreSQL | 16 | See §10 for free alternatives |
| Cache / Queue | Redis + Bull | — | Background jobs, rate-limit cache |
| PDF generation | Puppeteer | 23 | Headless Chromium invoice renderer |
| File uploads | Cloudinary | 2 | Image CDN + transformation |
| Email | Resend | — | Transactional emails |
| WhatsApp | Twilio | — | Optional booking notifications |
| Auth | JWT + Passport | — | Dual-token (access + refresh) + Google OAuth |
| Package manager | pnpm | 8 | Workspaces monorepo |

---

## 3. Project Structure

```
worj/
├── apps/
│   ├── backend/                     # NestJS API
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Full DB schema (see §4)
│   │   │   ├── migrations/          # Prisma migration history
│   │   │   └── seed.ts              # Demo data seeder
│   │   ├── src/
│   │   │   ├── admin/               # Admin module (super-admin only)
│   │   │   ├── analytics/           # Revenue, bookings, LTV analytics
│   │   │   ├── auth/                # JWT, refresh token, Google OAuth
│   │   │   ├── booking/             # Booking CRUD + status machine
│   │   │   ├── cache/               # Redis cache wrapper
│   │   │   ├── common/              # Guards, interceptors, filters, middleware
│   │   │   ├── customer/            # Customer CRUD + portal API
│   │   │   ├── customer-portal/     # Guest (phone-based) portal endpoints
│   │   │   ├── invoice/             # Invoice + line items + PDF
│   │   │   ├── notification/        # Email (Resend) + WhatsApp (Twilio)
│   │   │   ├── payment/             # Payment recording
│   │   │   ├── pdf/                 # Puppeteer PDF generation
│   │   │   ├── portfolio/           # Portfolio item management
│   │   │   ├── prisma/              # PrismaService module
│   │   │   ├── public/              # Public (unauthenticated) routes
│   │   │   ├── queue/               # Bull job queues
│   │   │   ├── service/             # Photography service management
│   │   │   ├── studio/              # Studio settings, branding
│   │   │   ├── upload/              # Cloudinary upload handler
│   │   │   ├── user/                # User (staff) management
│   │   │   ├── config/              # Config factory
│   │   │   └── app.module.ts        # Root module
│   │   ├── .env                     # Local secrets (never commit)
│   │   └── .env.example             # Template (safe to commit)
│   │
│   └── frontend/                    # Next.js App
│       ├── app/
│       │   ├── (dashboard)/         # Studio owner dashboard
│       │   │   ├── layout.tsx       # Sidebar + topbar layout
│       │   │   ├── page.tsx         # Dashboard home
│       │   │   ├── bookings/        # Booking list + detail + kanban
│       │   │   ├── customers/       # Customer list + detail
│       │   │   ├── invoices/        # Invoice list + detail + new
│       │   │   ├── services/        # Service management
│       │   │   ├── payments/        # Payment recording
│       │   │   ├── analytics/       # Revenue & performance charts
│       │   │   ├── portfolio/       # Portfolio management
│       │   │   ├── my-studio/       # Studio settings
│       │   │   ├── branding/        # Logo, colors, hero style
│       │   │   ├── settings/        # Notifications, preferences
│       │   │   └── share-links/     # Public page QR + share links
│       │   ├── admin/               # Platform admin
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx         # Admin dashboard
│       │   │   └── studios/         # Studio list + create + detail
│       │   ├── portal/              # Customer portal (JWT auth)
│       │   │   ├── layout.tsx       # Dark sidebar layout
│       │   │   ├── page.tsx         # Portal home
│       │   │   ├── login/           # Google OAuth + guest phone
│       │   │   ├── bookings/        # Customer booking history
│       │   │   ├── invoices/        # Customer invoice history
│       │   │   ├── account/         # Profile management
│       │   │   └── settings/        # Notification preferences
│       │   ├── studio/
│       │   │   └── [slug]/          # Public booking page
│       │   └── globals.css          # Design token system
│       ├── components/
│       │   ├── layout/              # Sidebar, MobileHeader
│       │   └── ui/                  # All custom components
│       │       ├── badge.tsx
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── confirm-dialog.tsx
│       │       ├── input.tsx
│       │       ├── loading.tsx
│       │       ├── modal.tsx
│       │       ├── page-header.tsx  # Shared dark hero header
│       │       ├── table.tsx
│       │       └── toast.tsx
│       ├── lib/
│       │   ├── api.ts               # Axios client + all API functions
│       │   └── utils.ts             # cn(), formatCurrency(), formatDate()
│       └── .env.local               # Local frontend env
└── package.json                     # pnpm workspace root
```

---

## 4. Database Schema

The database uses PostgreSQL with Prisma ORM. All tables use UUID primary keys and snake_case column names.

### Models

#### Studio (tenant root)
```
id, name, slug (unique), email, phone, logoUrl, brandingConfig (JSON),
subscriptionTier, subscriptionExpiresAt, status, billingModel,
commissionRate, commissionType, currency, defaultTerms, taxRate
```

#### User (staff)
```
id, studioId, email, passwordHash, name, role, isActive,
provider (local | google), providerId
Roles: OWNER | PHOTOGRAPHER | ASSISTANT | CUSTOMER
```

#### Customer
```
id, studioId, globalUserId (nullable, links to User), name, email,
phone, metadata (JSON)
Unique constraint: (studioId, phone)
```

#### Service (photography package)
```
id, studioId, name, description, price, durationMinutes, isActive,
sortOrder, coverImage, occasion
```

#### Booking (core entity)
```
id, studioId, customerId, serviceId, assignedToUserId, scheduledAt,
status, customerNotes, internalNotes, acceptedTerms, contractUrl,
quoteAmount, quoteNotes, quotedAt, quoteAcceptedAt
Status flow: INQUIRY → QUOTED → CONFIRMED → IN_PROGRESS → COMPLETED | CANCELLED
```

#### BookingStatusLog
```
id, bookingId, status, notes — audit trail of every status transition
```

#### Invoice
```
id, studioId, bookingId, customerId, invoiceNumber (unique),
lineItems (JSON), subtotal, tax, discount, total, status, dueDate, notes
Status: DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED
```

#### Payment
```
id, invoiceId, amount, paymentMethod, transactionId, notes, paidAt
Methods: CASH | BANK_TRANSFER | UPI | CARD | OTHER
```

#### PortfolioItem
```
id, studioId, title, description, imageUrl, category, sortOrder, isVisible
```

#### Commission
```
id, studioId, bookingId, invoiceId, amount, status, notes
Status: PENDING | COLLECTED | CANCELLED
```

#### Workflow
```
id, studioId, name, trigger, actions (JSON), isActive
```

#### Admin (super-admin, separate from User)
```
id, email, passwordHash, name
```

### Enums
- `SubscriptionTier`: STARTER, PROFESSIONAL, STUDIO, ENTERPRISE
- `StudioStatus`: ACTIVE, SUSPENDED, EXPIRED, TRIAL
- `UserRole`: OWNER, PHOTOGRAPHER, ASSISTANT, CUSTOMER
- `BookingStatus`: INQUIRY, QUOTED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- `InvoiceStatus`: DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
- `PaymentMethod`: CASH, BANK_TRANSFER, UPI, CARD, OTHER
- `BillingModel`: SUBSCRIPTION, COMMISSION
- `CommissionType`: PERCENTAGE, FIXED
- `CommissionStatus`: PENDING, COLLECTED, CANCELLED

---

## 5. Backend Modules

| Module | Path | Description |
|---|---|---|
| `AppModule` | `src/app.module.ts` | Root. Registers ThrottlerGuard (rate limit), JwtAuthGuard (global), TenantInterceptor, CsrfMiddleware, GlobalExceptionFilter |
| `AuthModule` | `src/auth/` | Local + Google OAuth login, JWT issue/refresh, `/auth/me` |
| `StudioModule` | `src/studio/` | Studio CRUD, branding update, slug lookup |
| `BookingModule` | `src/booking/` | Full booking lifecycle, status transitions, kanban data |
| `CustomerModule` | `src/customer/` | Customer CRUD within tenant |
| `ServiceModule` | `src/service/` | Photography service packages |
| `InvoiceModule` | `src/invoice/` | Invoice creation, status, PDF download |
| `PaymentModule` | `src/payment/` | Record payments against invoices |
| `PortfolioModule` | `src/portfolio/` | Portfolio item management + ordering |
| `AnalyticsModule` | `src/analytics/` | Revenue trends, booking stats, LTV |
| `NotificationModule` | `src/notification/` | Resend email + Twilio WhatsApp |
| `UploadModule` | `src/upload/` | Cloudinary multipart upload |
| `PdfModule` | `src/pdf/` | Puppeteer headless PDF generation |
| `AdminModule` | `src/admin/` | Super-admin: studio management, suspension, creation |
| `PublicModule` | `src/public/` | Unauthenticated: studio lookup, available slots, booking submission |
| `CustomerPortalModule` | `src/customer-portal/` | Guest portal (phone lookup, no JWT) |
| `QueueModule` | `src/queue/` | Bull job queues for async notifications |
| `CacheModule` | `src/cache/` | Redis cache wrapper (ioredis) |
| `PrismaModule` | `src/prisma/` | Global PrismaService singleton |

### Request lifecycle (authenticated)

```
Request
  → ThrottlerGuard (100 req/60s)
  → CsrfMiddleware (excludes /public/*)
  → JwtAuthGuard (validates Bearer token)
  → TenantInterceptor (injects studioId into request context)
  → Controller → Service → Prisma → PostgreSQL
  → GlobalExceptionFilter (on error)
```

---

## 6. Frontend Pages & Sections

### Studio Owner Dashboard — `/(dashboard)/`
| Route | Description |
|---|---|
| `/` | Dashboard home — revenue strip, recent bookings, quick actions |
| `/bookings` | Booking list with filters + status pills |
| `/bookings/[id]` | Booking detail — status stepper, notes, actions |
| `/bookings/kanban` | Drag-and-drop Kanban board across booking stages |
| `/customers` | Customer list with search |
| `/customers/[id]` | Customer detail — bookings, invoices, lifetime value |
| `/invoices` | Invoice list with status filters |
| `/invoices/new` | Invoice creator with line items |
| `/invoices/[id]` | Invoice detail with payment recording + PDF download |
| `/services` | Service package management |
| `/payments` | Payment log |
| `/analytics` | Revenue chart, booking trends, top services |
| `/portfolio` | Portfolio grid — upload, reorder, toggle visibility |
| `/my-studio` | Studio settings (name, contact, terms) |
| `/branding` | Logo upload, brand colors, hero style, button shape |
| `/settings` | Notification preferences |
| `/share-links` | Public page URL + QR code generator |

### Customer Portal — `/portal/`
| Route | Description |
|---|---|
| `/portal/login` | Google OAuth sign-in + guest phone-number login |
| `/portal` | Portal home — upcoming bookings, recent invoices |
| `/portal/bookings` | Booking history with status stepper |
| `/portal/invoices` | Invoice history with payment progress |
| `/portal/account` | Profile — name, email, stats |
| `/portal/settings` | Notification preferences |

### Platform Admin — `/admin/`
| Route | Description |
|---|---|
| `/admin` | Admin dashboard — platform KPIs |
| `/admin/studios` | All studios — filter by status/tier, suspend/activate/delete |
| `/admin/studios/new` | Create new studio + owner account |
| `/admin/studios/[id]` | Studio detail — edit, team members, stats |

### Public Booking Page — `/studio/[slug]/`
- Hero banner with studio branding (mesh/solid/glass style)
- Service cards grouped by occasion with cover images
- Portfolio gallery (masonry-style)
- 4-step booking wizard: Service → Date & Time → Customer Details → Confirmation
- Available time slots (fetched live from the API)
- Terms & conditions acceptance
- Google OAuth sign-in to save booking history
- History tab: bookings with quote accept/reject/counter-offer flow
- Account tab: profile management + sign-out

---

## 7. Auth Model

The platform uses **two separate auth flows** for customers vs. studio staff.

### Studio Staff (Dashboard)
- **Login**: Email + password via `/auth/login` → returns `accessToken` (15 min) + `refreshToken` (7 days)
- **Storage**: Tokens in memory / localStorage (dashboard)
- **Refresh**: `POST /auth/refresh` with refreshToken
- **Google OAuth**: `/auth/google` → callback → same token pair

### Customer Portal (JWT path)
- **Login**: Google OAuth → redirect with `?token=...` in URL → stored as `customer_token` in localStorage
- **API prefix**: `/portal/*` — requires `Authorization: Bearer <customer_token>`
- **User check**: `GET /auth/me` validates token and returns user

### Customer Portal (Guest path)
- **Login**: Phone number lookup → stored as `customer_guest_phone` in localStorage
- **API prefix**: `/customer-portal/*` — phone-based authentication, no JWT

### Admin
- Separate admin credentials, separate guard — not accessible from regular studio login

---

## 8. Environment Variables

### Backend — `apps/backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (see §10) |
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | API port (default: `3001`) |
| `FRONTEND_URL` | Yes | CORS origin (e.g. `http://localhost:3000`) |
| `JWT_SECRET` | Yes | Min 64 chars. Generate: `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Yes | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token TTL (e.g. `7d`) |
| `REDIS_URL` | Yes | Redis connection string |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | Must match Google Console (e.g. `http://localhost:3001/auth/google/callback`) |
| `CLOUDINARY_URL` | Optional | Format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` |
| `RESEND_API_KEY` | Optional | Resend transactional email |
| `RESEND_FROM_EMAIL` | Optional | Sender address |
| `TWILIO_SID` | Optional | WhatsApp notifications |
| `TWILIO_TOKEN` | Optional | WhatsApp notifications |
| `TWILIO_WHATSAPP_FROM` | Optional | e.g. `whatsapp:+14155238886` |
| `SENTRY_DSN` | Optional | Error tracking |
| `POSTHOG_API_KEY` | Optional | Product analytics |

### Frontend — `apps/frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (e.g. `http://localhost:3001`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_ENV` | No | `development` or `production` |

---

## 9. Local Development Setup

### Prerequisites
- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- A PostgreSQL database (see §10 for free options)
- A Redis instance (see §11 for free options)

### Step-by-step

```bash
# 1. Install all dependencies
pnpm install

# 2. Set up backend environment
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env — fill in DATABASE_URL, REDIS_URL, JWT_SECRET

# 3. Set up frontend environment
cp apps/frontend/.env.example apps/frontend/.env.local
# Edit apps/frontend/.env.local — set NEXT_PUBLIC_API_URL=http://localhost:3001

# 4. Push schema to your database
cd apps/backend
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Seed demo data
npx prisma db seed

# 7. Start both apps in parallel
cd ../..
pnpm dev
```

Frontend runs at `http://localhost:3000`
Backend runs at `http://localhost:3001`
Swagger docs at `http://localhost:3001/api`

### Useful backend commands

```bash
# Inside apps/backend/

npx prisma studio          # Visual DB browser
npx prisma migrate dev     # Apply schema changes
npx prisma migrate reset   # Reset DB + re-seed (dev only)
npx prisma db seed         # Re-seed without resetting
npx prisma generate        # Regenerate Prisma client after schema changes
```

### TypeScript check + build

```bash
# Frontend type check (must pass with zero errors)
cd apps/frontend && npx tsc --noEmit

# Frontend production build
cd apps/frontend && npx next build

# Backend build
cd apps/backend && npx nest build
```

---

## 10. Database Options (Free Alternatives)

The project uses **PostgreSQL via Prisma**. The `DATABASE_URL` is a standard PostgreSQL connection string — you can swap providers without changing any application code.

### Currently configured
The project ships with a **Supabase** connection. Supabase free tier provides 500 MB storage, which is sufficient for most studios at scale.

### Free PostgreSQL alternatives

#### Option A — Neon (Recommended)
**Best free option overall. No sleeping, serverless scaling, generous limits.**

| Property | Value |
|---|---|
| Free storage | 512 MB |
| Free compute | 191.9 compute hours/month |
| Sleeping | No (active hours billing, not always-on) |
| Branching | Yes (dev/prod branches) |
| Connection pooling | Built-in (PgBouncer) |
| Region | AWS: us-east-1, eu-central-1, ap-southeast-1 + more |
| Prisma support | Full |

**Setup:**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the **connection string** (use the Pooled connection for production)
3. Paste into `DATABASE_URL` in `apps/backend/.env`

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

#### Option B — Supabase (Currently Used)
**PostgreSQL + Auth + Storage + Realtime. More than just a database.**

| Property | Value |
|---|---|
| Free storage | 500 MB |
| Free rows | Unlimited (within storage cap) |
| Sleeping | Yes — pauses after 1 week of inactivity (free tier) |
| API layer | Auto-generated REST + GraphQL |
| Auth | Built-in (not used here — we use custom JWT) |
| Region | Multiple (AWS-based) |

**Setup:**
1. Sign up at [supabase.com](https://supabase.com)
2. New project → Settings → Database → Connection string (URI format)
3. Use the **Transaction pooler** string for Prisma (port 6543):

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

**Note:** If the free project sleeps (pauses), click "Restore" in the Supabase dashboard or upgrade to Pro.

#### Option C — Aiven (PostgreSQL Free Tier)
**Good for production-grade managed PostgreSQL with monitoring.**

| Property | Value |
|---|---|
| Free plan | 1 service, single node |
| Storage | 5 GB (free trial includes paid tier for 30 days) |
| Sleeping | No |
| Backups | Daily (paid) |
| SSL | Required |

**Setup:**
1. Sign up at [aiven.io](https://aiven.io)
2. Create a PostgreSQL service → copy Service URI

```env
DATABASE_URL="postgresql://avnadmin:password@pg-xxx.aivencloud.com:PORT/defaultdb?sslmode=require"
```

#### Option D — Railway (PostgreSQL Plugin)
**Fastest local-to-cloud experience. One click from their dashboard.**

| Property | Value |
|---|---|
| Free credit | $5/month (covers a small DB) |
| Storage | Scales with credit |
| Sleeping | No |
| Deploys | Git-integrated (auto deploy on push) |

**Setup:**
1. Sign up at [railway.app](https://railway.app)
2. New project → Add PostgreSQL → Variables tab → copy `DATABASE_URL`

```env
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:PORT/railway"
```

#### Option E — Local PostgreSQL (Development Only)
**Best for offline development.**

```bash
# Install PostgreSQL 16 locally (Windows)
# Download from: https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE reviewsfeedback;

# Connection string
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/reviewsfeedback"
```

### Comparison table

| Provider | Free Storage | Sleeps? | Branching | Best For |
|---|---|---|---|---|
| **Neon** | 512 MB | No | Yes | Production + dev |
| **Supabase** | 500 MB | Yes (1 wk) | No | Rapid prototyping |
| **Aiven** | Trial only | No | No | Production |
| **Railway** | $5 credit | No | No | Easy deployment |
| **Local** | Disk space | No | No | Offline dev only |

### Switching providers

No code changes needed. Just update `DATABASE_URL` in `apps/backend/.env` and run:

```bash
cd apps/backend
npx prisma migrate deploy   # For an existing DB (applies pending migrations)
# OR
npx prisma migrate dev      # For a fresh DB (creates + applies all migrations)
npx prisma db seed          # Re-seed demo data
```

---

## 11. Free Service Stack

The entire platform can run for free using these managed services:

| Service | Provider | Free Limit | Sign Up |
|---|---|---|---|
| PostgreSQL | Neon | 512 MB | [neon.tech](https://neon.tech) |
| Redis / Queue | Upstash | 10,000 req/day | [upstash.com](https://upstash.com) |
| Image CDN | Cloudinary | 25 GB bandwidth/month | [cloudinary.com](https://cloudinary.com) |
| Transactional Email | Resend | 3,000 emails/month | [resend.com](https://resend.com) |
| Error Tracking | Sentry | 5,000 errors/month | [sentry.io](https://sentry.io) |
| Analytics | PostHog | 1M events/month | [posthog.com](https://posthog.com) |
| WhatsApp | Twilio | Trial credit | [twilio.com](https://twilio.com) |

**Minimum required** to run the platform: `DATABASE_URL` + `JWT_SECRET` + `REDIS_URL`. Everything else is optional.

---

## 12. API Reference

Swagger UI is available in development at:
```
http://localhost:3001/api
```

### Key route groups

| Prefix | Auth | Description |
|---|---|---|
| `GET /public/studios/:slug` | None | Studio info + services for booking page |
| `GET /public/studios/:slug/services/:id/available-slots` | None | Available time slots |
| `POST /public/studios/:slug/bookings` | None | Submit a booking request |
| `POST /auth/login` | None | Email + password login |
| `GET /auth/google` | None | Google OAuth redirect |
| `POST /auth/refresh` | None | Refresh access token |
| `GET /auth/me` | JWT | Current user info |
| `GET /bookings` | JWT (Owner) | List studio bookings |
| `PATCH /bookings/:id/status` | JWT (Owner) | Update booking status |
| `GET /invoices` | JWT (Owner) | List studio invoices |
| `POST /invoices` | JWT (Owner) | Create invoice |
| `GET /customers` | JWT (Owner) | List studio customers |
| `GET /analytics/revenue` | JWT (Owner) | Revenue analytics |
| `GET /portal/bookings` | JWT (Customer) | Customer's own bookings |
| `GET /portal/invoices` | JWT (Customer) | Customer's own invoices |
| `POST /portal/quote/:id/accept` | JWT (Customer) | Accept a quote |
| `POST /portal/quote/:id/reject` | JWT (Customer) | Reject/counter a quote |
| `GET /admin/studios` | JWT (Admin) | All studios |
| `POST /admin/studios` | JWT (Admin) | Create studio |
| `PATCH /admin/studios/:id/suspend` | JWT (Admin) | Suspend studio |

---

## 13. Test Credentials

After running `npx prisma db seed`:

| Role | Email | Password |
|---|---|---|
| Platform Admin | `admin@reviewsfeedback.com` | `Admin@123` |
| Studio Owner | `owner@lensandlight.com` | `Demo@123` |
| Photographer | `photographer@lensandlight.com` | `Demo@123` |

Public booking page: `http://localhost:3000/studio/lens-and-light`

---

## 14. Security

| Mechanism | Implementation |
|---|---|
| Rate limiting | ThrottlerGuard — 100 requests per 60 seconds per IP |
| CSRF protection | CsrfMiddleware on all non-public routes |
| JWT access tokens | 15-minute expiry, signed with HS256 |
| JWT refresh tokens | 7-day expiry, single-use rotation |
| Multi-tenant isolation | TenantInterceptor injects studioId, all Prisma queries scoped by it |
| RBAC | Role checks on every sensitive endpoint (OWNER, PHOTOGRAPHER, ADMIN) |
| Password hashing | bcrypt, cost factor 12 |
| HTTPS | Enforced via `sslmode=require` on database connections in production |
| Subscription guard | SUSPENDED/EXPIRED studios are blocked from all protected operations |

---

## 15. Design System

The frontend uses a fully custom design system — no shadcn/ui or external component libraries.

### Color tokens (`globals.css`)
```css
--primary: #7c3aed         /* Deep violet */
--accent:  #db2777         /* Rose pink */
--surface-0/1/2/3          /* Background layers */
--foreground/secondary/tertiary
--success/warning/danger/info  (+ -light variants)
--border/border-light/border-strong
--shadow-sm/md/lg/xl
--radius-sm/md/lg/xl
```

### Typography
- **Headings**: Outfit (bold, tracked tight)
- **Body**: DM Sans (readable, modern)
- **Monospace**: system mono (IDs, codes)

### Utility classes
| Class | Effect |
|---|---|
| `.card-luxury` | Premium card with shadow + hover lift |
| `.glass-luxury` | Glassmorphism surface with backdrop-blur |
| `.gradient-text` | Violet→rose gradient text |
| `.gradient-text-animated` | Animated gradient sweep |
| `.animate-luxury-in` | Slide-up fade entrance |
| `.skeleton` | Shimmer loading placeholder |
| `.btn-shimmer` | Shimmer sweep on button hover |
| `.hover-lift` | `-translate-y-0.5` + shadow on hover |
| `.dot-pattern` | Radial dot grid overlay |
| `.card-accent-bar` | Colored left border status indicator |
| `.no-scrollbar` | Hide scrollbar, keep scroll |
| `.trend-up/.trend-down` | Colored metric trend indicators |

### Components (`components/ui/`)
- `Button` — variants: primary, outline, ghost, danger, success
- `Card` + CardHeader, CardContent, CardTitle, CardDescription
- `Badge` — variants: success, warning, danger, info, default; dot indicator
- `Input`, `Textarea`, `Select` — with label, error, helperText
- `Modal` + ModalFooter
- `ConfirmDialog` — danger confirmation dialog
- `Table` + TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty
- `PageHeader` — shared dark hero banner (eyebrow, title, subtitle, actions, chips)
- `LoadingSpinner`, `LoadingPage`
- `Toast` / `useToast` — success, error, info, warning

---

*Last updated: March 2026*
