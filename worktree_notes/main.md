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
## 2026-01-21 Findings (Unit generation)
- Units are generated via generateUnits: allowed when Run status PREP or AUTHORIZED; quantity cannot exceed planQty.
- SNs are auto-generated with prefix `SN-${runNo}-` (or custom prefix), numbered sequentially; units start status QUEUED and currentStepNo set to first route step.

## Findings (2025-03-24)
- Ran git status; branch is ahead of origin/main by 7; no local changes shown in short status.
- Using dev skill; next changes are wiring role-management to open read-only dialog for system roles and adjust button label, then run smart-verify.

## Findings (2025-03-24, UI roles)
- role-dialog already has readOnly prop and isReadOnly handling; needs wiring from role-management.
- role-management still shows 编辑 button and likely doesn't pass readOnly for system roles; clone button present.
## 2026-01-21 Findings (Unit API)
- Units are generated via `POST /api/runs/:runNo/generate-units` (requires RUN_AUTHORIZE). Deleting queued units via `DELETE /api/runs/:runNo/units`.

## Findings (2025-03-24, role-management)
- role-management uses handleEdit for all roles; system roles currently show 编辑 button; delete disabled via role.isSystem.
- handleSubmit still allows limited update for system roles, but readOnly UI can prevent edits if wired.

## Findings (2025-03-24, role-dialog)
- RoleDialog supports readOnly: disables inputs, hides save, shows "查看系统角色" title and "关闭" button.
- Still relies on caller to set readOnly for system roles.
- Added execution/trace flow doc: `domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md`.

## Progress (2025-03-24)
- Updated role-management to show system roles as "系统 + 只读" badges, label edit as "查看", and pass readOnly into RoleDialog.
- Committed execution/trace flow doc: "docs: add SMT execution and trace flow guide".
## 2026-01-21 Findings (OQC creation)
- OQC can be created only when Run status is IN_PROGRESS and all units are terminal (DONE/SCRAPPED); eligible units are DONE only.
- OQC creation is idempotent; sampleQty defaults to eligibleCount and must be within range; OQC data stores sampling metadata.

## Errors (2025-03-24)
- git commit failed: "no changes added to commit" (only worktree_notes modified; role-management already clean). Next: verify if role-management changes already in HEAD; proceed without new commit if so.
## 2026-01-21 Findings (OQC trigger + schema)
- OQC trigger: if no applicable sampling rule or sampleSize<=0, run auto-completes (COMPLETED) without OQC; otherwise selects sampled units and creates OQC with sampling metadata.
- OQC item schema includes unitSn, itemName/spec, actualValue, result PASS/FAIL/NA, defectCode, remark; sampling rules support PERCENTAGE/FIXED with priority and active flag.

## Findings (2025-03-24, git state)
- role-management file matches HEAD (no diff); latest commit touching it is cc11f1c (docs commit).
- Only local modification now is worktree_notes/main.md plus untracked doc file.

## Progress (2025-03-24, verify)
- Ran `bun scripts/smart-verify.ts` successfully (biome check, db:generate, check-types).
- Post-verify git status shows unrelated changes: apps/server/src/modules/mes/work-order/service.ts modified, domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md untracked.
- Added OQC/closeout flow doc: `domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md`.

## Findings (2025-03-24, scripts)
- Confirmed role sync script exists: apps/server/scripts/seed-roles.ts
- Added demo data docs: `domain_docs/mes/smt_playbook/04_demo_data/01_demo_dataset_blueprint.md` and `04_demo_data/02_demo_run_recipe.md`.
- Committed demo data docs: "docs: add SMT demo data blueprint and recipe".
- Added validation docs: `domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md`, `05_validation/02_run_and_execution_validation.md`, `05_validation/03_traceability_validation.md`.
- Committed validation docs: "docs: add SMT validation checklists".
## 2026-01-21 Findings (scripts)
- `apps/server/scripts/create-demo-run.ts` creates a DIP demo Run directly in DB (sets AUTHORIZED) and creates Units; uses manual env load from apps/server/.env.
- Existing scripts include `seed-mes.ts`, `test-mes-flow.ts` which may be relevant for demo data generation.
## 2026-01-21 Findings (test-mes-flow)
- `apps/server/scripts/test-mes-flow.ts` exercises end-to-end MES flows via HTTP API, including loading verify steps, readiness waive, FAI create/start/complete, execution tracks, OQC closeout scenarios, and trace verification.
- Script already handles OQC sampling rule creation and closeout paths (happy, fail + MRB), useful as reference for demo dataset and validation payloads.
## 2026-01-21 Findings (mes-flow-test)
- `apps/server/scripts/test-mes-flow.ts` provides API client + CLI for end-to-end flows, including auth and scenario controls.
- There is a `apps/server/scripts/mes-flow-test/` folder with `client.ts` and `index.ts` (likely reusable for scripted flows).
## 2026-01-21 Findings (seed-mes)
- `apps/server/scripts/seed-mes.ts` seeds Line A (SMT) and DIP line, readiness checks, station groups, stations, and defines SLOT-01 with mapping to MAT-001.
- Seed data can be reused as base for SMT demo dataset (line/stations exist).
## 2026-01-21 Findings (readiness data requirements)
- STENCIL readiness requires LineStencil current binding + latest StencilStatusRecord with status READY.
- SOLDER_PASTE readiness requires LineSolderPaste current binding + latest SolderPasteStatusRecord with status COMPLIANT.
- LOADING readiness requires RunSlotExpectation for all slots; missing expectations triggers SLOT_TABLE_MISSING.
## 2026-01-21 Findings (stencil/solder models)
- LineStencil/LineSolderPaste models track current binding (lineId + stencilId/lotId + boundAt + isCurrent).
- StencilStatusRecord requires eventId (unique), eventTime, stencilId, status, source, optional operatorId/tension.
- SolderPasteStatusRecord requires eventId (unique), eventTime, lotId, status, source, optional expiry/thaw/stir timestamps.
## 2026-01-21 Findings (route compile)
- No route versions in `seed-mes.ts`. Route compile is done via API in `test-mes-flow.ts` and `mes-flow-test/index.ts` using `/routes/:routeCode/compile`.
- `apps/server/scripts/seed.ts` uses routingService.compileRouteExecution; `seed-demo.ts` expects existing executableRouteVersion.
## 2026-01-21 Findings (work order via API)
- `test-mes-flow.ts` creates work orders via `POST /integration/work-orders` (woNo, productCode, plannedQty, routingCode, pickStatus), then releases via `/work-orders/:woNo/release`, then creates run via `/work-orders/:woNo/runs`.
## 2026-01-21 Findings (run close)
- Run closeout endpoint is `POST /api/runs/:runNo/close` (requires RUN_CLOSE). It triggers OQC_REQUIRED error if OQC needed.
## 2026-01-21 Findings (material/equipment readiness data)
- Material readiness requires BOM items for WorkOrder.productCode; each BomItem.childCode must exist in Material.
- Equipment readiness checks require TPM equipment records for each station (tpmEquipment.equipmentCode = station.code) with status "normal" and no blocking tpmMaintenanceTask.
- BomItem model uses parentCode/childCode unique with qty/unit.
## 2026-01-21 Findings (stencil/solder entities)
- No Stencil/SolderPaste master models in schema; line bindings use raw `stencilId` and `lotId` strings with status records referencing those IDs.
## 2026-01-21 Findings (run creation location)
- Run creation logic lives in `apps/server/src/modules/mes/work-order/service.ts` (createRun), not in run service.
## 2026-01-21 Findings (run create schema)
- Run creation API requires `lineCode` and `planQty`; runNo is generated server-side as `RUN-${woNo}-${Date.now()}`.
## 2026-01-21 Findings (permissions)
- Permission values use `exec:track_in` and `exec:track_out` (underscore), not hyphen.
- Integration endpoint requires `system:integration` permission; run close uses `run:close`, route compile uses `route:compile`.
## 2026-01-21 Findings (closeRun behavior)
- `closeRun` only works when Run status IN_PROGRESS and all units terminal; if OQC triggered, returns error code `OQC_REQUIRED` (409) with task created.

## Findings (2026-01-21)
- Loaded dev and small-step-commits skills: must keep slices/commits, call out dirty tree, update worktree notes after reads, and keep MES doc contract intact.

## Findings (2026-01-21 continued)
- test-mes-flow.ts provides API-driven end-to-end flow with CLI options and can be a base for SMT demo dataset script.
- mes-flow-test/index.ts shows Prisma + API hybrid setup but is less reusable (uses direct DB upserts). Prefer API-first for demo script.

## Findings (2026-01-21 demo data)
- Demo dataset docs target realistic SMT codes: line SMT-A, route SMT-BOT-标准路由, product 5223029018, slots 2F-46/2F-34/1R-14/1F-46, materials 5212090001/0001B/0007/8001/8004 with lot barcodes.
- Demo recipe expects loading PASS/WARNING/FAIL+lock, unlock, replace flow, FAI pass, run authorize/track, OQC trigger, trace.

## Findings (2026-01-21 seed)
- seed-mes.ts upserts SMT/DIP lines, stations, groups, and enables full readiness checks on LINE-A (ROUTE/LOADING/EQUIPMENT/MATERIAL/STENCIL/SOLDER_PASTE).
- Loading slot-config endpoints are not referenced in server modules (no slot-config string), so demo dataset script can safely use Prisma upserts for config data.

## Findings (2026-01-21 equipment schema)
- Prisma TpmEquipment keyed by equipmentCode with status string; no direct stationId field.
- TpmMaintenanceTask keyed by equipmentCode+status; readiness likely ties station meta to equipmentCode.

## Findings (2026-01-21 readiness)
- Readiness checks are gated by line.meta.readinessChecks.enabled; performCheck calls checkEquipment/material/route/stencil/solder_paste/loading in parallel and marks run FAILED if any item failed.

## Findings (2026-01-21 readiness equipment)
- checkEquipment uses station.code as equipmentCode lookup in tpmEquipment; equipment.status must be "normal" and no blocking tpmMaintenanceTask (type REPAIR/CRITICAL/breakdown, status PENDING/IN_PROGRESS).
- To satisfy readiness for SMT-A, need tpmEquipment rows for each station.code.

## Findings (2026-01-21 operations)
- Operation model requires code, name, defaultType (StationType). Use upsert for PRINTING/SPI/MOUNTING/REFLOW/AOI.
- Routing model includes productCode + processType (default SMT), and needs routing steps referencing operation + stationGroup.

## Findings (2026-01-21 slots)
- FeederSlot requires lineId, slotCode, position; unique on (lineId, slotCode).
- SlotMaterialMapping ties slotId + materialCode (unique), optional productCode/routingId, flags for alternate/common.

## Findings (2026-01-21 materials)
- Material requires code + name; MaterialLot unique on (materialCode, lotNo).
- BomItem requires parentCode + childCode + qty; readiness check uses BomItem for parent product.

## Findings (2026-01-21 stencil/paste)
- LineStencil and LineSolderPaste bind lineId to stencilId/lotId (no foreign key to Stencil); readiness check uses LineStencil+StencilStatusRecord (status READY) and LineSolderPaste+SolderPasteStatusRecord (status COMPLIANT).
- StencilStatusRecord requires eventId, eventTime, stencilId, status, source (IntegrationSource). SolderPasteStatusRecord requires eventId, eventTime, lotId, status, source.

## Findings (2026-01-21 OQC rule)
- OqcSamplingRule supports productCode/lineId/routingId targeting; samplingType (PERCENTAGE/FIXED) and sampleValue required.
