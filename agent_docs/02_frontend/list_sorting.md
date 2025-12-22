# List Sorting

## Goal
- Ensure list pages are usable by default and stable across pages.

## When to Use
- Creating or updating list endpoints or tables.

## Default Sorting Rules
1. Record/history lists: sort by the most relevant time field descending, with a stable fallback (`createdAt desc` or `id desc`).
2. Schedule/due lists: sort by `next*At` ascending; visually prioritize overdue/urgent items.
3. Master data lists: sort by primary business identifier ascending (e.g., instrument number), with a stable fallback.

## Frontend (DataListLayout + TanStack Table)
- Enable sorting on relevant columns.
- Set default sorting via `initialSorting`.
- If server mode is used, pass sorting to the backend.

```tsx
<DataListLayout
  initialSorting={[{ id: "performedAt", desc: true }]}
  sortingConfig={{ syncWithUrl: true }}
/>
```

## Backend (Prisma)
- Always set explicit `orderBy` for default behavior.
- For server-side sorting, accept a `sort` query and map to Prisma `orderBy`.

```ts
import { parseSortOrderBy } from "apps/server/src/utils/sort";

const orderBy = parseSortOrderBy(query.sort, {
  allowedFields: ["performedAt", "createdAt"],
  fallback: [{ performedAt: "desc" }, { createdAt: "desc" }],
});
```
