# Project Overview

## Goal
- Provide a fast orientation to what this repo contains and how the stack fits together.

## When to Use
- First time opening the repo.
- Before making cross-cutting changes (web + server + db).

## Core Scope
- Scaffold with reusable, non-business-specific modules.
- Includes auth/users, instruments/calibrations, notifications (WeCom), system settings, and cron jobs.

## Technology Stack
- Runtime and package manager: Bun
- Backend: Elysia (TypeScript, plugin-based)
- Frontend: React 19 + TanStack Router (file-based routing)
- Database: SQLite via Prisma
- Auth: Better Auth (Prisma adapter)
- UI: Tailwind v4 + shadcn/ui
- Type safety: Elysia + Prismabox (TypeBox schemas)

## Repository Layout
- `apps/web`: Web app routes and UI components.
- `apps/server`: API server (entry `src/index.ts`).
- `packages/db`: Prisma schema + generated client and Prismabox schemas.
- `packages/auth`: Better Auth configuration and adapters.

## Related Docs
- `agent_docs/00_onboarding/setup.md`
- `agent_docs/01_core/architecture_overview.md`
- `agent_docs/01_core/coding_standards.md`
