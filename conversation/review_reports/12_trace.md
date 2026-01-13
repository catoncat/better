# Review Report: Traceability
**Page**: `apps/web/src/routes/_authenticated/mes/trace.tsx`

## Issues
1. **Magic Strings**: Hardcoded unit statuses.
2. **Date Formatting**: Local `formatTime` usage.

## Proposed Changes
1. Use `UNIT_STATUS_MAP` for status badges.
2. Use `formatDateTime` from `@/lib/utils`.
