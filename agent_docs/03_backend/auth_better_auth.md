# Better Auth Integration

## Goal
- Document how Better Auth is wired into this project.

## When to Use
- Adding auth-aware routes or adjusting auth behavior.

## Where It Lives
- Auth config: `packages/auth/src/index.ts`
- Elysia plugin: `apps/server/src/plugins/auth.ts`

## Key Settings
- `basePath: "/api/auth"`
- Prisma adapter with SQLite
- Email verification via Resend (fallback logs in dev)
- OpenAPI schema extraction via `BetterAuthOpenAPI`

## Server Usage
- The auth plugin decorates context with `auth`.
- Use `isAuth: true` in route options to require authentication.

## Related Docs
- `agent_docs/01_core/architecture_overview.md`
- `agent_docs/03_backend/api_patterns.md`
