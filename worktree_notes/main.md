# Worktree Notes - main

## Context
- Fix intermittent list loading after frontend list query optimization.

## Decisions
- TBD

## Plan
- Inspect list pages changed in the optimization commit.
- Adjust URL update logic to avoid stale search params while keeping best practices.
- Verify list pages update/search/pagination.

## Findings
- Commit 9bffd7b ("Optimize performance") moved list page URL updates to use searchParamsRef; likely stale reads.

## Progress
- Created note; identified suspect commit.

## Errors
- None

## Open Questions
- Which list pages are affected beyond work-orders/runs/oqc?

## References
- apps/web/src/routes/_authenticated/mes/work-orders.tsx
- apps/web/src/routes/_authenticated/mes/runs/index.tsx
- apps/web/src/routes/_authenticated/mes/oqc/index.tsx

## Findings (2025-02-14)
- TanStack Router supports navigate({ search: (prev) => ({ ...prev, ... }) }) to avoid stale search params.

## Progress (2025-02-14)
- Replaced searchParamsRef usage with navigate({ search: (prev) => ... }) in MES list pages to avoid stale params.

## Progress (2025-02-14)
- Ran `bun scripts/smart-verify.ts` (biome check + typecheck) successfully.

## Findings (dev server crash)
- `packages/db/src/index.ts` and `packages/db/package.json` import/export `./prisma/generated/prismabox/barrel.ts` via `@better-app/db/prismabox`.
- Missing `packages/db/prisma/generated/prismabox/barrel.ts` will crash server on reload.
- `apps/server` dev script uses `bun run --hot src/index.ts` (no custom error handling/respawn).
- `packages/db/prisma/generated/prismabox/barrel.ts` exists on disk, so ENOENT is unexpected; likely a hot-reload/watch resolution issue rather than missing file.

## Findings (2025-02-14)
- useWorkOrderList returns data directly from client.api["work-orders"].get and list page uses data?.items.

## Findings (2025-02-14)
- DataListLayout syncs pagination/sorting with URL; in server mode it relies on incoming data and does not mutate URL when onPaginationChange is provided.
- Root `dev` runs each workspace `dev` script; `dev:server` maps to `apps/server` `bun run --hot src/index.ts`.

## Findings (2025-02-14)
- Server listWorkOrders returns { items, total, page, pageSize }; API shape matches client expectation.

## Findings (2025-02-14)
- WorkOrdersPage passes data={data?.items || []} and renders WorkOrderCard via DataListLayout; empty UI implies data array empty or view rendering suppressed.
- No `.gitignore` entry for prismabox generated files; `schema.prisma` outputs `../generated/prismabox` (expected `barrel.ts` there).

## Findings (2025-02-14)
- DataCardList shows empty only when items.length === 0; no suppression logic in view preferences.
- Web: Bun has known HMR/--hot issues in monorepos causing "Unexpected reading file" errors; issue #26075 cites workspace imports + --watch/--hot and HMR, fixed by bundler/cache patches in newer Bun versions.
- Bun docs: --hot does soft reload; --watch does hard restart. Soft reload preserves global state; errors during reload can leave server broken until restart.
- Bun version locally: 1.3.1 (older than reports of HMR fix for stale FD/Unexpected reading file).
- Server entry uses Elysia with plugins; no built-in dev reload handler beyond Bun --hot.

## Findings (2025-02-14)
- workOrderColumns uses createColumnsFromFieldMeta; nothing obviously suppressing rows.

## Findings (2025-02-14)
- Most list hooks use `unwrap(response)`; work-orders and runs list hooks still parse `{ data, error }` manually.
