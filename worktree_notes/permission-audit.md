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
- [x] Slice 9: run detail flow gating
- [x] Slice 10: readiness + loading pages gating
- [x] Slice 11: execution page gating
- [x] Slice 12: quality + trace pages gating

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
- Completed Slice 12: quality + trace page gating shipped; audit plan updated and committed.
- Ran `bun run format` to resolve Biome formatting issues before re-running verification.
- Ran `bun run lint -- --write` to apply Biome import-order fixes.
- Re-ran `bun run lint -- --write` after typing filter fields in runs/work-orders.
- `bun scripts/smart-verify.ts` now passes (lint + check-types).
- Merging into `main`: resolved conflicts in FAI filters, loading slot-config line selection, OQC rule dialog route list, and run detail readiness/actions.
- `bun scripts/smart-verify.ts` re-run on `main` after merge (lint + check-types) passed.
- Completed Slice 11: execution gating shipped and audit plan updated.
- Updated execution section statuses in `user_docs/demo/permission_audit_plan.md`.
- Completed Slice 10: readiness + loading gating shipped and audit plan updated.
- Updated `user_docs/demo/permission_audit_plan.md` statuses for readiness + loading pages.
- Reviewed loading index and slot-config to align import order and permission gating after edits.
- Verified readiness-exceptions uses permission-gated filters and run links with new enabled support.
- Reviewed readiness hooks/config for enabled gating; looks consistent with new permission guards.
- Updated loading hooks/components to accept enabled options and started gating loading index/slot-config by loading permissions.
- Re-read worktree note after context switch; continue Slice 10 with loading pages gating (loading index + slot-config) before updating plan.
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
- Reviewed readiness config/exceptions pages: line selectors and exceptions list lack permission-based query gating; readiness config checkboxes are editable without `readiness:config`; exceptions run links render without `run:read` checks.
- Confirmed `useReadinessConfig` and `useReadinessExceptions` hooks lack `enabled` options; need to add for permission gating.
- Located loading page and slot-config route files under `apps/web/src/routes/_authenticated/mes/loading/` for Slice 10 updates.

## Findings
- Additional merge conflicts in run detail (generate-units gating and readiness action links) and OQC rule dialog route list rendering; plan to combine permission gating with existing UI truncation/action links.
- Merge into `main` hit conflicts in FAI filter area and loading slot-config line selection; need to keep permission gating while preserving existing UI details.
- Runs/work-orders filter fields now typed with `FilterFieldDefinition`; import order updated by Biome.
- `FilterFieldDefinition` is exported from `@/components/data-list`; can import it to type filter arrays in runs/work-orders.
- `work-orders.tsx` filter fields array is untyped; add `FilterFieldDefinition[]` typing to keep literal `type` values.
- `runs/index.tsx` builds filter field array without `FilterFieldDefinition[]` typing; `work-orders.tsx` likely similar, causing `type` to widen to `string` and reject `render`.
- `FilterFieldDefinition` supports `type: "custom"` with optional `render` (see `apps/web/src/components/data-list/filter-toolbar.tsx`); type errors likely from inferred `type: string` in filter arrays.
- Biome import-order fixes touched FAI, OQC list/rules, and loading slot-config pages.
- Formatting-only fixes are staged; worktree note still unstaged.
- `bun run format` touched work-orders hook plus execution/loading/readiness/run detail routes; changes are formatting-only.
- Remaining unstaged changes are audit plan + worktree note updates after code commit.
- Slice 12 code files are staged; audit plan + worktree notes still unstaged.
- Current diff limited to Slice 12 hooks/routes plus audit plan + worktree note updates.

## Errors
- `git add apps/web/src/routes/_authenticated/mes/oqc/-components/oqc-card.tsx ...` failed: pathspec did not match (files live under `apps/web/src/routes/_authenticated/mes/-components/`). Next: re-run `git add` with corrected paths.
- `bun scripts/smart-verify.ts` failed at `bun run lint` (Biome) due to formatting/import-order issues in `apps/web/src/hooks/use-work-orders.ts`, `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`, `apps/web/src/routes/_authenticated/mes/oqc/rules.tsx`, `apps/web/src/routes/_authenticated/mes/readiness-config.tsx`, and `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`. Next: run `bun run format`, re-check `git status`, then re-run `bun scripts/smart-verify.ts`.
- `git add ... apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` failed because `$runNo` expanded in shell (pathspec `.../runs/.tsx`). Next: re-run `git add` with the `$` escaped or quoted.
- `bun scripts/smart-verify.ts` failed again due to Biome import ordering in `apps/web/src/routes/_authenticated/mes/fai.tsx`, `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`, `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`, and `apps/web/src/routes/_authenticated/mes/oqc/rules.tsx`. Next: run `bun run lint -- --write` (Biome check with safe fixes), then re-run `bun scripts/smart-verify.ts`.
- `bun scripts/smart-verify.ts` failed at `check-types` with `FilterFieldDefinition` mismatches in `apps/web/src/routes/_authenticated/mes/runs/index.tsx` (custom filter uses `render` but type doesn't include it; `type` inferred as string) and `apps/web/src/routes/_authenticated/mes/work-orders.tsx` (filter `type` inferred as string). Next: inspect filter field definitions and align with `FilterFieldDefinition` typing (likely `type: "custom"` with proper render function signature), then re-run `bun scripts/smart-verify.ts`.
- Permission audit plan sections for FAI/OQC/defects/rework/trace are updated; Slice 12 still unchecked in worktree note until commit.
- FAI record dialog now hides spec picker and shows a permission hint when missing data-spec permissions; generate-units flow checks `run:authorize`.
- `useUnitTrace` is only used in defects + trace pages now; both pass `enabled` options.
- Permission audit plan now reflects FAI/OQC/defects/rework/trace sections marked complete.
- OQC rules page now gates list + actions by `quality:oqc` with NoAccess fallback.
- FAI page gates data-spec list and shows NoAccess when missing `quality:fai`.
- FAI hooks and OQC rules hooks now accept `enabled` options for permission gating.
- OQC card and table actions are now wrapped with `quality:oqc` permission checks for start/record/complete/view.
- OQC list page now uses `quality:oqc` for page-level NoAccess and gates list/detail queries with `enabled`.
- Rework tasks page now gated by `quality:disposition`; list uses `enabled` guard and page-level NoAccess.
- OQC hooks now accept `enabled` in list/detail/run queries.
- Defects hooks now accept `enabled`; defects page gates list/detail by `quality:disposition` and uses trace query only with `trace:read`.
- Trace hook now supports `enabled`; trace page shows NoAccessCard and gates queries by `trace:read`.
- Verified Permission.RUN_AUTHORIZE and DATA_SPEC_* exist in permissions catalog; FAI page constant names should compile.
- Rule dialog now gates line/route selectors with enabled flags and disables selects without permissions.
- FAI page now references Permission.QUALITY_FAI, DATA_SPEC_READ/DATA_SPEC_CONFIG, and RUN_AUTHORIZE; need to confirm constants exist in permission catalog.
- Permission constants live in `packages/db/src/permissions/permissions.ts` (DATA_SPEC_READ/DATA_SPEC_CONFIG); no `apps/web/src/lib/permissions.ts` path exists.
- Re-read worktree note after context switch; continue Slice 12 (quality + trace gating) and verify permission enum names in FAI page before committing.
- Trace page: useUnitTrace not permission-gated; needs page-level NoAccess for trace:read and query enabled flag.
- Defect/rework hooks: useDefectList/useDefectDetail/useReworkTaskList lack enabled options; useUnitTrace lacks permission-aware options.
- Defects/rework pages: list/detail queries and action buttons lack quality:disposition gating; need page-level NoAccess plus enabled guards.
- useFaiList/useFaiDetail only used in FAI page; safe to add enabled gating there.
- OQC rules hook useOqcRuleList now supports enabled gating; only used by rules page.
- OQC rules page: list query gated by quality:oqc; RuleDialog lines/routes gated and disabled without permission.
- OQC columns/actions: view action now gated; OqcRecordDialog relies on readOnly plus action gating.
- OQC hooks: useOqcList/useOqcDetail now support enabled gating; OqcCard view action gated by quality:oqc.
- OQC page: list/detail now permission-gated with NoAccess; view actions gated; dialogs opened via gated actions.
- FAI hooks: useFaiList/useFaiDetail now support enabled gating; useDataCollectionSpecList already supports enabled gating.
- FAI page: list/detail/run/spec queries now permission-gated; run filter hidden without run:read; run link gated; generate-units guarded by run:authorize; record dialog templates gated by data-spec permissions.
- useStationQueue/useUnitDataSpecs updates only affect execution page and TrackOut dialog (no other call sites).
- Execution hooks: useRunList/useRunDetail/useRunUnits already accept enabled flags; useStationQueue/useUnitDataSpecs updated to support enabled gating.
- Station list/queue endpoints require exec read or exec track-in/out; station queue enforces data-scope and can return 403 with empty queue if station not in scope. Execution page should gate stations/queue by exec permissions and display no-access when missing view.
- Execution plan section (user_docs) shows all execution modules still ⚠️; needs gating for station list, run list, queue, queued units, resolve-unit, and TrackOut dialog specs.
- Execution API permissions: resolve-unit requires exec track-in/out; unit data specs require exec track-out; track-in/out endpoints require exec track-in/out. Station list/queue live in station routes and need permission checks.
- useStations already supports enabled; useStationQueue/useUnitDataSpecs lack enabled options and execution page doesn't pass permission flags. TrackOutDialog always queries unit data specs when open; should be gated by exec track-out permission.
- Execution page uses useStations/useStationQueue/useResolveUnitBySn/useRunList/useRunDetail/useRunUnits without permission-aware enabled gating; needs exec/run permissions to avoid 403s and to decide hide vs NoAccess for queue/forms.
- LineSelect supports disabled/enabled; readiness-config shows NoAccessCard in CardContent when line permissions missing, so slot-config can mirror that gating pattern.
- NoAccessCard supports optional title/description; readiness-config uses it for page-level and module-level gating, so loading pages can mirror this pattern.
- NoAccessCard import path is "@/components/ability/no-access-card"; permission checks use useAbility from "@/hooks/use-ability".
- useRunList and useRouteSearch already accept enabled options, so loading page and mapping dialog can pass permission-gated enabled flags.
- useFeederSlots/useSlotMappings lack permission-aware enabled options; will add to avoid 403s in slot-config.
- Loading page components: ScanPanel uses verify/replace mutations (loading:verify), SlotList unlocks slots (loading:config) and reads expectations (loading:view), LoadingHistory reads records (loading:view); these need permission-aware gating.
- useLoadingExpectations/useLoadingRecords currently only gate by runNo; add enabled options to support permission-aware queries on loading pages.
- Confirmed LOADING permission constants are used in navigation and loading/slot-config pages; will gate loading index modules by run:read + loading:view/verify and config pages by loading:view/config.
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
- apply_patch failed on relative path (file not found); next attempt uses absolute worktree path.
- Attempted to write conversation note with `cat >`, failed due to `zsh: file exists`; next approach: write via `cat >|` or `apply_patch` to overwrite.
- `git add` failed because `$runNo` expanded in path; next approach: quote or escape the path when adding.
- `bun scripts/smart-verify.ts` failed: Biome wants import sorting + formatting in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`; next approach: run `bun run format` or apply suggested import order + formatting, then re-run verify.
- `bun scripts/smart-verify.ts` failed again after format; remaining issue is import ordering in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`; next approach: manually reorder imports to match Biome suggestion, then re-run verify.
