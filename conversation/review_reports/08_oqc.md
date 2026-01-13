# Review Report: OQC
**Page**: `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`
**Components**: `apps/web/src/routes/_authenticated/mes/-components/oqc-field-meta.tsx`

## Issues
1. **Magic Strings**: Hardcoded statuses in filters and badges.
2. **Date Formatting**: Direct `date-fns` usage.

## Proposed Changes
1. Use `INSPECTION_STATUS_MAP` for filter presets.
2. Refactor `oqc-field-meta.tsx` to use shared constants and `formatDateTime`.
