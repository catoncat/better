# Architecture Overview

## Goal
- Give a high-level map of how the server and web app are structured.

## When to Use
- Adding a new feature that touches multiple layers.
- Unsure where a change should live.

## Server Architecture
- Entry: `apps/server/src/index.ts`.
- Elysia plugin architecture; `prismaPlugin` injects `db` and `authPlugin` injects session/user + `requireAuthHook`.
- API prefix: `/api`.
- OpenAPI is enabled; CORS is derived from `APP_URL`.
- Modules live in `apps/server/src/modules/*` and should remain focused (users, instruments, calibrations, notifications, system).

## Validation and Types
- Schemas are generated from Prisma via Prismabox (TypeBox).
- Use TypeBox schemas in routes for validation and response typing.

## Frontend Architecture
- Routes: `apps/web/src/routes/*` (TanStack Router file-based).
- Generated route tree: `apps/web/src/routeTree.gen.ts`.
- Auth client: `apps/web/src/lib/auth-client.ts`.
- UI components: `apps/web/src/components/ui/*` (shadcn/ui).

## Defaults and Limits
- Pagination defaults: 20 per page, max 100.
- Use `db.$transaction` for multi-step writes.
