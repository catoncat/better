# Setup (Dev and Deploy)

## Goal
- Provide the only source of truth for local setup and deployment steps.

## When to Use
- Before running the app locally.
- Before creating or applying database migrations.
- Before deploying the single-binary build.

## Local Development (Recommended)
```bash
bun install
cp apps/server/.env.example apps/server/.env

bun run db:migrate
bun run db:seed

bun run dev
```

### Common Commands
- Web only: `bun run dev:web`
- Server only: `bun run dev:server`
- Prisma Studio: `bun run db:studio`
- Regenerate Prisma/Prismabox: `bun run db:generate`

## Optional Observability (Jaeger v2 + OpenSearch)
- Setup guide: `agent_docs/05_ops/observability_jaeger.md`

## Environment Variables and SQLite
- Use `DATABASE_URL=file:<path>` for SQLite.
- For monorepo dev, relative paths are resolved from repo root.
- For production, prefer absolute paths.

Examples:
- Local dev: `DATABASE_URL=file:./data/`
- Docker: `DATABASE_URL=file:/data/`
- Bare metal: `DATABASE_URL=file:/var/lib/better-app/`

## Migration Conventions
- Edit schema: `packages/db/prisma/schema/schema.prisma`
- Dev migrations:
  - `bun run db:migrate -- --name <change>`
- Production apply only:
  - `bun run db:deploy`

## Single-Binary Deployment
Goal: one Bun binary (web + API) and one SQLite file, expose HTTPS 443.

### Build
```bash
bun install
bun run build:single
```
Output: `apps/server/better-app`

### TLS
Set:
- `APP_TLS_CERT_PATH=/etc/ssl/better-app/fullchain.pem`
- `APP_TLS_KEY_PATH=/etc/ssl/better-app/privkey.pem`

### Runtime Env (Example)
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=443`
- `APP_URL=https://your-domain.example`
- `DATABASE_URL=file:/var/lib/better-app/`
- `APP_WEB_MODE=embedded` (default)

### Optional External Web Dir
- `APP_WEB_MODE=dir`
- `APP_WEB_DIR=/absolute/path/to/web/dist`

## Related Docs
- `agent_docs/01_core/architecture_overview.md`
- `agent_docs/04_data/prisma.md`
