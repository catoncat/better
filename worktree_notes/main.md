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
