# Filters bug (MES list pages)

## Context
- Task: Fix list page filters not updating UI despite correct API responses.
- Repo state: dirty; main ahead 5 commits; existing uncommitted changes (not touched).

## Plan
- Reproduce on MES list route and inspect data flow from search params to UI.
- Trace list data query/state updates and identify stale/memoized path.
- Patch list data consumption and verify UI updates.

## Findings
- None yet.

## Progress
- Started investigation.

## Errors
- None yet.

## Findings (update 1)
- Work orders page uses `DataListLayout` in `server` mode; data comes from `useWorkOrderList` with filters built from `useSearch` params.
- URL search params are updated via `navigate(..., replace: true)` on filter/sort/pagination changes.
- Suspect UI not reacting to data changes in `DataListLayout` or query key caching; need to inspect list layout hooks.

## Findings (update 2)
- `DataListLayout` builds internal `useReactTable` with `data` prop and uses `locationSearch` to sync pagination/sorting from URL.
- In server mode it relies on `pageCount` + `onPaginationChange`/`onSortingChange`; data updates should flow via `data` prop.
- No obvious memoization in `DataListLayout` that would block data updates; need to inspect list hook/query keys.

## Findings (update 3)
- `FilterToolbar` only updates URL via callbacks; no client-side filtering on table in server mode.
- `DataListView` reads rows directly from table row model; no extra memoization.
- Need to look for shared issue across list pages: possibly query keys, list hooks, or router search syncing.

## Findings (update 4)
- Other MES list pages (e.g., runs) follow similar pattern: `useSearch` filters -> list hook -> `DataListLayout` server mode with URL-driven pagination.
- No obvious per-page memoization of `data.items`; issue likely in shared hook/query or table update flow.

## Findings (update 5)
- List hooks (e.g., `useRunList`, `useWorkOrderList`) include filters in query keys; they use `placeholderData` with previous data and `staleTime`.
- Shared pattern suggests issue is not a single hook missing filter params.

## Findings (update 6)
- Eden client uses basic fetch with credentials; no obvious caching in `lib/eden.ts`.
- Need to inspect global React Query client config for any unusual `notifyOnChangeProps` or cache behavior.

## Findings (update 7)
- React Query client config is standard (staleTime/gcTime), no custom notify/structural sharing config.
- No obvious global caching behavior causing stale list UI.

## Findings (update 8)
- Recent commit `0985c16` touched `DataListLayout` only for `showList` logic; no data update logic changes.
- Need to look elsewhere for why list data doesn't update after fetch.

## Findings (update 9)
- Router setup uses standard browser history; QueryClient duplicated (lib vs root route) but no immediate link to list updates.
- View preferences provider looks fine; no mutation of list data.

## Findings (update 10)
- Work order card/columns are straightforward; no memoization or local caching that would freeze list updates.
- Core list update issue still unlocated; suspect shared list infrastructure or query behavior.

## Errors (update 1)
- `sed` failed: `apps/web/src/components/data-list/field-meta.tsx` not found. Next: locate file via `rg -n "createColumnsFromFieldMeta"`.

## Findings (update 11)
- `createColumnsFromFieldMeta` is a simple mapper; no memoization or caching that would block list updates.
- File path is `apps/web/src/components/data-list/field-meta.ts` (not .tsx).

## Findings (update 12)
- No `useState(data?.items...)` or `useMemo(data?.items...)` patterns found in web source; list pages appear to pass query data directly.

## Findings (update 13)
- `useQueryPresets` is local-storage based; no data mutation or list caching issues found.
- `DataTableRow` memoization was introduced in commit `32cda3c` (data-table optimization); potential culprit if row objects are stable while data changes.

## Progress (update 1)
- Removed `React.memo` from `DataTableRow` to force row re-rendering when parent updates.

## Progress (update 2)
- Ran `bun scripts/smart-verify.ts`: Biome reported schema version mismatch (2.3.10 vs CLI 2.3.11) as info only; Prisma generate and type checks succeeded.

## Findings (update 14)
- Working tree changes include prior unrelated edits in `.claude/skills/worktree-status/SKILL.md` and `worktree_notes/README.md`, plus deletion of `worktree_notes/main.md`.
- Current fix touches `apps/web/src/components/data-table/data-table-row.tsx` and new `worktree_notes/filters-bug.md`.
