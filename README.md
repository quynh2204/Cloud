# ScarfPOS - Multi-tenant PoS

Web-based PoS for scarf stores with tenant + user login, product management, checkout, receipts, and Gmail SMTP email delivery.

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a local env file

```bash
cp .env.example .env
```

3. Initialize the database

```bash
npm run db:push
```

4. Start the app

```bash
npm run dev
```

Visit http://localhost:3000

## Gmail SMTP

- Use an app password for Gmail.
- Set `SMTP_USER` to the Gmail address and `SMTP_PASS` to the app password.

## Multi-tenant flow

- Register a new tenant with Store Name + Store Code.
- Login requires Store Code + Email + Password.
- All data is scoped to the tenant automatically.

## Notes

- SQLite is used for local development.
- Update `DATABASE_URL` for PostgreSQL in production.
