# Worktree Notes - main

## Context (2026-01-23)
- Task: SMT Gap Phase 1 (T1.1.8) — prep record run/step association (DB already landed) + backend write rules + readiness prefers run-level evidence.
- Recent commits:
  - `94f0ff9` docs(mes): align SMT gap plan with as-built
  - `5f0c394` feat(db): add prep record run links
- Current WIP (uncommitted): update MES prep record endpoints (bake/solder-paste/smt-basic) to accept `runNo` and/or `routingStepId`, resolve to `runId` and validate line/routing ownership; readiness service updated to prefer `runId=run.id` evidence with `runId=null` fallback.
- Note: working tree also contains extra unrelated changes (server entry/test harness + scripts). Decide to revert or split into a separate commit before merging.

## Context (2026-01-22)
- Task: Track A readiness extension — implement PREP_* checks in readiness, enforce waiver runNo integrity, and gate auto-precheck in UI; update MES align docs accordingly.
- Constraints: stay on `main` unless user requests worktree; keep alignment docs in sync.

## Slices (2026-01-22)
- [x] Slice 1: Implement PREP_* readiness check evaluation and integrate into performCheck.
- [x] Slice 2: Enforce waiver runNo consistency (service + route/audit) and add test coverage if feasible.
- [x] Slice 3: Gate auto-precheck by permission and update MES impl align docs.

## Findings (2026-01-22)
- PREP_* readiness item types exist in schema/config/UI, but readiness service does not execute PREP checks.
- Waive endpoint uses runNo in route but service only validates itemId; risk of mismatched auditing.
- Run detail auto-precheck runs for PREP without permission gating; can produce 403 noise.
- Plan references `smt_gap_task_breakdown.md` Track A with PREP readiness checks + waiver; current implementation appears incomplete for PREP evaluation.
- Impl align `01_e2e_align.md` maps readiness check + exceptions/waive; will need update once PREP checks and waive behavior are adjusted.
- Prisma schema includes BakeRecord, SolderPasteUsageRecord, StencilCleaningRecord, SqueegeeUsageRecord, PrepCheck models to support PREP_* checks.
- PREP-related records store lineId and key timestamps (e.g., BakeRecord.runId/materialLotId, SolderPasteUsageRecord.lineId/issuedAt, StencilCleaningRecord.lineId/cleanedAt, SqueegeeUsageRecord.lineId/recordDate), which can be used to validate per-run readiness by line association.
- BakeRecord supports optional runNo and material lot linkage; create API enforces in/out timestamps and can associate runId/materialLotId.
- SolderPasteUsageRecord has lineId + issuedAt/thawedAt/receivedAt; create API maps by lineCode and validates timestamps.
- SMT basic service exposes StencilCleaningRecord/SqueegeeUsageRecord with lineId + cleanedAt/recordDate fields suitable for readiness checks.
- SMT basic service list/create flows for stencil usage/cleaning/squeegee require lineCode resolution and store recordDate/cleanedAt with lineId for filtering.
- Existing readiness checkStencil uses LineStencil binding + latest StencilStatusRecord READY gate; PREP_STENCIL_* should avoid duplicating this check.
- Existing readiness checkSolderPaste uses LineSolderPaste binding + latest SolderPasteStatusRecord COMPLIANT gate; PREP_PASTE should focus on usage/records rather than status.
- No fixture model or server module found for SMT prep; fixture-related docs exist mostly in DIP playbook and gap reports, implying PREP_FIXTURE will need placeholder logic.
- Solder paste usage UI only requires lotId; other timestamps are optional, so prep check should not require thaw/issue timestamps to avoid false failures.
- Run detail auto-precheck now gated by READINESS_CHECK (prevent permission-related precheck attempts).
- Waive service now validates runNo against item check runId to prevent mismatched waive requests.
- Plan doc references updated to Line.meta.readinessChecks (no smtPrepChecks).
- Bake record UI treats runNo/materialCode/lotNo as optional, so PREP_BAKE check should not assume run linkage only.
- Current diff set includes FAI route tweaks, test script additions, and doc updates beyond readiness changes; will need commit grouping.
- Prep item policy sample indicates PREP_* should be SOFT gates with recordRequired and evidenceRefType; PREP_FIXTURE expected from TPM maintenance (FIXTURE_MAINT).
- Architecture doc sketches future ResourceType including SQUEEGEE/FIXTURE and unified resource status log (not implemented).
- Bake, stencil usage/cleaning, and squeegee usage APIs require READINESS_CHECK permission for record creation (used by readiness PREP checks).
- Solder paste usage + cold storage temperature record APIs also require READINESS_CHECK (align with prep record entry).
- test-mes-flow includes "readiness-waive" scenario that can be extended for PREP_* coverage.
- Docs updates shift FAI requirements from multi-sign to single-sign across plan/architecture/analysis docs.

## Progress (2026-01-22)
- Added PREP_* readiness checks based on bake/paste/stencil usage/cleaning/squeegee records and fixture placeholder.
- Waive API now validates runNo ownership; auto-precheck gated by READINESS_CHECK.
- Updated E2E impl align row for readiness precheck/formal endpoints and plan doc references.
- Ran `bun scripts/smart-verify.ts` (biome + typecheck) successfully.
- Extended readiness-waive test scenario to expect PREP_* item types and waive all failed items.
- Readiness-waive verification now checks per-item waiver by id instead of per-type, avoiding false negatives when some types pass.
- Re-ran `bun scripts/smart-verify.ts` after test updates (biome + typecheck) successfully.

## Errors (2026-01-22)
- `domain_docs/mes/plan/phase3_tasks.md` not found. Next: use `domain_docs/mes/plan/tasks.md` or `smt_gap_task_breakdown.md`.
- `git add ... apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` failed because `$runNo` expanded in shell. Next: quote the path.

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
## Findings (permission audit doc cleanup)
- `domain_docs/mes/permission_audit.md` uses emoji markers in the role × page matrix; needs plain-text status labels.
## Findings (mes emoji scan)
- Replaced remaining emoji and pictographic arrows across `domain_docs/mes` with ASCII labels/arrows to satisfy no-emoji rule.
## Errors (permission audit doc cleanup)
- `python` not available in shell; switched to `perl` for emoji replacement.
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

## Findings (2026-01-21 routing)
- RoutingStep requires routingId, stepNo, operationId, stationType, optional stationGroupId; unique on (routingId, stepNo).
- ExecutableRouteVersion created by compile endpoint; run creation requires latest READY version.

## Findings (2026-01-21 run create)
- /work-orders/:woNo/runs requires body { lineCode, planQty } (planQty mandatory).
- Work order receive payload includes woNo, productCode, plannedQty, routingCode, pickStatus.

## Findings (2026-01-21 test flow)
- test-mes-flow.ts covers loading load-table + verify, readiness checks, FAI creation, authorize, track-in/out, OQC sampling rule creation, and trace verification; can adapt endpoint usage for SMT demo dataset.

## Errors (2026-01-21)
- rg -n "compile" apps/server/src/modules/mes/route failed: path not found. Next: search under apps/server/src/modules/mes for route modules by name.

## Findings (2026-01-21 routing compile)
- compileRouteExecution fails if steps missing stationGroupId/allowedStationIds; ensure routing steps set stationGroupId for demo route.

## Findings (2026-01-21 integration enums)
- IntegrationSource enum only has AUTO and MANUAL (use AUTO for stencil/paste status records).

## Findings (2026-01-21 enums/station)
- StencilStatus READY; SolderPasteStatus COMPLIANT; use IntegrationSource.AUTO.
- Station requires code + name + stationType; optional lineId/groupId for line linkage.

## Findings (2026-01-21 integration work order)
- Integration POST /work-orders calls receiveWorkOrder (unknown upsert behavior). If woNo exists, behavior must be checked in receiveWorkOrder.

## Findings (2026-01-21 receive work order)
- integration/service receiveWorkOrder uses Prisma upsert on woNo, so re-running work order receive is idempotent.

## Findings (2026-01-21 OQC schemas)
- OQC sampling rule create expects samplingType PERCENTAGE/FIXED and sampleValue; OQC task create sampleQty optional.
- OQC item payload requires unitSn + itemName + result (PASS/FAIL/NA); completion requires decision PASS/FAIL.

## Findings (2026-01-21 run units)
- POST /runs/:runNo/generate-units uses generateUnitsSchema; permission RUN_AUTHORIZE.

## Findings (2026-01-21 generate units)
- generateUnitsSchema: { quantity, snPrefix? }; response includes generated count and list of units with sn/status.

## Findings (2026-01-21 unlock)
- /feeder-slots/:slotId/unlock requires body { reason } and operatorId from auth context (service uses operatorId for audit).

## Findings (2026-01-21 loading schema)
- /loading/verify body { runNo, slotCode, materialLotBarcode, operatorId?, packageQty? }.
- /loading/replace body { runNo, slotCode, newMaterialLotBarcode, operatorId?, reason, packageQty? }.

## Findings (2026-01-21 verifyLoading)
- verifyLoading returns errors (RUN_STATUS_INVALID, SLOT_LOCKED, SLOT_EXPECTATION_MISSING, MATERIAL_LOT_NOT_FOUND, etc.) as { success: false } and increments failedAttempts/locks slot on repeated failures.
- It allows idempotent re-scan if expectation already LOADED with same material.

## Findings (2026-01-21 loading routes)
- Loading verify endpoint is under /loading/verify; feeder slot unlock uses /feeder-slots/:slotId/unlock (separate module).

## Findings (2026-01-21 validation docs)
- Validation docs list endpoints but lack request payload examples; add concrete JSON bodies for load-table, verify, replace, unlock, run create, generate-units, readiness, FAI, authorize, track-in/out, OQC.

## Errors (2026-01-21 appendix)
- sed domain_docs/mes/smt_playbook/99_appendix/01_entity_to_table_map.md failed: file not found. Next: list files under domain_docs/mes/smt_playbook to locate appendix structure.

## Findings (2026-01-21 appendix)
- Appendix mapping file missing; need to create 99_appendix/01_entity_to_table_map.md with validation step → Prisma models/fields. LoadingRecord model starts at schema.prisma line ~519.

## Findings (2026-01-21 loading record fields)
- LoadingRecord fields include runId, slotId, materialLotId, materialCode, expectedCode, status, verifyResult, failReason, loadedAt/loadedBy, packageQty, reviewedBy/At, meta.
- Unit model located around schema.prisma line ~946 for execution mapping.

## Findings (2026-01-21 unit/track)
- Unit fields: sn, woId, runId, status, currentStepNo; Track fields: unitId, stepNo, stationId, inAt/outAt, result, operatorId.
- Inspection model located around schema.prisma line ~1099.

## Findings (2026-01-21 inspection/readiness)
- Inspection fields include runId, type, status, sampleQty, decidedBy/At; InspectionItem includes unitSn, itemName, result, defectCode.
- ReadinessCheck and ReadinessCheckItem models located around schema.prisma lines ~1058/1076.

## Findings (2026-01-21 readiness fields)
- ReadinessCheck fields include runId, type, status, checkedAt/By; ReadinessCheckItem includes itemType, itemKey, status, failReason, evidenceJson, waivedBy.
- Run model located around schema.prisma line ~378.

## Findings (2026-01-21 run fields)
- Run fields: runNo, woId, lineId, routeVersionId, planQty, status, startedAt/endedAt; links to readinessChecks, inspections, units, slotExpectations, loadingRecords.
- WorkOrder model located around schema.prisma line ~358.

## Findings (2026-01-21 wo/expectations)
- WorkOrder fields: woNo, productCode, plannedQty, routingId, status, pickStatus, meta.
- RunSlotExpectation fields: runId, slotId, expectedMaterialCode, alternates, status, loadedMaterialCode/At/By.

## Findings (2026-01-21 seed request)
- Available server scripts include seed.ts, seed-demo.ts, seed-roles.ts, seed-mes.ts, and smt-demo-dataset.ts; need to pick the baseline seed that creates users/roles before demo data.

## Findings (2026-01-21 seed script)
- apps/server/scripts/seed.ts resets all tables (sqlite only) and seeds roles, admin user, test users, system config, MES master data, route versions, and demo WOs/Runs/Units.
- seed.ts is the comprehensive seed script that creates users/roles and cleans DB with safety checks.

## Findings (2026-01-21 server)
- apps/server/scripts/dev-server.ts runs bun --watch src/index.ts with auto-restart; useful if we need the API running for smt-demo-dataset.ts.

## Errors (2026-01-21 smt demo run)
- bun apps/server/scripts/smt-demo-dataset.ts failed: DATABASE_URL required by @better-app/db import. Cause: static import of prisma before dotenv config runs. Next: switch to dynamic import (like seed.ts) so env is loaded before db init, then retry.

## Findings (2026-01-21 api url)
- apps/server/.env does not define PORT or MES_API_URL; server defaults to port 3000 unless overridden.

## Findings (2026-01-21 ports)
- Port 3000 is already in use by a bun process; port 3001 is used by a node process (likely web). We'll start a separate API server on a different port for the demo script.

## Findings (2026-01-21 permissions)
- PRESET_ROLES: admin lacks route:compile and wo:receive; engineer has route:compile; planner has wo:receive; leader has run create/authorize/track; quality has FAI/OQC.

## Progress (2026-01-21)
- Ran bun apps/server/scripts/seed.ts (DB reset + roles/users + MES seed).
- Ran smt-demo-dataset.ts against API on port 3100; created run RUN-WO-20250526-001-1768978028478 with FAI/OQC IDs in output.

## Findings (2026-01-21 compair docs)
- smt_flow_comparison_report.md outlines gaps: our system is state-machine driven vs customer’s form-driven SMT flow; highlights missing lifecycle tracking for solder paste/stencil/temperature/fixture maintenance, and suggests phased roadmap.
- smt_form_collection_matrix.md is a blank capture matrix for each form’s data source, gate type, signature, and backfill policy; includes global gate/signature/time rules to confirm.

## Findings (2026-01-21 smt form confirmation)
- SMT 表单采集确认表.md is a completed matrix: each form has data source (terminal/PDA/TPM/设备), gate behavior, signature policy, and backfill rules; many items are non-gating but require system judgment; FAI form requires signature.
- Confirmation section clarifies: forms are integrated into process steps (not standalone), time rules are alerts (not hard blocks), waiver authority is Factory Manager, barcode coverage is full, and data strategy is manual-first then automation.

## Findings (2026-01-21 solder/bake modules)
- Server has solder-paste module with list/create APIs for SolderPasteUsageRecord and ColdStorageTemperatureRecord; not linked to readiness or gating rules yet.
- Server has bake module with list/create APIs for BakeRecord (PCB/parts baking) but not referenced in readiness checks.
- Stencil integration endpoints exist (stencil status receive; line stencil bind/unbind) and readiness check uses LineStencil + StencilStatusRecord.

## Findings (2026-01-21 bake/solder routes)
- Solder paste usage and cold storage temperature routes exist (list/create) gated by READINESS_VIEW/READINESS_CHECK permissions; no link to readiness gate logic.
- Bake record routes exist (list/create) gated by READINESS_VIEW/READINESS_CHECK; also not referenced in readiness or run authorize.

## Findings (2026-01-21 mes routes)
- mes routes include bakeRecordRoutes and solderPasteUsageRoutes/coldStorageTemperatureRoutes, so APIs exist but are not wired into readiness gating or form-level workflow.

## Findings (2026-01-21 bake/solder schema)
- Bake record schema captures itemCode, process, qty, temperature, duration, in/out times and operators; aligns with QR-Pro-057 but is not used as readiness gate.
- Solder paste usage schema tracks received/expires/thawed/issued/returned timestamps; cold storage temperature schema logs measuredAt/temp/reviewedBy.

## Findings (2026-01-21 defects/rework)
- Defect + rework APIs exist (create defect, assign disposition, complete rework), but not a specific repair form workflow; can partially map to QR-Pro-012 repair records.

## Findings (2026-01-21 data collection)
- Data collection spec module provides CRUD for specs, but no direct linkage to specific SMT forms; usage depends on configuring RouteExecutionConfig dataSpecIds (not present for confirmed forms).

## Progress (2026-01-21)
- Wrote gap analysis report for SMT form confirmation vs implementation: domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md.

## Findings (2026-01-22 prep gating)
- User confirmed prep completion requires all items meet criteria; items marked 门禁=No still require records and allow continue with alert/waiver.

## Findings (2026-01-22 design suggestions)
- Confirmation table defines prep completion as all items meet criteria; non-gate items still require record with alert/waiver allowed.
- Gap report highlights missing soft-gate engine, time-rule alerts, waiver role, and several form-specific data captures.

## Progress (2026-01-22)
- Added design suggestions doc for SMT gap closure: smt_gap_design_suggestions.md.

## SMT gap design suggestions review (quick)
- Possible conflict: "仅记录(RECORD)" says "提示(可选)"; user clarified non-gating still must be recorded and should be confirmed/recorded, not optional. (domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:15)
- Potential overreach: assumes water-wash timing rule applies universally; should be route/product-specific or optional if no wash step exists. (domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:65-67)
- Role design risk: introduces "Factory Manager" without mapping to existing RBAC/permissions; may conflict with current role model. (domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:75-77)
- Duplication risk: new PrepCheck/PrepItemRecord vs existing Readiness and audit/waive flows; clarify single source of truth to avoid split logic. (domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md:19-39)

## Error log
- Attempt: write conversation note with `cat >` failed due to noclobber ("file exists"). Next: overwrite using `cat >|`.

## SMT docs alignment (decision supplements)
- Confirm table still mentions Factory Manager and global wash rule; needs update to route/step-specific + reuse roles.
- Gap report global rules section needs same decision supplements (record must exist; auto vs manual; role mapping).

## Plan files lookup
- phase3_tasks.md not found; plan files include tasks.md, phase4_tasks.md, smt_gap_task_breakdown.md, 01_milestones.md.

## SMT plan doc review
- smt_gap_task_breakdown.md already has risk/acceptance notes matching decisions; may need explicit updates for record-required & role mapping details; confirm where to track status in plan docs.

## SMT plan doc updates
- Added confirmed implementation constraints and Phase 1 acceptance note in smt_gap_task_breakdown.md; aligned phase4_tasks time-window items to route/step scope + alert/waive.

## SMT config design confirmed
- Documented config list strategy in smt_gap_design_suggestions.md; updated smt_gap_task_breakdown.md to add config template tasks and hybrid storage note.

## Review notes: smt_gap_task_breakdown
- Found references to PrepItemRecord in T2.2 and T3.5, which may conflict with decision to use Readiness as single source of truth.

## Review notes: prep record references
- T2.2/T3.5 explicitly write PrepItemRecord, which conflicts with the decision to keep Readiness as the single source of truth.

## Review notes: line refs
- T2.4 assumes trigger event exists (回流焊完成) but no explicit task to capture event/scan point; may need a task in Track C. Line 130.
- PrepItemRecord references confirmed at lines 128/209.

## Patch prep
- Need to insert 1.1.5 recordRequired enforcement, replace T2.2 PrepItemRecord with Readiness update, add 2.2.5 event capture, and update T3.5 to DataValue/Readiness evidence.

## Review line refs updated
- Updated line refs for T2.2 (129), T2.4 (131), T2.2.5 (145), T3.5 (211).

## Emoji cleanup needed
- smt_gap_task_breakdown.md contains ⚠️ and ▶ (extended pictographic); replace with ASCII to satisfy doc contract.

## Emoji cleanup done
- Extended pictographic check now returns no matches for smt_gap_task_breakdown.md.

## Plan updates applied (review fixes)
- Added config override + PREP enable strategy tasks under T1.1.
- Added idempotency/duplication handling for device ingest (T3.5 + subtasks).

## Decision confirmed (config design)
- User reconfirmed config strategy (hybrid config, route/step scope, reuse roles). Updated conversation note.

## Config template placement
- No existing spec/config folder under domain_docs/mes/spec; will introduce new config docs and reference from smt_gap_design_suggestions.md.

## Findings: demo guide overhaul
- user_docs/demo/guide.md is still a compact demo flow; needs expansion into detailed front-end validation manual with new core concepts section, SMT deep dives, failure branch chapter, and appendices per plan.

## Findings: readiness playbook
- Readiness items: STENCIL, SOLDER_PASTE, EQUIPMENT, MATERIAL, ROUTE, LOADING; LOADING passes only when all slots LOADED; ROUTE requires READY.
- Readiness data sources: bindings/status records (stencil/solder), TPM/接口 (equipment), BOM + material master (material), route compile (route), loading expectations + scan records (loading).
- Run authorization forces a formal readiness check if not already done; failures keep Run in PREP.

## Findings: loading flow
- Preconditions: Run PREP + line bound + FeederSlot configured + SlotMaterialMapping present; load-table fails if any mapping missing or loading already started.
- Load-table generates RunSlotExpectation per slot with expectedMaterialCode + alternates; status starts PENDING.
- Verify rules: barcode format materialCode|lotNo; PASS=expected, WARNING=alternate, FAIL=mismatch; FAIL increments failedAttempts; 3 fails locks slot.
- Idempotent: already LOADED + same material returns existing record; different material requires replace; replace requires reason and marks old record REPLACED.

## Findings: FAI + execution
- FAI preconditions: Run PREP, readiness formal passed, sampleQty units pre-generated; create/start/complete endpoints; FAI gate requires PASS when route requires FAI.
- FAI complete rules: PASS needs failedQty=0; FAIL requires failedQty>0; PASS blocked if SPI/AOI inspection FAIL exists.
- Execution: Unit lifecycle QUEUED -> IN_STATION -> DONE/OUT_FAILED; OUT_FAILED must be dispositioned before rework/continue.
- TrackIn/Out requires authorized run + route/station match + required data values; trace output includes routeVersion snapshot, tracks, dataValues, inspections, loadingRecords.

## Findings: OQC + exceptions
- OQC triggers after all units reach terminal states; sampling rules (PERCENTAGE/FIXED) by product/line/routing with priority; sampleValue 0 or no rule => direct COMPLETED.
- OQC status: PENDING -> INSPECTING -> PASS/FAIL; PASS completes Run, FAIL moves Run to ON_HOLD then MRB decision (RELEASE/REWORK/SCRAP).
- Exceptions catalog includes loading failures (mapping missing, already started), barcode errors, lock/unlock flow, readiness waiver via /readiness/items/:id/waive with READINESS_WAIVE, FAI creation errors, authorize errors, track-in/out errors, cancel run (PREP only).

## Findings: validation checklists
- Loading validation covers load-table happy path + missing mapping + already started, verify PASS/WARNING/FAIL, idempotent scans, slot lock/unlock, replace with reason, and expected error codes (MATERIAL_LOT_NOT_FOUND, MATERIAL_LOT_AMBIGUOUS).
- Run/execution validation covers run creation -> unit generation (QUEUED/currentStepNo), readiness check behavior, FAI lifecycle, authorize action, TrackIn/Out payloads, OQC rule matching and sample size, OQC start/items/complete.

## Findings: trace + demo data
- Trace validation checks unit/routeVersion freeze, tracks/dataValues, inspections summary, and loadingRecords; supports material lot reverse lookup.
- Demo dataset blueprint suggests coverage for loading PASS/WARNING/FAIL, replace, FAI PASS/FAIL, execution PASS/FAIL, OQC trigger/no-trigger; naming conventions for WO/RUN/SN/lot.

## Guide overhaul plan (user_docs/demo/guide.md)
- [x] Restructure outline with new core concepts + renumbered SMT/DIP/failure chapters.
- [x] Expand SMT sections with readiness/loading/FAI/authorize/execution/OQC detail + checkpoints.
- [x] Expand DIP walkthrough + appendices (demo data, error codes, checkpoints).

## Errors
- cat > user_docs/demo/guide.md failed (zsh noclobber: file exists); retried with >| to overwrite file.

## SMT config sample context
- Confirmed demo codes: line SMT-A, route SMT-BOT-标准路由, stations SMT-A-REFLOW/AOI, etc., from smt_playbook and smt-demo-dataset.

## RBAC role keys
- Confirmed role codes: admin, planner, engineer, quality, leader, operator in rbac spec.

## Config sample + DB override docs
- Added config README updates, SMT-A sample configs, and DB override schema doc under domain_docs/mes/spec/config/.

## Review: mes-next triage note
- Triage note structure is reasonable (tracks + conflicts + recommendation), but includes stale state (ahead 8, missing acceptance plan path) and does not reflect recent config spec completion; should update worktree scan and mark doc-only config work as done.
- Potential overlap between Phase4 Track F and SMT gap plan; triage should clarify which plan is canonical to avoid duplicate execution.

## Line refs for triage review
- Stale state in Context and Worktree Scan lines 5-16; acceptance plan path note lines 22-25.
- Config spec work in Track D lines 64-68 now complete; should mark done or remove.
- Potential overlap between Phase4 Track F and SMT gap plan (lines 29-41) needs clarification.

## CONTEXT update needed
- Acceptance is currently paused; update triage and reading path to not default to acceptance. Add SMT gap plan as active entry. Fix plan/tasks.md.md typo if present.

## CONTEXT updated
- Marked acceptance plans as paused, set SMT gap plan as primary execution entry, fixed plan references.

## Triage note updated
- Updated mes-next triage to mark acceptance paused, SMT gap as primary, config spec done, and merge smt-basic first.

## Review attempt - smt-basic worktree
- Error: git -C /Users/envvar/lzb/better-wt-smt-basic status failed (path not found). Next: use `git worktree list` to locate actual path.

## Review prep
- Only main worktree exists; smt-basic-wp4-10 branch exists locally. Next approach: review via `git diff` between main and smt-basic-wp4-10 without checkout.

## smt-basic review notes (schema)
- Branch adds models: StencilUsageRecord, StencilCleaningRecord, SqueegeeUsageRecord, EquipmentInspectionRecord, OvenProgramRecord, DailyQcRecord, ProductionExceptionRecord; lineId optional for all and no run/route linkage. Consider readiness evidence linkage later.
- AuditEntityType extended with new record types.

## Error log
- Attempted to read smt-basic schema file from main workspace; file not found. Next: use `git show smt-basic-wp4-10:...` for branch files.

## smt-basic review notes (schema API)
- Create schemas allow optional lineCode for all records; line scoping not required -> records can be unscoped, which may weaken readiness/trace linkage.
- SqueegeeUsage includes checkSurface/checkEdge/checkFlatness fields (point-inspection aligned), so likely OK.
- EquipmentInspection result limited to PASS/FAIL; no additional status; acceptable but might be coarse vs TPM.

## smt-basic review notes (service)
- Services accept optional lineCode and allow records with null lineId; no enforcement of per-line scoping.
- Validation checks timestamps and non-negative counts but does not require product/job context; suitable for free-form records but weak for readiness evidence.
- No run/route linkage in record creation; only line-based lookup.

## smt-basic review notes (routes)
- Endpoints use READINESS_VIEW/READINESS_CHECK permissions for prep records, QUALITY_OQC for daily QC and production exception; no line-based access scoping in handlers.
- Auditing is present for create operations.

## smt-basic review notes (routes/FAI)
- mes routes include smtBasicRoutes; no additional changes besides import order in FAI service.

## smt-basic review notes (web)
- Navigation adds new SMT record pages; permissions align with server routes (READINESS_VIEW / QUALITY_OQC).
- Hook endpoints use /stencil-cleaning-records consistent with server routes.

## Form alignment spot-check
- Stencil cleaning form fields align with schema (stencilId/model, cleanedAt, cleanedBy, confirmedBy, remark).
- Squeegee form fields align with schema (usage counts + surface/edge/flatness checks + usedBy/confirmedBy).

## Line refs captured
- Prisma models with optional lineId at schema.prisma lines 710-879; resolveLineId allows null when lineCode absent (service.ts lines 527-534).

## AGENTS update plan
- Add rule: when asking user decisions/open questions, include context, options, impacts, and recommendation.

## Rule update applied
- Added decision-question guidance to AGENTS.md and logged conversation note.

## Decisions applied
- Added constraints: prep records must bind line and target run-level evidence; updated smt_gap_task_breakdown + design suggestions accordingly.

## Update 2026-01-22
- Noted user clarified roles: 工艺工程师=路由管理；管理员不参与业务。
- Pending decision: 生产异常记录创建/审批角色需调整（无班组长）。
- Repo status dirty with doc-only changes and new conversation notes.
- Read conv note: open question remains for production exception record creator role.
- User clarification: 工艺工程师负责路由管理；管理员不参与业务决策。
- Checked preset roles: admin/planner/engineer/quality/leader/operator in `packages/db/src/permissions/preset-roles.ts`.
- User clarification removes leader/admin/engineer from exception-creator candidates; likely quality or operator+quality flow.
- Error: failed to overwrite conversation note due to shell noclobber ("file exists"). Next: use redirection >| to overwrite.
- Dev skill reminder: must call out dirty git status and ask whether to use worktree; log findings after ~2 reads; use conversation notes for decisions/plans.
- Read permissions list in `packages/db/src/permissions/permissions.ts`: domain permissions for WO/RUN/EXEC/ROUTE/QUALITY/READINESS/LOADING/TRACE/SYSTEM etc. Needed for new role design mapping.
- Found many references to `leader` in docs and scripts (seed/demo/test scripts, permission audit, rbac spec, config samples).
- Role redesign will need doc updates + script updates if leader removed/renamed.
- Found loading routes: /mes/loading and /mes/loading/slot-config in web route tree/navigation; can use /mes/loading as material role home page.
- Seed scripts: `apps/server/scripts/seed-roles.ts` seeds PRESET_ROLES; `apps/server/scripts/seed.ts` creates test users incl leader user, assigns line bindings for leader, station bindings for operator.
- Seed test users currently: planner/engineer/quality/leader/operator; leader uses line bindings.

## 2026-01-22 (fixture usage)
- Findings: stash@{0} applied, modified files are smt-basic/service.ts and schema.prisma.
- Plan: finish minimal fixture usage model + API + readiness PREP_FIXTURE, add migration, update docs/align, commit in slices.
- Findings: Fixture usage model exists in schema.prisma; smt-basic service only defines FixtureUsageRecordDetail type; readiness PREP_FIXTURE is stubbed to fail.
- Findings: SMT align file lists other SMT records; no fixture usage entry yet.
- Error: bun run db:migrate -- --name add_fixture_usage_record failed due to drift (ReflowProfile tables). Need alternate migration approach without resetting DB.
- Next: try create-only migration or use db:migrate with --create-only and expect drift handling.
- Progress: generated migration using temp DATABASE_URL=file:/tmp/better_fixture_migration.db to avoid drift.

## 2026-01-27 (Slice 8: Daily QC stats + exception closure)
- Findings: `apps/server/src/modules/mes/smt-basic/routes.ts` exposes list/create APIs for `daily-qc-records` and `production-exception-records` gated by `Permission.QUALITY_OQC`; no stats/closure endpoints yet.
- Plan: inspect smt-basic schema/service + web pages to add shift/time-bucket stats and exception closure flow.
- Findings: `smt-basic/schema.ts` defines rich daily QC fields (shiftCode, timeWindow, defectSummary, rates, correctiveAction, reviewedBy/At) and production exception fields (description, correctiveAction, confirmedBy/At).
- Findings: `smt-basic/service.ts` only supports list/create; no update/confirm/close actions or aggregation endpoints. list filters by lineCode/jobNo/customer/shiftCode/inspectedAt (daily QC) and lineCode/jobNo/customer/issuedAt (exceptions).
- Findings: `apps/web/src/routes/_authenticated/mes/daily-qc-records/index.tsx` uses `DataListLayout` with filters and a create dialog; no stats or exception closure UI yet.

## 2026-01-27 06:45Z
- Ran claim-task flow: no pending slices in `.scratch/task-queue.md` (all pending=0).
- Current branch: `main`.
- Next: report task-queue state to user and ask how to proceed since nothing to claim.

## Context (2026-01-28)
- 用户反馈：重复输出问题仍未解决；要求生产环境关闭 AI debug 日志。
- 当前工作区非干净：`apps/web/src/components/chat/chat-assistant.tsx`、`apps/web/src/components/ui/dialog.tsx` 已修改；新增 `conversation/2026-01-28_124441_chat-assistant_dialog_overlay_click_issue.md`。

## Findings (2026-01-28)
- 待补充。

## Findings (2026-01-28 update)
- `ChatAssistant` 已增加 `data-chat-assistant-root` 且按钮/面板使用 `z-[9999]`，并通过 portal 渲染到 `document.body`。
- `DialogContent` 已注入 `onInteractOutside` 拦截，点击 `data-chat-assistant-root` 会 `preventDefault()`，避免 Dialog 被关闭。

## Progress (2026-01-28)
- `streamChatCompletion` 只在首次触发工具调用时输出“正在查询代码库...”，避免重复输出。
- 生产环境禁用 Chat 相关 debug 日志（tool calls、执行参数、结果、PROJECT_ROOT）。

## Progress (2026-01-28 update 2)
- 前端不再对 AI 文本做路径替换；仅在代码块内自动识别路由路径并渲染为链接。

## Update 2026-01-28
- Findings: `.scratch/task-queue.md` 无相关进行中 slice；当前问题是独立修复。
- Errors: 试图初始化 worktree note 时文件已存在（已保留原内容）。

## Update 2026-01-28 (db 查找)
- Findings: Prisma schema 已存在 `model ChatFeedback`，User 模型包含 `chatFeedbacks` 关联。

## Update 2026-01-28 (路由定位)
- Findings: `/api/chat/feedback` 路由在 `apps/server/src/modules/chat/routes.ts`，直接调用 `db.chatFeedback.create`。
- Findings: Prisma schema 中 `ChatFeedback` 模型存在，映射表 `chat_feedback`。

## Update 2026-01-28 (Prisma client 查找)
- Findings: `packages/db/generated` 目录不存在；需要检查实际 Prisma client 输出位置。
- Errors: `rg` 查询 `packages/db/generated` 报错（目录不存在），已改为检查 `packages/db` 结构。

## Update 2026-01-28 (Prisma client 生成内容)
- Findings: `packages/db/prisma/generated` 存在，但未找到 `chatFeedback` 相关生成内容（`rg` 无匹配）。
- Suspicion: Prisma client 可能未重新生成，导致运行时缺少 `chatFeedback` model。

## Update 2026-01-28 (db 包导出)
- Findings: `@better-app/db` 通过 `packages/db/prisma/generated/client` 导出 PrismaClient。
- Findings: `packages/db` 提供 `db:generate` 脚本（`prisma generate`）。

## Update 2026-01-28 (生成失败记录)
- Errors: `bun --cwd packages/db run db:generate` 仅输出 usage（未执行脚本）。
- Next: 改用 `cd packages/db && bun run db:generate` 重新生成。

## Update 2026-01-28 (生成完成)
- Progress: 已在 `packages/db` 执行 `bun run db:generate`，Prisma Client 与 prismabox 已重新生成。

## Update 2026-01-28 (脚本/工作流)
- Findings: 根脚本 `check-types` 会先执行 `db:generate`，但 `apps/server` 的 `dev` 不会自动生成 Prisma client。
- Insight: 开发环境若未手动运行 `db:generate`，可能导致 Prisma client 过旧，出现 `db.chatFeedback` undefined。

## Update 2026-01-28 (生成验证)
- Findings: 重新生成后，`packages/db/prisma/generated/client/index.js` 已包含 `ChatFeedback` 模型。
- Progress: `git status` 显示仅 `worktree_notes/main.md` 与已有前端文件被修改（前端变更非本次操作）。

## Update 2026-01-28 (dev 脚本)
- Progress: `apps/server/package.json` 新增 `db:generate` 脚本并在 `dev` 前置执行，确保启动前生成 Prisma Client。

## Context (2026-01-28 doc-review)
- Task: apply doc-review-meta plan to produce actionable backlog and align skill defaults.

## Findings (2026-01-28 doc-review)
- `domain_docs/mes/tech/api/01_api_overview.md` defines 9 API domains with endpoint lists: Integration, Routing, Work Orders / Runs, Readiness, Loading, Stations / Execution, Quality (FAI/FQC/OQC), Quality (Defects / Rework Tasks), Traceability.
- UI entry files for these domains are under `apps/web/src/routes/_authenticated/mes/` including integration/*, routes/*, work-orders.tsx, runs/*, readiness-*, loading/*, execution.tsx, fai/fqc/oqc, defects.tsx, rework-tasks.tsx, trace.tsx.

## Findings (2026-01-28 doc-review update)
- API contract docs exist: `domain_docs/mes/tech/api/02_api_contracts_execution.md`, `03_api_contracts_quality.md`, `04_api_contracts_trace.md`.
- Traceability spec exists at `domain_docs/mes/spec/traceability/01_traceability_contract.md`.

## Progress (2026-01-28 doc-review)
- Filled `00_review_backlog.md` with 9 API domains, key endpoints, docs, and UI route file paths.
- Added Backlog basis note in `doc_review_tasks.md` referencing API overview + contracts.
- Added Links line in `00_status.md` to backlog + round1 template.
- Verified `doc-review-meta` skill default path stays “generate tasks” without depth choices.

## Findings (2026-01-28 doc-review verify)
- Verified backlog table now lists 9 API domains with endpoints/docs/UI paths; doc_review_tasks includes Backlog 依据; 00_status header includes Links to backlog and round template.

## Context (2026-01-28)
- Task: Fix Loading doc deviations (user_docs/05_material.md + SMT playbook docs) per round1 review.

## Findings (2026-01-28)
- Deviations in round1_loading: user_docs missing error/exception coverage; replace flow mismatch with UI; playbook unlock input mismatch; slotId meaning mismatch in slot mapping doc.
- Target files to edit: `user_docs/05_material.md`, `domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md`, `domain_docs/mes/smt_playbook/02_configuration/03_slot_material_mapping.md`.

## Plan (2026-01-28)
- [ ] Update user material guide with load-table failure cases + proper replace UI path.
- [ ] Align loading flow playbook unlock input with API behavior.
- [ ] Clarify slot mapping doc: slotId refers to FeederSlot id (show slotCode separately).
- [ ] Optionally update round1_loading review notes to mark fixes.

## Progress (2026-01-28)
- Updated `user_docs/05_material.md` with load-table failure handling, verify exceptions, barcode format, and replace via "换料模式".
- Updated `domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md` unlock input to reason-only + operatorId from login.
- Updated `domain_docs/mes/smt_playbook/02_configuration/03_slot_material_mapping.md` to clarify slotId vs slotCode.
- Marked deviations as fixed in `domain_docs/mes/doc_review/round1_loading.md`.

## Errors (2026-01-28)
- `sed -n '1,240p' apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` failed because `$runNo` expanded in shell. Next: quote the path to read the file.
- apply_patch failed on round2_work_orders_runs.md due to mismatched context lines. Next: open the file section and reapply with correct context.

## Progress (2026-01-28, Round2 Review)
- Created `domain_docs/mes/doc_review/round2_work_orders_runs.md` and filled alignment matrix for Work Orders / Runs.
- Updated `domain_docs/mes/doc_review/00_status.md` (Round1 completed, Round2 in_progress).

## Findings (2026-01-28, Round2 Review)
- user_docs/02_planner.md mismatches: receive flow described as list-based; UI is manual input; filters and create-run fields over-specified.
- Missing user doc coverage for routing update, pick status update, work order closeout.
- Authorization error codes in exception doc do not match implementation.
- Closeout requires manual trigger + OQC_REQUIRED path; doc implies auto close.
- apply_patch failed on round2_work_orders_runs.md when updating 偏差清单/结论; context changed. Next: reopen section and reapply with correct context.

## Progress (2026-01-28, Round2 Fixes)
- Updated user_docs/02_planner.md to align receive flow, filters, create-run fields, and maintenance actions.
- Updated 03_run_flow/07_exception_and_recovery.md error codes and revoke behavior.
- Updated 06_oqc_closeout.md to document manual closeout trigger and OQC_REQUIRED.
- Marked Round2 deviations as fixed in round2 review doc.

## Progress (2026-01-28)
- Doc review cycles in progress; round3 readiness review started with `domain_docs/mes/doc_review/round3_readiness.md` created but not yet completed/committed.
- Current repo status: untracked `domain_docs/mes/doc_review/round3_readiness.md` awaiting review completion and status update.

## 2026-01-28 doc-review-meta follow-up
- Reviewed .scratch/doc-review-meta-findings.md: backlog/真源层级/交付物规则已知；无新增限制，仅提示可补齐 backlog 关键接口列。
- Opened round5_execution.md: matrix/偏差清单/结论仍为 TBD，待补齐（resolve-unit/data-specs/API 合约缺口待核）。
- user_docs/06_operator.md 描述了“检测结果录入”入口与 SOP 查看，但需核对 UI 是否存在对应按钮/入口；数据采集在出站弹窗描述。
- UI execution: `/mes/execution` 进/出站表单 + 站点队列；TrackOutDialog 会拉取 data-specs、校验必填、FAIL 必填 defectCode；未见 SOP 或“检测结果录入”入口。
- API: /api/stations/resolve-unit/:sn (EXEC_TRACK_IN/OUT), /api/stations/:stationCode/unit/:sn/data-specs (EXEC_TRACK_OUT), /track-in, /track-out 均记录审计；queue/列表基于权限与数据范围过滤。
- 00_status 轮次5 仍为 in_progress；round4 格式显示偏差类型用“行为不一致/缺失”，修复后在备注与偏差清单标注“已修复”。
- Error: sed failed on apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx (unescaped $). Next: use quoted path or rg -n with escaped \$.
- Need to inspect completeFqc in apps/server/src/modules/mes/fqc/service.ts for run status impact before documenting FQC behavior.
- Error: apply_patch failed updating user_docs/04_quality.md (missing "#### 4.1 查看产品履历" line). Next: inspect trace section and patch with correct lines.
