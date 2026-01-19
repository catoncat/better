# Context
User reports repeated Prisma migration failures and asks for a permanent fix. Current tree is dirty with schema changes in `packages/db/prisma/schema/schema.prisma` and an existing conversation note.

# Decisions
- Use repo-standard Prisma workflow (bun + prisma.config.ts), avoid interactive migrate dev, and resolve drift deterministically by generating a migration script via `prisma migrate diff` or by rebaselining the local DB if needed.
- Prefer a migration folder with explicit SQL for the new columns to avoid repeated migrate dev prompts.

# Plan
1. Inspect Prisma scripts/config to confirm migration commands and config usage.
2. Determine drift status and whether local DB reset is acceptable; otherwise generate SQL diff using `--from-migrations` and `--to-schema` with `packages/db/prisma.config.ts`.
3. Create migration folder with SQL changes, then run `bun run db:deploy` (non-interactive) and `bun run check-types`.
4. Summarize a “permanent fix” runbook for future changes (drift handling + non-interactive migration).

# Findings
- Prisma config is at `packages/db/prisma.config.ts`; schema at `packages/db/prisma/schema/schema.prisma` (per `agent_docs/04_data/prisma.md`).
- Root scripts delegate Prisma commands to `packages/db` via `bun run --filter @better-app/db ...`.
- `packages/db` uses direct Prisma commands: `db:migrate` = `prisma migrate dev`, `db:deploy` = `prisma migrate deploy`, `db:push` = `prisma db push`.
- `packages/db/prisma.config.ts` resolves `DATABASE_URL` to an absolute SQLite file path and loads env from `apps/server/.env`.
- Prisma docs show `prisma migrate diff` can generate SQL using `--from-empty`/`--to-schema` and output a script; CLI supports `--schema` to point at a specific `schema.prisma`.
- Migrations live under `packages/db/prisma/schema/migrations` alongside `schema.prisma`.
- `apps/server/.env` sets `DATABASE_URL=file:/Users/envvar/lzb/better/data/db.db` and the DB file exists locally.
- `prisma migrate diff --help` confirms supported flags: `--from-schema`, `--to-schema`, `--from-migrations`, `--from-config-datasource`, and `--output` for file writes.
- `prisma migrate resolve --help` confirms it can baseline existing DBs via `--applied <migration>` and reads datasource from `prisma.config.ts`.
- The new baseline migration was mistakenly created under `packages/db/prisma/migrations` (wrong location).
- `prisma migrate deploy` uses datasource from `prisma.config.ts`; no extra flags required for the config.
- Diff from migrations → schema generates a large SQL script (many CREATE TABLE / index changes), indicating migrations are behind the current schema beyond the new columns.
- `prisma migrate status` shows all existing migrations (except the new drift-capture migration) are not applied in the local DB, confirming the history table is empty/out of sync.

# Progress
- Started note and collected required Prisma doc references.
- Located Prisma scripts and migration entry points.
- Reviewed Prisma config and migrate diff docs to avoid interactive migrate dev.
- Confirmed existing migrations live under `packages/db/prisma/schema/migrations`.
- Verified local SQLite DB path and presence.
- Confirmed the exact Prisma CLI flags to use for non-interactive diff generation.
- Confirmed migrate resolve usage for baselining existing databases.
- Identified correct migration root and existing history.
- Confirmed migrate deploy behavior and options.
- Generated a baseline migration SQL via `prisma migrate diff --from-empty --to-schema`, but placed it in the wrong migrations directory.
- Ran `bun run db:push` to align the local SQLite DB with the schema (no data loss prompts).
- Moved baseline migration into `packages/db/prisma/schema/migrations/20260119215430_init`.
- Removed the incorrect `packages/db/prisma/migrations` directory.
- Successfully marked baseline as applied via `prisma migrate resolve --applied 20260119215430_init`.
- Regenerated `20260119215430_init` using `--from-migrations` and `--to-schema`; output is large (captures drift across multiple tables).
- Marked all existing migrations as applied via `prisma migrate resolve --applied ...` to baseline the local DB history.
- `prisma migrate status` now reports the database schema is up to date.
- Ran `bun run check-types` (includes `db:generate`) successfully.
- Verified migrations apply cleanly on a fresh SQLite DB via `DATABASE_URL=file:/tmp/better_migrate_test.db bunx prisma migrate deploy`.

# Errors
- `prisma migrate resolve --applied 20260119215430_init` failed with P3017 because the migration was created in the wrong directory.

# Open Questions
- Whether we can reset the local dev DB to reconcile drift (if not, use migrate diff and resolve).

# References
- `agent_docs/04_data/prisma.md`
