---
type: worktree_note
createdAt: "2026-01-20T05:53:12.456Z"
branch: "permission-audit"
baseRef: "origin/main"
task:
  title: "permission audit + fixes"
---

# permission-audit - permission audit + fixes

## Scope
- Goal: audit role/page/API permissions for MES pages and apply fixes for missing permissions, UI gating, and 403 handling.
- Non-goals: unrelated feature work outside the permission audit.
- Risks: wide touch surface across routes/modules; matrix can be large.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: inventory roles + permissions + API permission map
- [x] Slice 2: page permission map + role/page access matrix
- [x] Slice 3: issues list + proposed fixes
- [x] Slice 4: implement fixes (roles/UI/403 handling) + update docs
- [x] Slice 5: add permission guard UI + hook `enabled` support for config/ops pages
- [x] Slice 6: implement config/ops page gating (routes, route detail, route versions, data-specs, integration)
- [x] Slice 7: implement master data gating (materials, boms, work-centers)
- [x] Slice 8: work orders + runs list gating
- [ ] Slice 9: run detail flow gating
- [ ] Slice 10: readiness + loading pages gating
- [ ] Slice 11: execution page gating
- [ ] Slice 12: quality + trace pages gating

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-21T01:09:19.404Z
- BaseRef: origin/main
- CommitsAheadOfBase: 10
- Dirty: true
- ChangedFiles:
  - apps/web/src/components/select/route-select.tsx
  - apps/web/src/hooks/use-boms.ts
  - apps/web/src/hooks/use-data-collection-specs.ts
  - apps/web/src/hooks/use-execution-configs.ts
  - apps/web/src/hooks/use-fai.ts
  - apps/web/src/hooks/use-integration-status.ts
  - apps/web/src/hooks/use-lines.ts
  - apps/web/src/hooks/use-materials.ts
  - apps/web/src/hooks/use-operations.ts
  - apps/web/src/hooks/use-oqc.ts
  - apps/web/src/hooks/use-readiness.ts
  - apps/web/src/hooks/use-route-versions.ts
  - apps/web/src/hooks/use-routes.ts
  - apps/web/src/hooks/use-station-execution.ts
  - apps/web/src/hooks/use-station-groups.ts
  - apps/web/src/hooks/use-work-centers.ts
  - apps/web/src/lib/api-error.ts
  - apps/web/src/lib/query-client.ts
  - apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx
  - bun.lock
  - conversation/2026-01-20_141212_permission_audit.md
  - conversation/2026-01-20_142730_permission_audit_plan.md
  - conversation/2026-01-20_180359_permission_audit_progress_-_main_flow_pages.md
  - conversation/2026-01-20_181607_permission_audit_progress_-_rework_tasks.md
  - conversation/2026-01-20_190922_permission_audit_progress_-_config_ops_pages.md
  - packages/db/src/permissions/preset-roles.ts
  - user_docs/demo/permission_audit_plan.md
  - user_docs/demo/permission_audit_report.md
  - worktree_notes/permission-audit.md
- Next:
  - Commit worktree note: git add worktree_notes/permission-audit.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Work in dedicated worktree; treat MES routes/modules as primary scope.
- UI gating is permission-first (not role-based) and must consider flow continuity; per-module choice of hide vs “no access” vs “needs config”.
 - User selected option "1" from the last set of choices; proceed with the first recommended track.
- Main-flow decisions: align work-order receive permission to `wo:receive`; show NoAccess placeholders for flow-critical cards on run detail.

## Progress
- Reviewed conversation plan note; continuing with the selected track.
- Audited readiness config/exceptions, loading pages, execution, FAI, OQC, OQC rules, defects, and trace; recorded gaps in `user_docs/demo/permission_audit_plan.md`.
- Started auditing `/mes/rework-tasks`; page uses `useReworkTaskList` and `useCompleteRework` with no permission gating yet.
- Confirmed `useReworkTaskList` and `useCompleteRework` call `/rework-tasks` endpoints without permission-aware `enabled` guards.
- Server `rework-tasks` endpoints require `quality:disposition`.
- Logged `/mes/rework-tasks` audit entry in `user_docs/demo/permission_audit_plan.md`.
- Began config/ops audit; `/mes/routes` is layout-only (Outlet).
- Reviewed `/mes/routes` list + detail; detail page depends on route detail/configs, stations, station groups, data spec selector, and compile/config actions.
- Reviewed `/mes/route-versions` and `/mes/data-collection-specs`; both pages fetch lists without permission-based query gating, with action buttons gated by `Can`.
- Reviewed `/mes/integration/status`; uses `useIntegrationStatus` and only gates the refresh button.
- Reviewed `/mes/integration/manual-entry` and `/mes/materials`; manual-entry uses line list + integration mutations with limited gating, materials list has no permission gating.
- Reviewed `/mes/boms` and `/mes/work-centers`; both are list pages with no permission-aware query gating.
- Routing API: list/detail/execution-config/versions require `route:read`, process type + exec config mutations require `route:configure`, compile requires `route:compile`.
- Master data APIs (`/materials`, `/boms`, `/work-centers`) require `route:read`.
- Integration APIs: `/integration/status`, `/integration/stencil-status`, `/integration/solder-paste-status` require `system:integration`; line binding endpoints under `/integration/lines/:lineId/*` require `loading:config`.
- Operations list requires `operation:read` + `data_spec:config`; data-collection-spec list/get require `data_spec:read` + `data_spec:config`.
- Station groups hook calls `/stations/groups` without gating; server requires one of route/wo/run permissions.
- Route versions hook uses `/routes/:routingCode/versions` and compile mutation.
- DataSpecSelector fetches active data specs; `/stations/groups` requires route/wo/run permissions and is used in route detail dialogs.
- Route list UI renders detail links/buttons unconditionally (RouteCard/routeColumns).
- Route list/detail/execution-config hooks have no permission-aware `enabled` gating.
- Data-collection spec table/card actions are gated by `data_spec:config`.
- Logged config/ops page audit entries (routes, route detail, route versions, data-specs, integration, materials, boms, work-centers).
- Re-opened `/mes/routes` list page to implement permission-first gating and query `enabled` guards.
- Reviewed `/mes/routes/$routingCode` detail page to add permission checks for route read/config and suppress queries when unauthorized.
- Checked route list columns and NoAccessCard usage to plan list-page gating.
- Confirmed route hooks accept `enabled` options and NoAccessCard layout for permission gating.
- Verified route permission constants (`ROUTE_READ/CONFIGURE/COMPILE`) and located gating spots in `/mes/routes/$routingCode`.
- Reviewed route detail render sections to decide where to insert NoAccessCard and permission-gated queries.
- Opened DataSpecSelector to add permission-driven `enabled` guard and no-access placeholder.
- Checked data spec permission constants and re-opened route detail imports for gating updates.
- Reviewed route versions page and hook to add route-read gating and NoAccessCard handling.
- Opened data-collection-specs list page to apply permission gating on specs and operation filters.
- Reviewed integration status and manual-entry pages for system integration + line binding gating changes.
- Confirmed line list hook `enabled` support and run permissions for gating manual-entry line binding.
- Reviewed materials list page to add route-read gating and NoAccessCard handling.
- Reviewed BOM list page to add route-read gating and query guards.
- Reviewed work-centers list page to add route-read gating and query guards.
- Located config/ops page audit entries in permission audit plan for status updates.
- Applied lint-driven formatting adjustments for data spec hooks/components and import ordering.
- Located main-flow page audit sections (work-orders, runs, readiness, loading, execution, FAI/OQC, defects, rework, trace) in permission audit plan to drive next slice.
- Reviewed task-split + small-step-commits skill guidance; need a 2-6 slice plan with user confirmation before main-flow edits.
- Re-checked dev + note skill requirements; plan/decision responses must be recorded in a conversation note.
- Read main-flow audit entries: remaining ⚠️ items include work-orders route filter + receive permission mismatch, runs line filter + batch authorize column, readiness config/exceptions gating, loading & slot-config gating, execution query gating, FAI/OQC list + dialog gating, defects/rework gating, and trace gating.
- Reviewed `/mes/work-orders` and `/mes/runs` pages: route filter uses `useRouteList` without enabled; receive button gated by `WO_RECEIVE` while API requires `system:integration`; runs line filter uses `LineSelect` without permission gating and batch-authorize selection remains visible when lacking permission.
- Checked `LineSelect` and `runColumns`: line select always queries `/lines`; selection column is always rendered regardless of `run:authorize` permission.
- Confirmed `useWorkOrderList` lacks `enabled` support and `/integration/work-orders` route currently requires `system:integration` in server integration routes.
- Inspected run list hook and work-order columns: `useRunList` lacks `enabled` option; run table actions already permission-gated but selection column needs conditional inclusion for batch authorize.
- Began Slice 1 edits: added `enabled` options for work-order/run list hooks, added line-select `enabled` prop, refactored run columns for conditional selection, and updated work-orders/runs pages for permission-aware filters and NoAccess placeholders; server receive-work-order permission switched to `wo:receive`.
- Started Slice 9: reviewed run detail page for missing view gating on run detail/units and flow cards; identified loading link and generate-units button needing permission checks.
- Reviewed run detail sections: readiness actions should require view + check; generate-units button lacks `run:authorize` gating; FAI/OQC cards are hidden entirely when lacking view; loading link needs `loading:view` gating; run detail/units hooks need `enabled` support.
- Updated audit plan for run detail: marked generate-units gating, loading link gating, and FAI/OQC placeholders as complete.

## Findings
- Worktree created; `bun.lock` modified by `bun install`.
- Preset roles: planner lacks readiness/loading/quality permissions; engineer lacks run/create/authorize; operator only exec/trace/readiness/loading. Admin covers core view + system. See `packages/db/src/permissions/preset-roles.ts`.
- Permissions catalog covers WO/RUN/EXEC/ROUTE/QUALITY/READINESS/LOADING/TRACE/SYSTEM; no extra role-specific hints. See `packages/db/src/permissions/permissions.ts`.
- Server run routes: list/detail/units require `run:read`, close requires `run:close`, authorize/revoke + unit gen/delete require `run:authorize`. See `apps/server/src/modules/mes/run/routes.ts`.
- Run detail page loads run detail, units, readiness latest, FAI gate/records, OQC detail; imports `Permission`, `Can`, `useAbility`. See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Run detail page UI gates: authorize/revoke (`run:authorize`), closeout (`run:close`), trial/start execution (`exec:track_in`); readiness action gating uses `hasPermission(READINESS_CHECK)`. See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Run detail page renders readiness/FAI/OQC sections without `READINESS_VIEW`, `QUALITY_FAI`, or `QUALITY_OQC` gating; only MRB decision is gated by `quality:disposition`. This can trigger 403s for roles lacking view permissions. See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Existing demo issue #6 documents missing UI permission gating and 403 handling for `/mes/runs/:runNo`. See `user_docs/demo/acceptance_issues.md`.
- Query client has no special retry/403 handling yet; default options only set staleTime/gcTime/refetchOnWindowFocus. See `apps/web/src/lib/query-client.ts`.
- API error handling (`apps/web/src/lib/api-error.ts`) maps known MES codes to messages but has no explicit 403/permission messaging.
- Eden `unwrap` throws `ApiError` with HTTP status when backend returns 403; no special handling for permission errors beyond status/message. See `apps/web/src/lib/eden.ts`.
- Runs list page uses `useRunList` (run:read) and gates batch authorize with `run:authorize`; run create button gated by `run:create`. See `apps/web/src/routes/_authenticated/mes/runs/index.tsx`.
- Readiness/FAI hooks only gate queries by runNo; no permission-aware `enabled` options, so callers always fetch unless they add guards. See `apps/web/src/hooks/use-readiness.ts` and `apps/web/src/hooks/use-fai.ts`.
- OQC hooks similarly fetch by runNo without permission-aware `enabled`; error toasts use `getApiErrorMessage` with generic fallback. See `apps/web/src/hooks/use-oqc.ts` and `apps/web/src/hooks/use-api-error.ts`.
- Readiness API permissions: latest/history/exceptions require `readiness:view`, precheck/formal require `readiness:check`, waive requires `readiness:override`. See `apps/server/src/modules/mes/readiness/routes.ts`.
- FAI/OQC API endpoints (list/detail/run/gate/start/complete) all require `quality:fai` / `quality:oqc`. See `apps/server/src/modules/mes/fai/routes.ts` and `apps/server/src/modules/mes/oqc/routes.ts`.
- Run detail page fixes in progress: add permission gating for readiness view/override and suppress FAI/OQC queries unless permitted.
- Work order APIs require `wo:read` for list, `wo:release` for release, `run:create` for create run, `wo:update` for pick status, `wo:close` for close. See `apps/server/src/modules/mes/work-order/routes.ts`.
- Execution APIs require `exec:track_in`/`exec:track_out` for resolve unit, track-in, track-out, and data-specs. See `apps/server/src/modules/mes/execution/routes.ts`.
- MRB decision/rework endpoints require `quality:disposition`. See `apps/server/src/modules/mes/oqc/mrb-routes.ts`.
- Audit report drafted at `user_docs/demo/permission_audit_report.md`.
- `bun install` updated `bun.lock` to include `@better-app/shared` workspace entries.
- Flow docs reviewed: E2E and SMT specify readiness → loading → FAI → authorize → execution → OQC/MRB; permission design should align per step and not per role. See `domain_docs/mes/spec/process/01_end_to_end_flows.md` and `domain_docs/mes/spec/process/03_smt_flows.md`.
- DIP flow adds prep/FAI gate, multi-stage IPQC-like checks, OQC/MRB; needs permission mapping per block rather than per role. See `domain_docs/mes/spec/process/04_dip_flows.md`.
- Added plan note at `conversation/2026-01-20_142730_permission_audit_plan.md`.
- Checked `user_docs/demo/` contents; no existing permission audit plan doc yet.
- Flow re-read: E2E + SMT emphasize readiness→loading→FAI→authorize→execution→OQC/MRB and explicit readiness item types; capability map should enumerate these steps with view/action permissions. See `domain_docs/mes/spec/process/01_end_to_end_flows.md` and `domain_docs/mes/spec/process/03_smt_flows.md`.
- DIP flow adds prep + IPQC-style checks and rework loop; plan should treat these as modules even if not fully implemented. See `domain_docs/mes/spec/process/04_dip_flows.md`.
- Existing audit report is role-centered; plan doc should shift to permission-first, module-level gating and avoid role matrices for UX decisions. See `user_docs/demo/permission_audit_report.md`.
- Drafted permission-first audit plan at `user_docs/demo/permission_audit_plan.md`.
- Expanded plan with module decision flow (flow continuity, optional module hide, config CTA rules) and output requirements.
- Loading routes include multiple endpoints gated by `loading:verify`, `loading:view`, and `loading:config` (see `apps/server/src/modules/mes/loading/routes.ts`).
- Trace API `/trace/units/:sn` requires `trace:read` (see `apps/server/src/modules/mes/trace/routes.ts`).
- Loading APIs: `POST /loading/verify`, `POST /loading/replace`, `POST /runs/:runNo/loading/load-table` require `loading:verify`; `GET /runs/:runNo/loading`, `/runs/:runNo/loading/expectations`, `/lines/:lineId/feeder-slots` require `loading:view` (see `apps/server/src/modules/mes/loading/routes.ts`).
- Loading config APIs: `/lines/:lineId/feeder-slots` (POST/PUT/DELETE), `/feeder-slots/:slotId/unlock`, `/slot-mappings` (POST/PUT/DELETE) require `loading:config`; slot-mappings list uses `loading:view` (see `apps/server/src/modules/mes/loading/routes.ts`).
- Routing APIs: `/routes` + `/routes/:routingCode` + `/routes/:routingCode/versions` + `/routes/:routingCode/versions/:versionNo` + `/routes/:routingCode/execution-config` require `route:read`; `/routes/:routingCode` (PATCH) + `/routes/:routingCode/execution-config` (POST/PATCH) require `route:configure`; `/routes/:routingCode/compile` requires `route:compile` (see `apps/server/src/modules/mes/routing/routes.ts`).
- Data collection specs: list/get require `data_spec:read` + `data_spec:config`; create/update require `data_spec:config` (see `apps/server/src/modules/mes/data-collection-spec/routes.ts`).
- Defect + rework endpoints (`/defects`, `/defects/:id`, dispositions, release; `/rework-tasks` list/complete) all require `quality:disposition` (see `apps/server/src/modules/mes/defect/routes.ts`).
- Integration endpoints under `/integration/*` require `system:integration`; additional line-binding endpoints in this module require `loading:config` (see `apps/server/src/modules/mes/integration/routes.ts`).
- Work order receive endpoint `POST /integration/work-orders` requires `system:integration` (see `apps/server/src/modules/mes/integration/routes.ts`).
- FAI actions require `quality:fai`: create `/fai/run/:runNo`, start `/fai/:faiId/start`, record items `/fai/:faiId/items`, complete `/fai/:faiId/complete` (see `apps/server/src/modules/mes/fai/routes.ts`).
- Readiness config endpoints `/lines/:lineId/readiness-config` (GET) require `readiness:view`, PUT requires `readiness:config` (see `apps/server/src/modules/mes/line/routes.ts`).
- Capability map table populated in `user_docs/demo/permission_audit_plan.md` with verified flow step → permission → API pairs.
- Run detail page modules identified: flow progress, run summary/stats, readiness card, FAI card, OQC card, route progress, unit list, dialogs. Noted gaps: “生成单件” button lacks permission gating; “前往上料” link lacks loading permission gating; FAI/OQC cards are hidden entirely when missing view permission (may conflict with flow continuity policy). See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Added `/mes/runs/:runNo` audit entry to `user_docs/demo/permission_audit_plan.md` with module-level decisions and gaps.
- Work orders page audit: route filter uses `/routes` (route:read) without gating; receive work order UI uses `wo:receive` but API requires `system:integration`. See `apps/web/src/routes/_authenticated/mes/work-orders.tsx` and `apps/web/src/hooks/use-work-orders.ts`.
- Runs list audit: line filter uses `/lines` requiring `run:read` + `run:create` and is ungated; batch authorize button disabled but selection column remains visible. See `apps/web/src/routes/_authenticated/mes/runs/index.tsx`, `apps/web/src/components/select/line-select.tsx`, and `apps/server/src/modules/mes/line/routes.ts`.

## Open Questions
-

## Errors
- Attempted to write conversation note with `cat >`, failed due to `zsh: file exists`; next approach: write via `cat >|` or `apply_patch` to overwrite.
- `git add` failed because `$runNo` expanded in path; next approach: quote or escape the path when adding.
- `bun scripts/smart-verify.ts` failed: Biome wants import sorting + formatting in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`; next approach: run `bun run format` or apply suggested import order + formatting, then re-run verify.
- `bun scripts/smart-verify.ts` failed again after format; remaining issue is import ordering in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`; next approach: manually reorder imports to match Biome suggestion, then re-run verify.
