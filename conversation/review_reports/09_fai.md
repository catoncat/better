# Review Report: FAI
**Page**: `apps/web/src/routes/_authenticated/mes/fai.tsx`

## Issues
1. **Magic Strings**: Hardcoded FAI statuses.
2. **Date Formatting**: Local `formatTime` usage.

## Proposed Changes
1. Use `FAI_STATUS_MAP` for status badges and selects.
2. Use `formatDateTime` from `@/lib/utils`.
