# Review Report: Work Centers
**Page**: `apps/web/src/routes/_authenticated/mes/work-centers/index.tsx`

## Issues
1. **Redundant Code**: Local `formatTime` function duplicates logic found elsewhere.
2. **Standardization**: No shared utility for consistent date/time formatting.

## Proposed Changes
1. Update `apps/web/src/lib/utils.ts` to include `formatDateTime`.
2. Refactor `WorkCentersPage` to use this shared utility.
3. Remove local `formatTime` definition.
