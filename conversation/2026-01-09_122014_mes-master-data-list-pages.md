## Context

- Need three MES list pages:
  - `/mes/materials`: show synced Material data (code/name/category/unit/model) and `sourceUpdatedAt`.
  - `/mes/boms`: show BOM by parent material, with parent → child → qty.
  - `/mes/work-centers`: show work centers and mapping to station groups / lines.

## Decisions

- Add a small “Master Data” API surface under `apps/server` (MES module) to back the list pages:
  - `GET /api/materials`
  - `GET /api/boms` (returns parent groups + children)
  - `GET /api/work-centers` (includes mapping to `StationGroup` + derived line codes)
- Use the repo list pattern (`DataListLayout` server mode + FilterToolbar + QueryPresetBar + card view).
- Reuse existing `Permission.ROUTE_READ` for endpoint access/navigation visibility (no new permission points added).

## Plan

1. Implement server list endpoints with pagination/filtering/sort.
2. Add web hooks (React Query + Eden).
3. Create three list pages with search/filter + card/table views.
4. Add navigation entries under MES.
5. Verify with `bun run format`, `bun run lint`, `bun run check-types`.

## Open Questions

- If BOM parent count becomes very large, optimize distinct parent counting (currently uses `distinct findMany`).
- If “层级关系” needs true multi-level expansion, add recursive fetch UX (currently shows immediate children per parent).

## References

- `apps/server/src/modules/mes/master-data/routes.ts`
- `apps/server/src/modules/mes/master-data/service.ts`
- `apps/web/src/routes/_authenticated/mes/materials/index.tsx`
- `apps/web/src/routes/_authenticated/mes/boms/index.tsx`
- `apps/web/src/routes/_authenticated/mes/work-centers/index.tsx`
