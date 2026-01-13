# Review Report: Production Runs
**Pages**: 
- `apps/web/src/routes/_authenticated/mes/runs/index.tsx`
- `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
**Components**:
- `apps/web/src/routes/_authenticated/mes/-components/run-field-meta.tsx`

## Issues
1. **Magic Strings**: Extensive use of hardcoded status strings and maps (Unit status, FAI status, Readiness status) instead of shared constants.
2. **Date Formatting**: Direct `date-fns` usage and local `formatTime` helper.
3. **API Logic**: Batch authorization logic in `runs/index.tsx` is somewhat manual, but acceptable for now.

## Proposed Changes
1. Add `UNIT_STATUS_MAP`, `READINESS_STATUS_MAP`, `FAI_STATUS_MAP` to `@/lib/constants`.
2. Refactor `run-field-meta.tsx` to use `RUN_STATUS_MAP`, `READINESS_STATUS_MAP` and `formatDateTime`.
3. Refactor `runs/$runNo.tsx` to use shared constants and `formatDateTime`.
4. Refactor `runs/index.tsx` to use `RUN_STATUS_MAP` for filter options.
