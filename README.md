<p align="center">
  <img src="https://img.shields.io/badge/PhotoStudio-SaaS-blue?style=for-the-badge&logo=adobe-lightroom&logoColor=white" alt="PhotoStudio SaaS Logo" />
</p>

<h1 align="center">PhotoStudio SaaS</h1>

<p align="center">
  <strong>The Enterprise-Grade Operating System for Modern Photography Studios.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/repo-size/ak-bharadwaj/photostudio-saas?style=for-the-badge&color=blue" alt="Repo Size" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/github/last-commit/ak-bharadwaj/photostudio-saas?style=flat-square&color=orange" alt="Last Commit" />
</p>

---

## 🚀 Quick Start
Ready to get started? Follow our **[Setup Guide (SETUP.md)](file:///c:/Users/dorni/OneDrive/Desktop/worj/SETUP.md)** to get the platform running in under 5 minutes.

---

## 🌟 Vision

PhotoStudio SaaS is not just a tool; it's a comprehensive **Multi-Tenant Infrastructure** designed to scale with your studio. From solopreneurs to enterprise-level photography firms, our platform provides a unified workspace to manage bookings, clients, portfolios, and finances with surgical precision.

---

## 🏗 System Architecture

The platform is engineered using a modular **Monorepo Architecture**, ensuring high cohesion and low coupling across the stack.

```mermaid
graph TD
    subgraph "Client Layer (Next.js 14)"
        A[Customer Portal]
        B[Studio Dashboard]
        C[Platform Admin]
    end

    subgraph "Application Layer (NestJS)"
        D[API Gateway]
        E[Auth Service]
        F[Booking Engine]
        G[Financial Controller]
    end

    subgraph "Data & Storage"
        H[(PostgreSQL 16)]
        I[(Redis 7 Cache)]
        J[Cloudinary Image CDN]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    D --> G
    E --> H
    F --> H
    G --> H
    F --> I
    G --> J
```

---

## ✨ Core Modules

### 🛡 Multi-Tenancy & Security
*   **Logical Isolation**: Strict studio-level data partitioning.
*   **Role Hierarchy**: Owner, Photographer, and Assistant roles with fine-grained RBAC.
*   **JWT Ecosystem**: Dual-token strategy with short-lived access and 7-day refresh cycles.

### 📅 Booking Intelligence
*   **Workflow Automation**: Transitions from `INQUIRY` → `QUOTED` → `CONFIRMED` → `COMPLETED`.
*   **Clash Prevention**: Native support for availability checks and conflict detection.
*   **Photographer Routing**: Efficiently assign and manage staff for every session.

### 💳 Financial Operations
*   **Automated Invoicing**: Professional PDF generation using Headless Puppeteer.
*   **Omnichannel Payments**: Integrated tracking for UPI, Bank Transfer, and Card.
*   **Analytics Pod**: Real-time revenue, LTV, and studio performance metrics.

---

## 📂 Project Structure

```text
.
├── apps
│   ├── backend          # NestJS 11 Engine, Prisma, PostgreSQL, Redis
│   └── frontend         # Next.js 14 Dashboard & Booking Pages
├── packages
│   ├── config           # Shared ESLint/TS configurations
│   └── ui               # (Planned) Shared component library
├── docker-compose.yml   # Infrastructure (DB, Cache)
└── package.json         # Workspace management (PNPM)
```

---

## 🔑 Test Credentials (Demo)

After running `pnpm run prisma:seed`, use these for verification:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Platform Admin** | `admin@photostudio.com` | `Admin@123` |
| **Studio Owner** | `owner@lensandlight.com` | `Demo@123` |
| **Photographer** | `photographer@lensandlight.com` | `Demo@123` |

---

## 🛠 Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Zustand, Axios |
| **Backend** | NestJS 11, Prisma ORM (PostgreSQL), Redis (Cache), Puppeteer |
| **Infrastructure** | Docker, PostgreSQL 16, Redis 7, Cloudinary (CDN) |
| **Security** | JWT (Dual-Token), CSRF Middleware, RBAC |

---

## 🏗 Setup: Free-Tier & Native (Non-Docker)

This platform is designed to run entirely on **Free Tier** services. You do **not** need to pay for any infrastructure to get started.

### 1. Prerequisites (Native Setup)
If you prefer not to use Docker, ensure you have the following installed on your machine:
*   **Node.js 18+** & **PNPM** (`npm install -g pnpm`)
*   **PostgreSQL 16** (Use **[Supabase](https://supabase.com)** for a free, managed database)
*   **Redis** (Use **[Upstash](https://upstash.com)** for a free, managed cache)

### 2. Manual Configuration (No Docker)
1.  **Clone & Install**:
    ```bash
    pnpm install
    ```
2.  **Environment Setup**:
    *   Copy `apps/backend/.env.example` to `apps/backend/.env`.
    *   Copy `apps/frontend/.env.example` to `apps/frontend/.env`.
3.  **Database URL**: Update `DATABASE_URL` in `apps/backend/.env` with your **Supabase Connection String**.
    *   *Tip: Use the Node.js connection string from Supabase settings (e.g., `postgresql://postgres:[password]@db.abc.supabase.co:5432/postgres`).*
4.  **Database Initialization**:
    ```bash
    pnpm prisma:generate
    pnpm prisma:migrate
    pnpm prisma:seed
    ```
5.  **Start Platform**:
    ```bash
    pnpm dev
    ```

---

## ☁️ Recommended Free Stack
*   **Database**: **[Supabase](https://supabase.com)** (PostgreSQL - 500MB Free)
*   **Caching**: [Upstash](https://upstash.com) (Redis - 10k requests/day Free)
*   **Image Hosting**: [Cloudinary](https://cloudinary.com) (Generous Free media storage)
*   **Transactional Email**: [Resend](https://resend.com) (3,000 emails/month Free)

---

## 📂 Project Structure
... (rest of the file)

## 🌐 API Quick Links
*   **Postman/Insomnia**: Import the schema from `/apps/backend/src/main.ts` (Swagger enabled in dev).
*   **Performance**: Run `k6` tests via `cd apps/backend && pnpm run test:e2e`.

---

## 🔒 Security Compliance
*   **Tenant Shield**: Strict studio isolation via Prisma middleware.
*   **Billing Security**: Access blocked automatically for `EXPIRED` or `INACTIVE` subscriptions.
*   **Safety**: CSRF tokens enforced for all data-mutation operations.

---

## 🗺 Future-Proofing (Roadmap)

- [ ] **Phase 3**: Native iOS/Android App via Capacitor.
- [ ] **Phase 4**: AI-Powered Image Auto-Tagging & Culling.
- [ ] **Phase 5**: WhatsApp Business API Integration for instant alerts.

---

<div align="center">
  <p>Built for the next generation of visual storytellers.</p>
  <p>Proprietary License © 2026 PhotoStudio SaaS Team</p>
</div>
