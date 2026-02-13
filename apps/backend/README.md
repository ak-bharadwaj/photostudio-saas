# Photo Studio SaaS - Backend API

A complete multi-tenant booking and invoicing system for photography studios built with NestJS, Prisma, PostgreSQL, and Redis.

## Features

- **Multi-tenancy**: Complete studio isolation with slug-based URLs
- **Authentication**: JWT-based auth with refresh tokens, role-based access control
- **Booking Management**: Full booking workflow (Inquiry → Quoted → Confirmed → In Progress → Completed)
- **Customer Management**: Customer profiles with search and statistics
- **Service Catalog**: Drag-and-drop service ordering with pricing
- **Invoice & Payments**: Automated invoice numbering, PDF generation, payment tracking
- **Portfolio Management**: Public portfolio with categorization
- **Admin Panel**: Platform admin controls for studio management
- **Public API**: No-auth booking creation for customers
- **Email Notifications**: Automated emails via Resend
- **File Uploads**: Cloudinary integration for images and PDFs
- **Caching**: Redis for performance optimization

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Authentication**: Passport JWT
- **File Storage**: Cloudinary
- **Email**: Resend
- **PDF Generation**: Puppeteer
- **Validation**: class-validator, class-transformer

## Prerequisites

- Node.js 18+
- PNPM 8+
- Docker & Docker Compose (for PostgreSQL & Redis)
- (Optional) Cloudinary account for file uploads
- (Optional) Resend account for emails

## Quick Start

### 1. Install Dependencies

```bash
cd apps/backend
pnpm install
```

### 2. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
# From project root
docker-compose up -d
```

Verify services are running:

```bash
docker ps
# Should show: photo-studio-postgres and photo-studio-redis
```

### 3. Configure Environment

Copy the example env file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database (default Docker setup)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/photo_studio_saas?schema=public"

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Redis (default Docker setup)
REDIS_URL=redis://localhost:6379

# Cloudinary (optional - get from cloudinary.com)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Resend (optional - get from resend.com)
RESEND_API_KEY=re_your-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 4. Setup Database

Generate Prisma client:

```bash
pnpm run prisma:generate
```

Run migrations:

```bash
pnpm run prisma:migrate
```

Seed demo data:

```bash
pnpm run prisma:seed
```

### 5. Start Development Server

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000`

## Test Credentials

After running the seed script, you can login with:

**Platform Admin:**
- Email: `admin@photostudio.com`
- Password: `Admin@123`

**Studio Owner (Lens & Light Photography):**
- Email: `owner@lensandlight.com`
- Password: `Demo@123`
- Studio URL: `/studio/lens-and-light`

**Photographer:**
- Email: `photographer@lensandlight.com`
- Password: `Demo@123`

**Other Demo Studios:**
- Forever Moments: `owner@forevermoments.com` / `Demo@123`
- Startup Photo (Trial): `owner@startupphoto.com` / `Demo@123`

## API Endpoints

### Authentication

```
POST /auth/login              - User login
POST /auth/refresh            - Refresh access token
POST /auth/register           - Register new studio
GET  /auth/me                 - Get current user
```

### Admin (Platform)

```
POST   /admin/auth/register   - Create admin user
POST   /admin/auth/login      - Admin login
GET    /admin/studios         - List all studios
GET    /admin/studios/:id     - Get studio details
PATCH  /admin/studios/:id     - Update studio
DELETE /admin/studios/:id     - Delete studio
POST   /admin/studios/:id/suspend   - Suspend studio
POST   /admin/studios/:id/activate  - Activate studio
GET    /admin/analytics       - Platform analytics
GET    /admin/activities      - Recent activities
```

### Studios

```
GET    /studios               - List user's studio
GET    /studios/:id           - Get studio details
PATCH  /studios/:id           - Update studio
GET    /studios/:id/stats     - Studio statistics
```

### Bookings

```
GET    /bookings              - List bookings (with filters)
GET    /bookings/:id          - Get booking details
POST   /bookings              - Create booking
PATCH  /bookings/:id          - Update booking
PATCH  /bookings/:id/status   - Update booking status
DELETE /bookings/:id          - Cancel booking
GET    /bookings/stats        - Booking statistics
```

### Customers

```
GET    /customers             - List customers (with search)
GET    /customers/:id         - Get customer details
POST   /customers             - Create customer
PATCH  /customers/:id         - Update customer
DELETE /customers/:id         - Delete customer
GET    /customers/:id/stats   - Customer statistics
```

### Services

```
GET    /services              - List services
GET    /services/:id          - Get service details
POST   /services              - Create service
PATCH  /services/:id          - Update service
DELETE /services/:id          - Delete service
PATCH  /services/:id/toggle   - Toggle active status
PATCH  /services/reorder      - Reorder services
GET    /services/:id/stats    - Service statistics
```

### Invoices

```
GET    /invoices              - List invoices (with filters)
GET    /invoices/:id          - Get invoice details
POST   /invoices              - Create invoice
PATCH  /invoices/:id          - Update invoice
DELETE /invoices/:id          - Delete invoice
POST   /invoices/:id/send     - Send invoice email
GET    /invoices/:id/pdf      - Download PDF
GET    /invoices/stats        - Invoice statistics
```

### Payments

```
GET    /payments              - List payments
GET    /payments/:id          - Get payment details
POST   /payments              - Record payment
GET    /payments/stats        - Payment statistics
```

### Portfolio

```
GET    /portfolio             - List portfolio items
GET    /portfolio/:id         - Get item details
POST   /portfolio             - Add portfolio item
PATCH  /portfolio/:id         - Update item
DELETE /portfolio/:id         - Delete item
PATCH  /portfolio/:id/toggle  - Toggle visibility
PATCH  /portfolio/reorder     - Reorder items
```

### Public API (No Authentication)

```
GET    /public/studios/:slug                           - Get public studio info
POST   /public/studios/:slug/bookings                  - Create booking
GET    /public/studios/:slug/services/:id/available-slots  - Get time slots
```

### Upload

```
POST   /upload/image          - Upload image to Cloudinary
POST   /upload/pdf            - Upload PDF to Cloudinary
```

## Database Schema

The system uses 11 Prisma models:

1. **Admin** - Platform administrators
2. **Studio** - Photography studios (tenants)
3. **User** - Studio staff (Owner, Photographer, Assistant)
4. **Customer** - Studio customers
5. **Service** - Photography services offered
6. **Booking** - Customer bookings
7. **BookingStatusLog** - Booking status history
8. **Invoice** - Invoices with line items
9. **Payment** - Payment records
10. **PortfolioItem** - Portfolio images
11. **Workflow** - Automation workflows (future)

## Project Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── src/
│   ├── admin/              # Admin module
│   ├── auth/               # Authentication
│   ├── booking/            # Booking management
│   ├── cache/              # Redis cache
│   ├── config/             # Configuration
│   ├── customer/           # Customer management
│   ├── invoice/            # Invoice management
│   ├── notification/       # Email notifications
│   ├── payment/            # Payment tracking
│   ├── pdf/                # PDF generation
│   ├── portfolio/          # Portfolio management
│   ├── prisma/             # Prisma service
│   ├── public/             # Public API
│   ├── service/            # Service catalog
│   ├── studio/             # Studio management
│   ├── upload/             # File uploads
│   ├── app.module.ts       # Root module
│   └── main.ts             # Application entry
├── .env.example            # Environment template
├── docker-compose.yml      # Docker services
└── package.json
```

## Development

### Available Scripts

```bash
pnpm run start             # Start app
pnpm run start:dev         # Start with watch mode
pnpm run start:debug       # Start with debugger
pnpm run start:prod        # Start production build

pnpm run build             # Build for production
pnpm run format            # Format code
pnpm run lint              # Lint code

pnpm run prisma:generate   # Generate Prisma client
pnpm run prisma:migrate    # Run migrations
pnpm run prisma:seed       # Seed database

pnpm run test              # Unit tests
pnpm run test:watch        # Test watch mode
pnpm run test:cov          # Test coverage
pnpm run test:e2e          # E2E tests
```

### Database Management

View database in Prisma Studio:

```bash
npx prisma studio
```

Create a new migration:

```bash
npx prisma migrate dev --name your_migration_name
```

Reset database (WARNING: deletes all data):

```bash
npx prisma migrate reset
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Stop and remove volumes (deletes data)
docker-compose down -v
```

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens

### Optional

- `NODE_ENV` - Environment (development/production)
- `PORT` - API port (default: 3000)
- `REDIS_URL` - Redis connection string
- `CLOUDINARY_URL` - Cloudinary credentials
- `RESEND_API_KEY` - Resend API key for emails
- `RESEND_FROM_EMAIL` - Sender email address

## Production Deployment

### Environment Setup

1. Update `JWT_SECRET` with a secure random string
2. Configure production `DATABASE_URL`
3. Set up Cloudinary for file storage
4. Set up Resend for email delivery
5. Configure Redis (Upstash recommended)

### Build and Run

```bash
pnpm run build
pnpm run start:prod
```

### Docker Production

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:postgres@localhost:5432/photo_studio_saas
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Prisma Issues

```bash
# Regenerate client
pnpm run prisma:generate

# View database
npx prisma studio
```

## License

UNLICENSED - Private project

## Support

For issues and questions, contact the development team.
