# ScarfPOS

Multi-tenant point-of-sale for scarf stores built with Next.js, Prisma, and Tailwind CSS.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and set the values for your local database and session secret.

### 3. Push the schema
```bash
npm run db:push
```

### 4. Start the app
```bash
npm run dev
```

Open http://localhost:3000

## Features

- Multi-tenant auth and data isolation
- Owner and staff roles with product permissions
- Product management with stock tracking
- PoS checkout with receipt generation
- Void and refund flows with inventory restoration
- Transactions filters and receipt details
- Role-based dashboard analytics
- Gmail receipt sending on demand
- Dark mode toggle with persistence

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | Tailwind CSS |
| Database | Prisma + SQLite for dev |
| Auth | JWT sessions with bcrypt |
| Email | Gmail SMTP / Nodemailer |

## Environment

```env
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET="your-secure-random-string"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:studio
```

## Database Flow

- `prisma/schema.prisma` is the source of truth.
- Use `npm run db:push` to sync schema changes locally.
- This repo does not keep Prisma migration SQL history in git.

## Project Structure

```text
src/
├── app/            # Routes, layouts, actions, API handlers
├── components/     # Reusable UI and feature components
├── lib/            # Auth, DB, formatting, access helpers
└── services/       # Business logic and integrations
prisma/
└── schema.prisma   # Database schema
```

## Notes

- Owner-only shop settings are enforced on the server.
- Staff can be granted product add/update permission by the owner.
- Dashboard data is scoped by role: owners see finance metrics; staff see only their own sales.
