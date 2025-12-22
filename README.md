# better-scaffolding

A minimal, runnable scaffold with the core building blocks:

- Better Auth (email/password)
- User management (roles)
- Instruments + calibration records
- Notifications + WeCom config
- Instrument calibration reminder cron

## Quick Start

```bash
bun install
cp apps/server/.env.example apps/server/.env

# Migrations + seed data
bun run db:migrate
bun run db:seed

# Dev servers (web 3001, api 3000)
bun run dev
```

## Useful Commands

- `bun run dev:web`
- `bun run dev:server`
- `bun run db:generate`
- `bun run db:studio`

## Notes

- SQLite DB path: `DATABASE_URL=file:./data/db.db`
- Timezone: set `APP_TIMEZONE` (IANA format, default `Asia/Shanghai`)
- Seed admin (default): `admin@example.com / ChangeMe123!`
