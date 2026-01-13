# Review Report: Rework Tasks
**Page**: `apps/web/src/routes/_authenticated/mes/rework-tasks.tsx`

## Issues
1. **Magic Strings**: Hardcoded rework task statuses.
2. **Date Formatting**: Local `formatTime` usage.

## Proposed Changes
1. Add `REWORK_TASK_STATUS_MAP` to `@/lib/constants`.
2. Refactor `rework-tasks.tsx` to use this map and `formatDateTime`.
