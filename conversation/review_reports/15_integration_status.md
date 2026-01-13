# Review Report: Integration Status
**Page**: `apps/web/src/routes/_authenticated/mes/integration/status.tsx`

## Issues
1. **Date Formatting**: Inconsistent tooltip date formatting using `toLocaleString`.

## Proposed Changes
1. Use `formatDateTime` for tooltip content.
