# Worktree Notes - main

## Context
- Task: address two items in `todo.md` for work order list UX (table layout and filters).
- Constraints: stay on `main`, no worktree, ignore existing dirty changes (user will handle).

## Slices
- [x] Slice 1: Fix work order list table layout so actions column stays visible without horizontal scroll.
- [x] Slice 2: Add picking status filter and consider other important filters/sorting.

## Findings
- `todo.md` lists two issues: table has too many columns causing horizontal scroll; need picking status filter and consider other key filters/sorting.
- Work order list UI is in `apps/web/src/routes/_authenticated/mes/work-orders.tsx` using `DataListLayout` with filters: search, status, routingId; presets include ERP pick status but no filter field for it yet.
- Table columns are generated from `workOrderFieldMeta` (woNo, productCode, workshop, routingName, routing, plannedQty, pickStatus, status, dueDate, createdAt) plus an actions column appended at the end.
- `DataListLayout` wraps `DataListView` and `FilterToolbar`; supports view preferences key and table meta but no explicit column pinning here.
- `DataListView` renders `DataTable` for desktop; `DataTable` is a plain table without sticky/pinning handling.
- `Table` wraps a div with `overflow-x-auto`, and `TableCell`/`TableHead` use `whitespace-nowrap`, so wide columns force horizontal scroll.
- `DataListFieldMeta` supports `tableHidden` to omit columns from the table (still usable for cards).
- Work order list query supports `erpPickStatus` filter; server service handles it by filtering ERP pick status (no separate pickStatus filter in query).
- Server list filter treats `erpPickStatus` as shared pick-status filter: ERP orders filter on `erpPickStatus`, manual orders filter on `pickStatus` when `erpStatus` is empty.
- `FilterToolbar` includes `DataTableViewOptions`, so users can toggle column visibility for columns that allow hiding.
- `WorkOrderCard` builds detail rows from `workOrderFieldMeta` `cardDetail` fields; adding `cardDetail` will surface fields on cards even if hidden in table.
- Pick status values are standard "1"–"4"; there are dialogs/components already using these values.
- Pick status option labels are defined in both pick-status and receive dialogs; can reuse same labels for filter.

## Progress
- Added sticky action column support and reduced work order table column width (hidden routing name, truncated product/routing).
- Added pick status filter options to work order list toolbar.

## Errors
- Failed to read `apps/web/src/components/data-list/field-meta.tsx` (file not found). Next: locate actual path via `rg --files` and open correct file.
- Failed to overwrite conversation note due to `noclobber` (file exists). Next: re-run with `>|` to force overwrite.

---

## Context (2026-01-20)
- Task: add MES 产线管理（Line master data）UI + API + permissions; expose CRUD and processType management in UI.
- Constraints: stay on `main`, ignore unrelated dirty changes (user will handle).

## Findings (2026-01-20)
- `apps/server/src/modules/mes/line/schema.ts` uses `ProcessType` at runtime; user saw export error previously. `@better-app/db/prismabox` provides `ProcessType` TypeBox schema if needed.
- Process type mismatch errors in work-order service already include UI guidance.
- Delete guard checks dependencies: station, run, user bindings, feeder slots, stencil bindings, solder paste bindings/usage, OQC rules.

## Progress (2026-01-20)
- Added LINE_CONFIG permission; admin/engineer granted.
- Added line list/get/create/update/delete + process-type patch endpoints with audit logging.
- Added 产线管理 list page, filters/presets, create/edit dialog, navigation entry.
- Updated MES plan + align docs; regenerated route tree.
- Switched line/routing ProcessType schemas to use Prismabox to avoid runtime export issues.
- Fixed type errors from smart-verify (dependency count typing, filter typing, zod schema typing).
- Adjusted line dialog form typing + process type label formatting to reduce TS errors.
- Fixed line dialog/page formatting and hook dependency lint warnings.

## Open Questions (2026-01-20)
- Whether to fix unrelated lint error in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` to pass `smart-verify`.

## Errors (2026-01-20)
- `bun scripts/smart-verify.ts` failed on line dependency typing and line dialog `satisfies` usage; fixed and queued for rerun.
- `bun scripts/smart-verify.ts` failed on Biome formatting for `line/service.ts`; fixed formatting.
- `bun scripts/smart-verify.ts` failed on line dialog schema typing + processType filter typing; fixed by restoring `satisfies` and narrowing processType.
- `bun scripts/smart-verify.ts` failed on Biome import order in `apps/server/src/modules/mes/routes.ts`; reordered imports.
- `bun scripts/smart-verify.ts` now fails due to pre-existing typecheck errors (server implicit any + missing smt-basic routes, many web implicit any/unknown).

## 2026-01-21 Findings
- User report: POST /api/loading/verify returns MATERIAL_LOT_NOT_FOUND for barcode MAT-001 (payload includes runNo RUN-WO-DEMO-SMT-001-1768879491318, slotCode SLOT-01).
- Repo is dirty; need worktree/stash/commit decision before changes.
- In `apps/server/src/modules/mes/loading/service.ts`, verifyLoading only creates material lots when barcode parses to materialCode+lotNo; otherwise it looks up by lotNo only and returns MATERIAL_LOT_NOT_FOUND if none.
- For non-parsed barcodes like MAT-001, expected behavior is pre-existing `materialLot` row with `lotNo = MAT-001` (or parse logic must recognize it).
- parseMaterialLotBarcode only parses when barcode contains a configured separator; MAT-001 likely won't parse, so verifyLoading falls back to lookup by lotNo.
- BARCODE_SEPARATORS are ["|", ":", "@", "#"], so barcode like MAT-001 won't parse into materialCode+lotNo.
- DATABASE_URL points to sqlite `data/db.db`.
- Prisma model `MaterialLot` uses fields `materialCode` + `lotNo` (unique); no single-field lotNo uniqueness.
- DB check: no MaterialLot rows with lotNo = MAT-001.
- Run RUN-WO-DEMO-SMT-001-1768879491318 exists, status PREP, lineId cmklybjjs0006cr1nuwc4p3f2.
- FeederSlot SLOT-01 exists for line; expectation for run+slot expects material code MAT-001, status PENDING.
- Docs: loading barcode format is "物料编码|批次号" (example MAT-001|LOT-2024-001). Slot config uses FeederSlot + SlotMaterialMapping (slotId + productMaterialCode -> materialCode).
- API overview includes Loading config endpoints: feeder slots and slot mappings; loading verify/replace is separate from loading config.
- Traceability contract requires loading summary in trace output with slot/material/lot/time.
- Prisma: FeederSlot has lineId+slotCode unique; SlotMaterialMapping maps slotId + materialCode with optional productCode/routingId, plus priority/alternate/common flags. RunSlotExpectation stores expectedMaterialCode per run+slot.

## Findings (2026-01-21 Role Management)
- Role management UI is in `apps/web/src/routes/_authenticated/system/role-management.tsx` and uses `RoleDialog` for create/edit.
- `RoleDialog` disables code/permissions edits when `role` is provided; cloning should use `initialValues` with `role` unset to keep fields editable.

## Progress (2026-01-21 Role Management)
- Ran `bun apps/server/scripts/seed-roles.ts` with DATABASE_URL to upsert preset roles in DB.
- loadSlotTable creates RunSlotExpectation rows for run+slot with expectedMaterialCode + alternates based on SlotMaterialMapping (filtered by productCode/routingId), status=PENDING. It deletes existing expectations for the run first.
- loadSlotTable fails if loading already started (LoadingRecord exists) or if any slots lack mappings.
## 2026-01-21 Findings (SMT example data)
- Lines in DB: LINE-A (SMT Production Line A), LINE-DIP-A (DIP Production Line A).
- FeederSlot entries: one slot SLOT-01 on LINE-A (slotName Feeder Slot 01, position 1).

## SMT Docs Plan (2026-01-21)
- Slice 1: Create new folder `domain_docs/mes/smt_playbook/` with README, scope/terms, and data sources/ownership overview.
- Slice 2: Configuration docs (lines/slots, material lots, slot mappings, routes/products).
- Slice 3: Flow docs (load table, scan/verify, replace, FAI, execution, OQC/closeout) with data generation + management per step.
- Slice 4: Demo data recipes + validation checklists (detailed steps).
- Created new SMT docs folder `domain_docs/mes/smt_playbook/` with README, scope/terms, data sources/ownership, and initial configuration docs (lines/slots, materials/lots, slot mappings).
- Committed docs slice: "docs: add SMT playbook scaffold and initial config docs".
## 2026-01-21 Findings (Routing)
- Routing Engine: Run binds a frozen ExecutableRouteVersion snapshot at creation; run uses routeVersionId for stable execution/traceability.
- Routing selection prioritizes explicit WorkOrder routingId, otherwise productCode + effective range + active; requires READY executable version.
- Execution semantics (station types, gates) are MES-owned via RouteExecutionConfig; ERP routing sequence is read-only.
- Added routes/products config doc: `domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md`.
- Committed routes/products config doc: "docs: add SMT routes and products configuration guide".
- Added run-flow docs: work order → run (`03_run_flow/01_work_order_to_run.md`) and readiness/prep (`03_run_flow/02_readiness_and_prep.md`).
- Committed run-flow docs slice: "docs: add SMT work order and readiness flow".
## 2026-01-21 Findings (Loading flow details)
- verifyLoading: requires Run PREP + lineId + operatorId; checks slot, expectation; if expectation already LOADED, returns idempotent record when same material is scanned, else SLOT_ALREADY_LOADED and requires replace.
- verifyLoading: on mismatch increments failedAttempts and locks slot when >=3; sets expectation status MISMATCH; records LoadingRecord status UNLOADED with failReason.
- replaceLoading: requires Run PREP + operatorId + reason + expectation status LOADED; marks previous LOADED records as REPLACED with unloadedAt/By; creates new LoadingRecord (LOADED or UNLOADED) and writes meta.replaceReason; mismatch clears loadedMaterialCode and can lock after 3 failures.
- Added loading flow doc: `domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md`.
- Committed loading flow doc: "docs: add SMT loading flow guide".
## 2026-01-21 Findings (FAI flow details)
- FAI creation requires Run PREP and latest formal readiness check PASSED; rejects if active FAI exists or sample units insufficient.
- FAI lifecycle: Inspection status PENDING → INSPECTING → PASS/FAIL; creation stores sampleQty, passedQty/failedQty, remark.
- FAI gate uses route steps requiring FAI; run authorization checks FAI passed if required.
## 2026-01-21 Findings (FAI trial/complete)
- FAI trial summary is built from Track records created after FAI start; requires outAt not null and uses sampleQty to pick units.
- Completing FAI requires INSPECTING status, trial completed, and counts validation; PASS blocks if any SPI/AOI inspection FAIL exists for the run.
- Added FAI flow doc: `domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md`.
- Committed FAI flow doc: "docs: add SMT FAI flow guide".
## 2026-01-21 Findings (Trace output)
- Trace API returns unit, route + frozen routeVersion, steps, tracks, dataValues, inspections, loadingRecords, materials; mode defaults to run/frozen.
- Trace contract requires including route identity and frozen route version to prevent historical drift.
