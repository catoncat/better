# Review Report: Readiness Exceptions
**Page**: `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx`

## Issues
1. **Magic Strings**: Hardcoded status badges.
2. **Date Formatting**: Local `formatTime`.

## Proposed Changes
1. Use `RUN_STATUS_MAP` and `READINESS_STATUS_MAP` from `@/lib/constants`.
2. Use `formatDateTime` from `@/lib/utils`.
