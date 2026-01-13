# Review Report: Materials
**Page**: `apps/web/src/routes/_authenticated/mes/materials/index.tsx`

## Issues
1. **Redundant Code**: Local `formatTime` function duplicates logic.
2. **Imports**: Unused imports (`format` from `date-fns` will be unused after refactor).

## Proposed Changes
1. Use `formatDateTime` from `@/lib/utils`.
2. Remove local `formatTime`.
3. Clean up imports.
