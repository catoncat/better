# Context
- Task: address work order list UX issues (table too wide, add pick status filter).
- Constraints: stay on main, no worktree, ignore existing dirty changes.

# Decisions
- Make actions column sticky to keep operations visible without horizontal scroll.
- Reduce table width by hiding the routing name column and truncating wide cells.
- Add a pick status filter using `erpPickStatus` (covers ERP + manual orders).

# Plan
- [x] Slice 1: Fix work order list table layout so actions column stays visible without horizontal scroll.
- [x] Slice 2: Add picking status filter and consider other important filters/sorting.

# Findings
- Work order list uses `DataListLayout` with filter toolbar; `erpPickStatus` exists in query but no UI filter.
- `DataListFieldMeta` supports `tableHidden` to omit columns from table rendering.
- Server list filters apply `erpPickStatus` to ERP orders and `pickStatus` for manual orders.

# Progress
- Added sticky-column rendering for table headers/cells (meta-driven) and marked actions column sticky.
- Hid routing name column and truncated product/routing cell text to reduce width.
- Added pick status filter options to the work order list toolbar.

# Errors
- Initial attempt to open `apps/web/src/components/data-list/field-meta.tsx` failed (file is `.ts`).

# Open Questions
- None.

# References
- `apps/web/src/routes/_authenticated/mes/work-orders.tsx`
- `apps/web/src/routes/_authenticated/mes/-components/work-order-columns.tsx`
- `apps/web/src/routes/_authenticated/mes/-components/work-order-field-meta.tsx`
- `apps/web/src/components/data-table/data-table.tsx`
- `apps/web/src/components/data-table/data-table-row.tsx`
- `apps/web/src/components/ui/table.tsx`
