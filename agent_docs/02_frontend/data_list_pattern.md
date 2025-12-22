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
- `apps/web/src/routes/_authenticated/instruments/index.tsx`

## Rules
- Use `DataListLayout` with `mode="server"`.
- Always sync pagination with URL search.
- Use the same `viewPreferencesKey` in `FilterToolbar` and `DataListView`.
- Route search params must be validated via `validateSearch`.

## Minimal Usage
```tsx
<QueryPresetBar
  systemPresets={systemPresets}
  userPresets={userPresets}
  activePresetId={activePresetId}
  onApplyPreset={applyPreset}
  onSavePreset={(name) => savePreset(name, filters)}
/>

<FilterToolbar
  fields={fields}
  filters={filters}
  onFilterChange={setFilter}
  onReset={resetFilters}
  isFiltered={isFiltered}
  table={table}
  viewPreferencesKey="instruments"
/>

<DataListLayout
  mode="server"
  data={data?.items ?? []}
  pageCount={pageCount}
  onPaginationChange={handlePaginationChange}
  viewPreferencesKey="instruments"
/>
```

## Related Docs
- `agent_docs/02_frontend/list_sorting.md`
