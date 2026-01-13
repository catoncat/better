# Review Report: Work Orders
**Page**: `apps/web/src/routes/_authenticated/mes/work-orders.tsx`
**Components**: 
- `apps/web/src/routes/_authenticated/mes/-components/work-order-field-meta.tsx`
- `apps/web/src/routes/_authenticated/mes/-components/work-order-columns.tsx`

## Issues
1. **Magic Strings**: Hardcoded pick status codes ("1", "2", "3", "4") scattered across files.
2. **Date Formatting**: Direct `date-fns` usage in `work-order-field-meta.tsx`.
3. **Filtering**: Presets use hardcoded magic strings.

## Proposed Changes
1. Add `PICK_STATUS_CODE` and `PICK_STATUS_MAP` to `@/lib/constants`.
2. Refactor `work-order-field-meta.tsx` to use these constants and `formatDateTime`.
3. Refactor `work-orders.tsx` to use these constants for presets.
4. Refactor `work-order-columns.tsx` (if applicable) to use constants.
