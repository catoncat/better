## Context

- Plan item `3.2.2.3 Trace` was marked done, but Trace response lacked inspection summary and a usable loading summary for traceability.
- `apps/server/scripts/test-mes-flow.ts` attempted to read `trace.inspections`, but `GET /trace/units/:sn` did not return an `inspections` field.
- Trace returned `materials` from `MaterialUse`, but there is currently no repo path that writes `MaterialUse`, so Trace could not locate loading/material context.

## Decisions

- Extend Trace response with:
  - `inspections`: run-level inspection summaries + per-unit item counts (PASS/FAIL/NA) to support “inspection summary can locate”.
  - `loadingRecords`: run-level loading record summaries (derived from `LoadingRecord`, filtered to overlap the unit’s execution window when available) to support “loading summary can locate”.
- Update `domain_docs/mes/plan/phase3_tasks.md` to reflect that `3.2.2.3` was not actually complete until these fields are implemented and asserted in the acceptance script.

## Plan

1. Update plan checkbox and add explicit subchecks for Trace inspections/loading summaries.
2. Add `inspections` and `loadingRecords` to `apps/server/src/modules/mes/trace/*` response schema + service.
3. Update `apps/server/scripts/test-mes-flow.ts` to assert Trace returns these summaries.
4. Verify with `bun run check-types` and `bun run lint` (and `bun run format` if needed).

## Open Questions

- Should `materials` be populated from `LoadingRecord` (run-level) or should we add a real per-unit material consumption write-path to `MaterialUse`? (Current fix exposes `loadingRecords` explicitly and leaves `materials` unchanged.)

## References

- `domain_docs/mes/plan/phase3_tasks.md`
- `apps/server/src/modules/mes/trace/schema.ts`
- `apps/server/src/modules/mes/trace/service.ts`
- `apps/server/scripts/test-mes-flow.ts`
