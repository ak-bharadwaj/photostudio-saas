# 📸 PhotoStudio SaaS

![PhotoStudio SaaS Banner](/c:/Users/dorni/.gemini/antigravity/brain/3379217e-c0f6-4455-9566-b3aed21355eb/photostudio_saas_banner.png)

## 🚀 Overview

**PhotoStudio SaaS** is an enterprise-grade, multi-tenant management platform designed specifically for photography studios. It streamlines the entire workflow from initial customer inquiry to booking, execution, and final invoicing. Built with a modern tech stack focused on performance and scalability, it offers a professional solution for both individual photographers and large studios.

---

## ✨ Key Features

### 🏢 Multi-Tenant Infrastructure
- **Complete Isolation**: Secure data isolation between studios.
- **Role-Based Access**: Granular permissions for Owners, Photographers, and Assistants.
- **Subscription Management**: Support for tiered access (Starter, Pro, Studio, Enterprise).

### 📅 Advanced Booking System
- **Intelligent Scheduling**: Conflict detection to prevent double-bookings.
- **Custom Workflows**: Track bookings from INQUIRY through to COMPLETED.
- **Public Booking API**: Seamlessly integrate booking forms into any website.

### 💰 Financial Management
- **Professional Invoicing**: Automated, brand-aligned PDF generation.
- **Payment Tracking**: Record and monitor payments via multiple methods (UPI, Card, Bank Transfer).
- **Tax & Discount Support**: Flexible pricing models for global studio operations.

### 📁 Portfolio & Customer Management
- **Cloud-Native Storage**: High-performance image management via Cloudinary.
- **Customer CRM**: Detailed profiles with booking history and lifetime value tracking.
- **Public Galleries**: Showcase work to potential clients with customizable galleries.

---

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | NestJS 11, Prisma ORM, JWT, Redis |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Zustand |
| **Database** | PostgreSQL 16 |
| **Services** | Cloudinary (Files), Resend (Email), Puppeteer (PDF) |
| **Infrastructure** | Docker, PNPM Workspaces |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PNPM 8+
- Docker & Docker Compose

### Fast-Track Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ak-bharadwaj/photostudio-saas.git
   cd photostudio-saas
   ```

2. **Setup Infrastructure**
   ```bash
   docker-compose up -d
   ```

3. **Install Dependencies**
   ```bash
   pnpm install
   ```

4. **Initialize Database**
   ```bash
   cd apps/backend
   cp .env.example .env
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. **Run the Application**
   ```bash
   # From root
   pnpm dev
   ```

---

## 🔒 Security

- **JWT Authentication**: Secure sessions with access and refresh tokens.
- **Data Isolation**: Application-level multi-tenancy enforcement.
- **Input Validation**: Strict schema verification using Zod and class-validator.

---

## 🗺 Roadmap

- [ ] Stripe/Razorpay Integration
- [ ] WhatsApp Automation
- [ ] Google Calendar Sync
- [ ] Advanced Revenue Analytics
- [ ] Multi-Language (i18n) Support

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for Photographers & Studio Owners
</p>
