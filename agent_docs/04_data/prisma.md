# Prisma and Prismabox

## Goal
- Explain how Prisma and Prismabox are used in this repo.

## When to Use
- Changing the schema or adding DB-driven validation.

## Paths
- Schema: `packages/db/prisma/schema/schema.prisma`
- Prisma config: `packages/db/prisma.config.ts`
- Generated client: `packages/db/prisma/generated/client`
- Generated Prismabox schemas: `packages/db/prisma/generated/prismabox`

## Database URL
Use SQLite file URLs.
- Local dev: `DATABASE_URL=file:./data/`
- Docker: `DATABASE_URL=file:/data/`
- Bare metal: `DATABASE_URL=file:/var/lib/better-app/`

## Migrations
- Dev: `bun run db:migrate -- --name <change>`
- Prod: `bun run db:deploy`

## Validation Flow
Prisma schema -> Prismabox TypeBox schemas -> Elysia validation -> Eden Treaty types.

## Related Docs
- `agent_docs/03_backend/api_patterns.md`
- `agent_docs/04_data/json_schema_types.md`
