---
name: db-prisma-change
description: "Make a Prisma schema or migration change (prisma/schema/migrate/db/数据库). Use when modifying packages/db/prisma/schema/schema.prisma, generating clients, or creating/applying migrations in this repo."
---

# DB Prisma Change

## Goal

Change the DB schema safely with migrations and generated artifacts, using small-step commits.

## Required Reference

- Read `agent_docs/04_data/prisma.md` before editing schema or migrations.

## Workflow

0. Preflight:
   - Run `git status` and call out a dirty tree.
   - Strongly recommend a dedicated worktree for schema work (`worktree-bootstrap`).
1. Edit the schema:
   - Update `packages/db/prisma/schema/schema.prisma`.
   - Do not hand-edit generated files under `packages/db/prisma/generated/**`.
2. Create migration (dev):
   - `bun run db:migrate -- --name <change>`
3. Verify generated types:
   - `bun run check-types` (includes `bun run db:generate`)
4. Commit checkpoints:
   - Slice 1: schema + migration files (`feat(db): add <change> schema migration`)
   - Slice 2: any required app code adjustments (`fix(server): adapt to <change> schema`)
5. Verify again in the merge worktree:
   - `bun run lint`
   - `bun run check-types`

