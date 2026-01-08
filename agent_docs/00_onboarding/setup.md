# Setup (Dev and Deploy)

## Goal
- Provide the source of truth for local development setup.

## When to Use
- Before running the app locally.
- Before creating or applying database migrations.

## Local Development (Recommended)
```bash
bun install
cp apps/server/.env.example apps/server/.env

bun run db:migrate
bun run db:seed

bun run dev
```
`db:seed` resets the SQLite DB (local dev default) and seeds MES demo master data + a READY executable route version + demo WO/Run/Units.

Safety: `db:seed` refuses to reset a DB outside `./data/` unless `SEED_ALLOW_UNSAFE_RESET=true` is set.

### Common Commands
- Web only: `bun run dev:web`
- Server only: `bun run dev:server`
- Prisma Studio: `bun run db:studio`
- Regenerate Prisma/Prismabox: `bun run db:generate`

## Quick Demo (MES End-to-End)
1) Start the server (and web if desired): `bun run dev`
2) Run the demo flow in another terminal:
```bash
bun apps/server/scripts/test-mes-flow.ts
```
The script logs in with the seeded admin user and runs the full flow.

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

## Deployment (Single Binary)
- Guide: `agent_docs/05_ops/single_binary_deployment.md`
