# Data List Pattern

## Goal
- Standardize list pages with FilterToolbar + QueryPresetBar and server-driven pagination.

## When to Use
- Any list page (tables or cards) with filtering, search, or presets.

## Required Components
- FilterToolbar
- QueryPresetBar
- DataListLayout + DataListView

Component locations:
- `apps/web/src/components/data-list/*`
- `apps/web/src/hooks/use-query-presets.ts`

## Canonical Reference
- `apps/web/src/routes/_authenticated/mes/runs/index.tsx`

## Rules
- Use `DataListLayout` with `mode="server"`.
- **Server mode requires `pageCount`** (data is already paged; do not apply client pagination row model).
- Use `isLoading` for initial empty-state load and `isFetching` for background refresh indicators when data is already visible.
- Always sync pagination with URL search.
- `viewPreferencesKey` is required; use the same value in `FilterToolbar` and `DataListView` (can be set on `DataListLayout` or per-prop).
- Route search params must be validated via `validateSearch`.

## Global Rules
1. **All lists require card view support** - Mobile support requires responsive card layouts alongside tables.
2. **System presets should NOT include "All"** - The default state already shows all items; only add meaningful filter presets.

## Dual View Requirement (Mandatory)

Every list page MUST implement:
1. **Table view** (TanStack Table) - default on desktop.
2. **Card view** - required for mobile/tablet.

### Single Source of Truth
Define column/field metadata ONCE, derive both views:

```tsx
const fieldMeta = [
  { key: "name", label: "名称", sortable: true, cardPrimary: true },
  { key: "status", label: "状态", sortable: true, cardBadge: true },
  { key: "updatedAt", label: "更新时间", sortable: true, cardSecondary: true },
];

// Table columns derived from fieldMeta
const columns = fieldMeta.map(f => ({ accessorKey: f.key, header: f.label, ... }));

// Card renders using same fieldMeta
const renderCard = (item) => (
  <Card>
    <CardHeader>{item[fieldMeta.find(f => f.cardPrimary).key]}</CardHeader>
    ...
  </Card>
);
```

### Responsive Strategy
- Breakpoint: `md` (768px).
- Below `md`: Force card view, hide view toggle.
- Above `md`: Show toggle, default to user preference (persisted in localStorage).

### View Toggle
Use `DataListView` with `viewPreferencesKey` - toggle lives in `FilterToolbar`.

## Filter Bar Rules

### Preset Constraints
- **NO "All/全部" preset** - default state IS all items.
- System presets = meaningful filters only (e.g., "待审核", "已过期").
- Preset matching normalizes filters (drop empty values; sort multi-select arrays via `sortableArrayKeys`).

### Layout
- **Compact mode**: Single row, fields inline, collapse to dropdown on overflow.
- **Collapsible**: Optional "更多筛选" expand for advanced filters.
- **Clear action**: "清空筛选" button (not "全部"), resets to default empty state.

### Date Range Contract
- Use `type: "dateRange"` with `dateFromKey` and `dateToKey`.
- Filters store ISO 8601 strings at those keys (no `__dateRange__` intermediary).
- Prefer `onFiltersChange` to update both keys in a single URL mutation.

### Example
```tsx
systemPresets={[
  { id: "pending", label: "待审核", filters: { status: "pending" } },
  { id: "overdue", label: "已过期", filters: { dueDate: { lt: now } } },
  // NO { id: "all", label: "全部" }
]}
```

## Exceptions
Some pages don't follow this pattern:
- **Small dataset pages**: When items are few and don't need pagination (e.g., `role-management.tsx` uses a pure card grid layout).
- **Non-list pages**: Dashboards, detail pages, etc.

## Implementation Notes
- Prefer copying the canonical reference (`apps/web/src/routes/_authenticated/mes/runs/index.tsx`) and adapting it.
- Keep `viewPreferencesKey` stable; changing it breaks saved view preferences.
