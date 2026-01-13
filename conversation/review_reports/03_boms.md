# Review Report: BOMs
**Page**: `apps/web/src/routes/_authenticated/mes/boms/index.tsx`

## Issues
1. **Redundant Code**: Local `formatTime` function.
2. **Imports**: Unused imports.

## Proposed Changes
1. Use `formatDateTime` from `@/lib/utils`.
2. Remove local `formatTime`.
3. Clean up imports.
