# Quickfix: Work order route binding

- Issue: Work orders with missing routing can be created (ERP sync) but cannot be edited to bind a route.
- Backend: add PATCH /work-orders/:woNo/routing to set routing by routingCode when WO is RECEIVED and missing routing.
- Frontend: add "关联路由" action + dialog using RouteSelect; only shows for RECEIVED WO with no routing.
- Notes: permission uses WO_UPDATE; ERP work orders still blocked for pick-status edit but can bind routing if missing.
