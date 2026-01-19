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
