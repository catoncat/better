---
type: worktree_note
createdAt: "2026-01-19T22:08:00.000Z"
branch: "main"
baseRef: "origin/main"
task:
  title: "SMT non-conflict implementation follow-up"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "Track F SMT deep analysis plan"
  triageNote: "User wants to proceed on main; focus on SMT non-conflict plan"
---

# main - SMT non-conflict implementation

## Scope
- Implement the SMT deep analysis non-conflict plan on main branch.
- Prefer record enhancements and data capture; avoid state machine changes unless explicitly required.

## Slices
- [ ] Slice 1: confirm plan scope + map required modules.
- [ ] Slice 2: schema/migration + server API.
- [ ] Slice 3: web UI + hooks.
- [ ] Slice 4: docs/align updates + verification.

## Decisions
- Proceed on main branch (no worktree).

## Findings
- Worktree already has a separate MES execution note; keep this SMT effort in its own note.
- Working tree is clean except for an unrelated untracked conversation note; do not touch it.
- Phase4 Track F defines SMT work packages WP-1..WP-10 with DoD; includes precheck 4.6.1 for field alignment/time-window rules.
- `codex_smt_flow_deep_analysis.md` highlights gaps in time-window control, solder paste lifecycle, stencil/squeegee lifespan, bake records, temperature program records, changeover records, and daily QC/exception reporting.
- Loading schemas/services do not yet expose new fields (`packageQty`, `reviewedBy`, `reviewedAt`) or slot mapping fields (`unitConsumption`, `isCommonMaterial`); API and UI updates are needed for WP-9.
- MES loading UI lives under `apps/web/src/routes/_authenticated/mes/loading/`.
- Loading page uses `ScanPanel` and `SlotList`; new changeover fields likely belong to ScanPanel or related dialogs.
- ScanPanel only captures slot code/barcode/replace reason; no UI for package quantity or reviewer fields.
- Slot mapping dialog only supports materialCode/productCode/routing/priority/isAlternate; missing unit consumption + common-material flags.
- Loading hooks/types do not include `packageQty/reviewedBy/reviewedAt`; slot mapping hooks lack `unitConsumption/isCommonMaterial` inputs.
- Loading service `verifyLoading`/`replaceLoading` create `LoadingRecord` without package qty or reviewer info; schema/response mapping missing those fields too.
- Loading routes derive `operatorId` from body/user; no pass-through for package qty or reviewer fields.
- Slot material mapping create/update handlers do not accept `unitConsumption` or `isCommonMaterial`, and mapSlotMapping omits them.
- SMT align doc currently lists loading verify/replace under “报警/锁定/重试”; no explicit “换料记录增强” row yet.
- Loading records hook exists but no UI renders loading history; WP-9 “换料历史可查询” needs a new table/card.
- Slot mapping table lacks columns for unit consumption/common material; will need to expand columns and colSpan counts.
- `formatDateTime` helper available in `apps/web/src/lib/utils.ts` for loading history timestamps.
- Emoji scan (`rg -nP "\\p{Extended_Pictographic}" domain_docs/mes`) matches existing test/compair docs; no changes made to those files.
- QR-Pro-057 bake record fields: product/material P/N, bake process (PCB/BGA/IC), bake qty, temperature, duration (hours), in-time/date/operator, out-time/date/operator, confirmer.
- API patterns require envelope responses, ServiceResult in services, and audit logging on write routes (`agent_docs/03_backend/api_patterns.md`).
- Navigation lives in `apps/web/src/config/navigation.ts`; new bake record page needs a nav entry.
- No bake-specific permissions exist; closest fit is `READINESS_VIEW/READINESS_CHECK` for view/create.
- `data-collection-spec` module shows pattern for list + create + update with audits; use it as reference for BakeRecord routes.
- List pages should use `DataListLayout` + `FilterToolbar` + card view per `agent_docs/02_frontend/data_list_pattern.md`; reference `mes/runs` page.
- Create/edit dialogs should use TanStack Form + Zod, infer types from Eden inputs, and reset on open/close (`agent_docs/02_frontend/create_edit_dialog.md`).
- Form building rules: Zod schema as source of truth, full-width inputs, selector for relations, fixed validation space (`agent_docs/02_frontend/form_building.md`).
- Date/time input can use `DateTimePicker` component (`apps/web/src/components/ui/datetime-picker.tsx`) with Date ↔ ISO conversion in form state.
- Run list service shows pagination + sorting pattern (page/pageSize, `parseSortOrderBy` fallback, count+findMany).
- Materials list page shows DataListLayout + presets + filters structure; hooks use stable query key and pass query params via Eden.

## Progress
- Added loading record fields and slot mapping fields in server schema/service and web hooks.
- Added ScanPanel inputs for package quantity + reviewer, and new loading history table.
- Expanded slot mapping UI to capture/display unit consumption and common-material flag.
- Updated SMT align doc and marked WP-9 complete in phase4 plan.
- `bun scripts/smart-verify.ts` now passes (lint + typecheck + prisma generate).
- Enforced integer-only `packageQty` in API schema and UI validation/input.
- Reset local SQLite DB via `prisma migrate reset --force`, re-seeded (`bun run db:seed`), then generated migration `20260120011200_add_bake_record`.

## Errors
- `bun run db:migrate -- --name add_bake_record` failed because migration `20260119215430_init` was modified after applied; resolved by resetting DB and re-seeding, then re-running migrate.

## Open Questions
-

## References
- `domain_docs/mes/plan/phase4_tasks.md`
- `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`

## Findings (2026-01-19)
- Dev + small-step-commits skills apply: slice work (schema/api/ui/align) and commit per slice.
- MES doc contract: update plan + align, no emoji in domain_docs/mes; record findings after ~2 reads.
- Use bun scripts/smart-verify.ts for non-doc changes.

## Findings (2026-01-19 continued)
- Phase4 Track F shows WP-2 (4.6.3 烘烤记录) still pending; WP-9 done.
- SMT align file has no BakeRecord entries yet; will need to add API/server/web mapping.

## Findings (2026-01-19 api+list)
- API patterns: envelope responses, ServiceResult in service, audit in routes, TypeBox schemas, transactions for multi-write.
- List pages must use DataListLayout server mode + table+card views with shared field meta; no "全部" preset.

## Findings (2026-01-19 server patterns)
- mes routes registered in `apps/server/src/modules/mes/routes.ts`; new bake module must be `.use()` here.
- OQC routes illustrate audit logging + permission checks; use similar audit pattern for BakeRecord create.

## Findings (2026-01-19 schema)
- BakeRecord model exists in schema with run/material lot optional relations and bake timing fields; indexes on run/material/itemCode/inAt/outAt.

## Findings (2026-01-19 loading)
- loading module uses schema.ts TypeBox for request/response, service maps DB to ISO strings; similar structure for BakeRecord list + create.

## Findings (2026-01-19 permissions)
- No bake-specific permission exists; available choices include READINESS_VIEW/READINESS_CHECK, LOADING_VIEW/VERIFY, QUALITY_*.

## Findings (2026-01-19 web list)
- Runs list page shows DataListLayout + presets + URL-driven filters pattern.
- Readiness exceptions page is older pattern; for BakeRecord list we should use DataListLayout server mode per guidance.

## Findings (2026-01-19 bake form)
- QR-Pro-057 fields: item code, bake process, qty, temperature, duration, in/out time+operator, confirmer.
- DateTimePicker uses Date values; needs ISO conversion when sending to API.

## Findings (2026-01-19 hooks)
- Hooks use Eden client + unwrap; list hooks use queryKey with params and placeholderData; mutations invalidate query keys.

## Findings (2026-01-19 nav)
- Navigation groups include "准备与防错" and "质量管理"; bake records likely fit under "准备与防错" with READINESS_* permission.
- OQC route path guess failed; need to locate actual file path before copying list pattern.

## Findings (2026-01-19 oqc route)
- OQC list page is `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`; use this as DataListLayout reference.

## Findings (2026-01-19 data list)
- OQC list uses DataListLayout with field meta in separate file (`-components/oqc-field-meta.tsx`) to drive table+card views.

## Findings (2026-01-19 audit)
- AuditEntityType is re-exported from db; new BAKE_RECORD enum already added in db package (per schema update).

## Findings (2026-01-19 oqc schema)
- OQC query schemas use page/pageSize numeric defaults and comma-separated status strings; use similar pagination in BakeRecord list.

## Findings (2026-01-19 list services)
- listOqc uses Prisma findMany with skip/take and returns items/total/page/pageSize; route just wraps ok/data.
- Loading routes show list endpoints under `/runs/:runNo/...` with LOADING_VIEW; follow similar permission gating.

## Findings (2026-01-19 material lot)
- No dedicated material-lot select found; integration manual entry uses simple Input for lotId.

## Findings (2026-01-19 material lot schema)
- MaterialLot keyed by materialCode + lotNo; BakeRecord relation exists and can link via materialLotId.

## Findings (2026-01-19 form patterns)
- Create/Edit dialog requires Zod schema with Eden input types; DateTime fields stored as ISO strings.
- Form guide says relationship fields should use selectors, not raw ID; for optional run/material link, prefer safe inputs or treat as plain text if no selector exists.

## Findings (2026-01-19 DataListLayout usage)
- DataListLayout in OQC list uses filterToolbar fields with key/type; viewPreferencesKey reused across filter + view.
- Field meta -> columns via createColumnsFromFieldMeta to share table+card rendering.

## Findings (2026-01-19 cards/columns)
- OqcCard uses field meta for card layout; columns built via createColumnsFromFieldMeta + optional actions column.

## Errors (2026-01-20)
- Failed to overwrite conversation note due to shell noclobber ("file exists"); next attempt will use >| to force overwrite.

## Findings (2026-01-20 audit enum)
- AuditEntityType enum already includes BAKE_RECORD in schema.

## Findings (2026-01-20 schema formats)
- Existing schemas use `t.String({ format: "date-time" })` for timestamps; BakeRecord schemas should match.

## Findings (2026-01-20 query patterns)
- Existing services use `contains` filters without QueryMode; follow same style for BakeRecord search fields.

## Findings (2026-01-20 dialog patterns)
- Dialog forms use TanStack Form + Zod schema with Eden input type satisfaction; reset on close.

## Findings (2026-01-20 numeric fields)
- Optional numeric inputs use `value ?? ""` and `onChange` sets `Number` or `undefined`; follow this for bakeTemperature.

## Errors (2026-01-20 continued)
- Failed to write bake-record-field-meta.tsx because directory `apps/web/src/routes/_authenticated/mes/bake-records/-components` did not exist; next step create directory before writing.

## Findings (2026-01-20 align/plan)
- SMT align section "产线准备/上料/首件/授权" is the correct area to add BakeRecord mapping.
- Phase4 plan still lists 4.6.3 as pending; will mark done after implementation.

## Findings (2026-01-20 utils)
- formatDateTime accepts string or Date; safe for BakeRecord inAt/outAt ISO strings.

## Findings (2026-01-20 route tree)
- `apps/web/src/routeTree.gen.ts` is now modified after adding bake-records route; need to regenerate via router plugin/build step before commit (auto-generated file).

## Findings (2026-01-20 router plugin)
- Web uses TanStack router Vite plugin; route tree generation likely occurs during `bun run dev`/`bun run build` in apps/web.

## Findings (2026-01-20 route tree confirm)
- routeTree.gen.ts already includes bake-records route import and path entries; needs to be committed as generated update.

## Findings (2026-01-20 commits)
- Navigation update landed in `feat(web): add bake record list`; routeTree update isolated in `chore(web): update route tree`.

## Errors (2026-01-20 import order)
- apply_patch failed to reorder imports in bake-records/index.tsx due to mismatched context; will inspect file and reapply with correct context.

## Findings (2026-01-20 import fixes)
- Reordered bake-records index imports to satisfy Biome; bake-record-dialog imports look ordered and type uses bracket notation.

## Errors (2026-01-20 unexpected)
- After running smart-verify, unexpected changes appeared: domain_docs/mes/CONTEXT.md, a new conversation note (2026-01-20_094100_*), and untracked domain_docs/mes/spec/architecture/; pausing for user guidance before proceeding.

## Findings (2026-01-20 productization docs)
- User decision: prioritize current customer needs, defer abstraction; keep SMT-specific tables and use meta fields for extension (conversation/2026-01-20_094100_MES产品化架构决策.md).
- Generalization framework: core vs industry module vs DataCollectionSpec; complex query relations → industry tables, simple form data → DataCollectionSpec.
- Architecture proposal outlines future abstractions (ResourceStatusLog, LineResourceBinding, ProcessRecord) but explicitly marked as future phase only.

## Findings (2026-01-20 smt forms list)
- SMT forms include `锡膏使用记录表QR-Pro-013.xlsx.md` and `温度测量记录表QR-Pro-073.md`; QR-Pro-013 is the solder paste usage sheet for WP-3.

## Findings (2026-01-20 solder paste forms)
- QR-Pro-013 fields include receiving date, expiry, quantity (bottles), paste serial; usage fields: line, thaw date/time, issue date, shift issue time, shift return time, return Y/N, user, remarks.
- QR-Pro-073 is fridge temperature record (0-8℃) with AM/PM time, temperature, operator, reviewer; likely supports paste cold storage compliance.

## Findings (2026-01-20 solder paste current)
- SolderPasteStatusRecord stores lotId, status (COMPLIANT/NON_COMPLIANT/EXPIRED), expiresAt, thawedAt, stirredAt, source, operatorId, meta.
- Integration endpoint `/api/integration/solder-paste-status` accepts lotId/status/expiresAt/thawedAt/stirredAt and writes SolderPasteStatusRecord; uses eventId idempotency.
- Manual entry UI only captures lotId + status + thawedAt/stirredAt/expiresAt; no line, issue/return times, or user/remarks from QR-Pro-013.

## Findings (2026-01-20 skills refs)
- db-prisma-change requires reading `agent_docs/04_data/prisma.md` and using `bun run db:migrate -- --name <change>` for schema updates.
- web-list-page requires DataListLayout server mode with sorting rules (default time desc), see `agent_docs/02_frontend/list_sorting.md`.
- web-form-dialog requires Eden-derived input types + Zod schema; store ISO strings for date/time.

## Errors (2026-01-20 prisma)
- db:migrate failed (P1012): missing opposite relation for `SolderPasteUsageRecord.line`. Next step: add relation field to `Line` model before re-running migration.

## Progress (2026-01-20 wp3 db)
- Added SolderPasteUsageRecord and ColdStorageTemperatureRecord models + AuditEntityType entries; added Line relation.
- Created migration `20260120022915_add_solder_paste_usage`.
