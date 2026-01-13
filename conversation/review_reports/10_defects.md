# Review Report: Defects
**Page**: `apps/web/src/routes/_authenticated/mes/defects.tsx`

## Issues
1. **Magic Strings**: Hardcoded defect statuses and disposition types.
2. **Date Formatting**: Local `formatTime` usage.

## Proposed Changes
1. Add `DEFECT_STATUS_MAP` and `DISPOSITION_TYPE_MAP` to `@/lib/constants`.
2. Refactor `defects.tsx` to use these constants and `formatDateTime`.
