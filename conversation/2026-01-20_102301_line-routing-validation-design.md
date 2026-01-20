# line-routing-validation-design

## Context
- User expects one physical line to support multiple routing versions with minor variations.
- Validation failure must provide clear mismatch details and configuration guidance.

## Decisions
- Keep Line↔Routing compatibility capability-based (line supports multiple routings/versions).
- Validation failures should include: mismatch location (line/routing/step) + concrete config actions to fix.

## Plan
- If implemented: add `processType` to `Line` + `Routing` (or a capability table); seed values; release validation checks `processType` + station-group coverage; return structured guidance payload.

## Findings
- `Line` model currently has no process-type field; it only holds identity + relations (`stations`, `runs`, `feederSlots`, `lineStencils`, `lineSolderPastes`).
- `SlotMaterialMapping` can optionally point to `routingId`, so loading validation can already be routing-scoped.
- `Routing` also has no process-type field; steps link to `RoutingStep` with optional `stationGroupId`.
- `Station` links to both `Line` (`lineId`) and `StationGroup` (`groupId`), so line compatibility can be inferred by checking whether each routing step’s station group has stations on the target line.
- Current MES plan tracking lives in `domain_docs/mes/plan/tasks.md` (phase 3 marked done). It already includes a guard for line↔route station-group compatibility during Run creation (3.2.5).
- `user_docs/demo/acceptance_issues.md` already documents missing line↔routing process-type validation at work-order release and suggests adding `processType` + validation in `apps/server/src/modules/mes/work-order/service.ts`.
- `releaseWorkOrder` currently validates routing exists + ready version + line/stationGroup existence, but has no routing↔line compatibility check.
- `createRun` enforces dispatch line consistency and loads latest READY route snapshot for further step validation (needs review for line compatibility details).
- `createRun` already checks line↔route step compatibility via route snapshot (`stationType`, `stationGroupId`, `allowedStationIds`) and returns `RUN_LINE_INCOMPATIBLE_WITH_ROUTE` with missing group codes.
- `workOrderErrorResponseSchema` currently only supports `{ code, message }`, so structured guidance would require extending error payload.
- `ServiceResult` error shape is `{ success: false; code; message; status? }` only; adding structured guidance likely needs an optional `details` field or new error schema.
- MES routes UI includes `apps/web/src/routes/_authenticated/mes/routes/index.tsx` (route list), using `useRouteList` + `routeColumns`/`route-card`.
- Lines are fetched via `useLines()` (GET `client.api.lines.get`), used in multiple UI selectors (run create, work-order release, readiness config, loading, etc.).
- `apps/server/src/modules/mes/line/routes.ts` exposes only list (id/code/name) and readiness-config endpoints; no line update endpoint for process-type yet.
- `apps/server/src/modules/mes/line/schema.ts` list response only includes id/code/name; will need to extend for `processType` and new update schema if UI edits line config.
- Seed data in `apps/server/scripts/seed.ts` creates LINE-A/LINE-DIP-A and routes without any process-type field; needs updates when schema adds processType.
- Seed file uses enums from `db` module (e.g., `db.StationType`), so we can use `db.ProcessType.SMT/DIP` for new fields.
- Routing API schemas (`apps/server/src/modules/mes/routing/schema.ts`) have no `processType` in route summary/detail.
- Routing routes currently expose execution-config CRUD + compile only; no route update endpoint (likely route data is ERP/MES managed elsewhere).
- Readiness config UI (`apps/web/src/routes/_authenticated/mes/readiness-config.tsx`) is a per-line settings screen that could host a process-type selector.
- `LineSelect` uses line list items (label: name + code), so process-type display could be added there for clarity.
- Route detail UI focuses on execution config; route list fields are defined in `route-field-meta.tsx` without `processType`.
- Routing service defines `listRoutes` and `getRouteDetail` (around line 590+), which will need to include `processType` once added to schema.
- `useRouteList`/`useRouteDetail` in `apps/web/src/hooks/use-routes.ts` derive types from API response, so adding fields to API updates UI types automatically.
- Work-order UI (`apps/web/src/routes/_authenticated/mes/work-orders.tsx`) uses `useReleaseWorkOrder` and `useCreateRun` hooks; release dialog itself doesn’t show error guidance, so we need to check hook error handling for user-facing messages.
- Work-order mutations show errors via `useApiError` → `getApiErrorMessage`, which currently ignores `details` and only maps `code`/message.
- Readiness config hooks show the standard mutation pattern (toast + invalidate) we can mirror for line process-type updates.
- Route list uses `routeFieldMeta` for both table and cards; adding processType there will propagate to list and cards.
- Route detail page already has a “路由信息” card; add processType selector there, using `useAbility` to gate editing.
- `unwrap` throws `ApiError` with `details` when backend includes them; to surface guidance, we can either embed guidance in `message` (CJK) or extend UI to render `details`.
- `packages/shared/src/error-codes.ts` only maps known codes; adding new codes would override custom messages in `getApiErrorMessage` (since it prefers registry message).
- ERP route sync (`apply-routes.ts`) upserts `Routing` without any process-type field; ERP types (`integration/erp/types.ts`) do not include process-type data.
- Skills require reading `agent_docs/04_data/prisma.md` (schema change) and `agent_docs/03_backend/api_patterns.md` (new endpoints) before coding.
- Prisma doc confirms migration flow (`bun run db:migrate -- --name <change>`) and prismabox generation chain; API patterns emphasize audit logging + envelope + ServiceResult.
- UI docs require semantic tokens + Simplified Chinese labels; route changes should follow TanStack Router patterns.
- Enum labels should be centralized in `apps/web/src/lib/constants.ts` (per localization_constants.md); add a process type map there.
- Permissions include `ROUTE_CONFIGURE` and `READINESS_CONFIG`/`SYSTEM_CONFIG` (no line-specific permission), so line/routing process-type updates should reuse existing config permissions.
- Prisma enums for MES are grouped near `WorkOrderStatus`/`StationType`; add new `ProcessType` enum there for Line/Routing.
- Worktree note tooling skips main/master branches by default; may need a custom note file if staying on main.
- Current branch is `main`; existing notes include `worktree_notes/main.md` and `worktree_notes/main-mes-execution.md`.
- `worktree_notes/README.md` forbids creating notes on `main`; for main-branch work we should record plan/progress in `conversation/`.
- `git status` marks `packages/db/prisma/schema/schema.prisma` as modified, but `git diff` shows no content change; need to inspect staged vs file-mode changes before editing.
- `git status --porcelain=v2 -- packages/db/prisma/schema/schema.prisma` returns no record; need to re-check overall status to confirm if file is still dirty.
- Latest `git status` shows dirty files in `apps/web/src/components/login-form.tsx`, `apps/web/src/routes/__root.tsx`, and `user_docs/demo/acceptance_issues.md`; `schema.prisma` no longer appears dirty.
- Migration `20260120025331_add_process_type` adds `processType` to Line/Routing with default `SMT`; existing data will default to SMT unless updated in UI.

## Progress
- Added `ProcessType` enum and `processType` fields to `Line` and `Routing` in `packages/db/prisma/schema/schema.prisma`.
- Ran `bun run db:migrate -- --name add_process_type`, created migration `20260120025331_add_process_type`.
- Updated seed data to set `processType` for LINE-A/LINE-DIP-A and SMT/DIP routes.
- Added line process-type update service/endpoint and included `processType` in line list schema/response.
- Added routing process-type update endpoint and schema updates for list/detail.
- Work order release now validates line vs routing processType and work order list includes routing.processType.
- Added line processType UI to readiness config page (with save action) and updated line select labels.
- Updated `user_docs/demo/acceptance_issues.md` Issue #5 to mark the fix (processType + release validation) as resolved.
- Enhanced readiness config line selector to display process type for clarity.
- Fixed type errors (ProcessType typing + route detail signature) and `bun run check-types` now passes.

## Errors
- Attempted to read `domain_docs/mes/plan/phase3_tasks.md` via `sed -n '1,200p'`; file not found. Next: locate plan files with `rg --files -g "domain_docs/mes/plan/*.md"`.
- Attempted `rg --files -g "apps/web/src/routes/_authenticated/mes/**/*line*"`; no matches (exit 1). Next: list MES routes with a broader glob and locate line/routing pages manually.
- Attempted `sed -n '1,220p' apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`; shell expanded `$routingCode` and file not found. Next: quote the path or escape `$`.
- Attempted `rg -n "ProcessType" packages apps`; no matches. Next: introduce a new enum in Prisma or reuse an existing enum name if present in schema.
- `apply_patch` failed updating `apps/server/src/modules/mes/routing/routes.ts` due to context mismatch. Next: re-open the file around the route detail handler and reapply with correct context.
- `bun run check-types` failed after db:generate. Issues: `getRouteDetail` return type missing `processType`, `Prisma.ProcessType` not exported (use top-level `ProcessType`), and web state typed as `string` for processType. Next: fix routing service signature, swap to `ProcessType` import, tighten UI state types, rerun check-types.
- `bun run lint` failed: import ordering, `type`-only import for `ProcessType`, formatting in dialogs, and `useEffect` dependencies in readiness config. Next: fix import order, add `type` keywords, update effect deps, apply formatting.

## Open Questions
- Use `processType` multi-capability (array/join table) vs single `processType` + "MIXED"?

## References
-
