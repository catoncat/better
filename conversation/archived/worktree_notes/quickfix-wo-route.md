# Quickfix: Work order route binding

- Issue: ERP-synced work orders can be missing routing while in RELEASED/IN_PROGRESS, leaving no UI path to bind a route.
- Backend: allow PATCH /work-orders/:woNo/routing when no runs exist and WO not COMPLETED.
- Frontend: show "关联路由" action whenever routing is missing and WO not COMPLETED.
- Permission: WO_UPDATE required.
