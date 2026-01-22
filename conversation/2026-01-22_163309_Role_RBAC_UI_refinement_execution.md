# Role RBAC UI refinement execution

## Context
- User wants obsolete roles removed (no legacy data concerns) and role management UI + permission refinements updated.
- Current roles: admin / planner / engineer / quality / material / operator / trace.

## Decisions
- Delete deprecated roles (no hiding).
- Do not split loading unlock/replace permissions; keep loading:config + loading:verify.

## Plan
- Audit role-based checks; update to permission-based or new role codes.
- Update role management UI ordering and descriptions.
- Update user management UI: presets + binding validation for material/operator.
- Add server-side binding validation for roles with ASSIGNED_LINES/ASSIGNED_STATIONS.
- Run smart-verify.

## Findings
- User dialog tooltips referenced leader and lacked binding validation.
- Meta roles API returns only id/code/name; binding rules rely on role codes.

## Progress
- Implemented server-side binding validation and UI updates for presets + sorting + binding errors.

## Errors
- None.

## Open Questions
- None.

## References
- `apps/server/src/modules/users/service.ts`
- `apps/web/src/routes/_authenticated/system/user-management.tsx`
- `apps/web/src/routes/_authenticated/system/-components/user-dialog.tsx`
- `apps/web/src/routes/_authenticated/system/role-management.tsx`
