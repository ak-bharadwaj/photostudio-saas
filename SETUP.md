# 🚀 ReviewsFeedback SaaS Setup Guide

This guide will help you get the **ReviewsFeedback** platform up and running on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **pnpm** (`npm install -g pnpm`)
- **PostgreSQL** (Local or cloud instance like [Supabase](https://supabase.com))
- **Redis** (Optional, or use local instance)

---

## 🛠️ Step 1: Install Dependencies

From the root directory, run:
```bash
pnpm install
```

---

## 🔑 Step 2: Configure Environment Variables

You need to set up environment variables for both the backend and frontend.

### Backend
1. Go to `apps/backend`.
2. Copy `.env.example` to `.env`.
3. Update the `DATABASE_URL` with your PostgreSQL connection string.
4. (Optional) Set up Cloudinary, Resend, and Redis if you need those features.

### Frontend
1. Go to `apps/frontend`.
2. Copy `.env.example` to `.env.local`.
3. Ensure `NEXT_PUBLIC_API_URL` points to `http://localhost:3001`.

---

## 🗄️ Step 3: Database Connection

Navigate to the `apps/backend` folder and run:

```bash
# MANDATORY: Generate the Prisma client locally
# This is required for the code to understand the database structure
pnpm prisma:generate
```

> [!NOTE]
> **Skipping Migrations**: Since you are using the studio's existing Supabase instance, you **DO NOT** need to run `prisma migrate`. The tables already exist! 

---

## 🚀 Step 4: Run the Application

You can start everything from the **root directory**:

```bash
# Starts both Frontend and Backend in parallel
pnpm dev
```

### Accessing the apps:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Swagger Docs**: [http://localhost:3001/api](http://localhost:3001/api)

---

## 📖 Common Commands

| Task | Command |
| :--- | :--- |
| Full Dev Start | `pnpm dev` |
| Install All | `pnpm install` |
| Build All | `pnpm build` |
| DB Studio | `pnpm --filter backend exec prisma studio` |

---

## 🤝 Need Help?
If you encounter any issues, make sure your `.env` files are correctly configured and that your database is reachable.
