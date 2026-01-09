## Context

- Web dev server (Vite) reports `http proxy error: /api/integration/erp/boms/sync` with `Error: socket hang up`.
- Other integration sync endpoints are reported as normal.

## Decisions

- Treat BOM sync as a large dataset and avoid pulling/applying/returning it as one unbounded request.
- Switch ERP BOM pull to cursor-based paging (`startRow`/`limit`) so each sync call processes a bounded page.
- Add a client-side “drain” loop for manual sync: keep calling the sync endpoint while `cursor.hasMore === true`.
- Default ERP BOM sync page size to `50` to reduce per-request work and avoid proxy timeouts.

## Plan

1. Update ERP BOM pull to respect cursor paging.
2. Reduce default BOM sync page size.
3. Update web manual sync to loop until `hasMore` is false.
4. Verify with `bun run check-types` and `bun run lint`.

## Open Questions

- If the ERP dataset is extremely large, consider adding server-side batching/limits and surfacing progress in UI.
- If cursor advancement must be strictly based on the global max `FModifyDate`, consider enforcing `OrderString` by `FModifyDate` in Kingdee queries (optional hardening).

## References

- `apps/server/src/modules/mes/integration/erp/pull-boms.ts`
- `apps/server/src/modules/mes/integration/erp/index.ts`
- `apps/web/src/hooks/use-integration.ts`
