# track-a_audit-logs-ui

## Context
- User asked why Audit Logs “isn’t a list” and whether the list is done.
- Track A (Ops & Deployment Readiness) called out missing UI access for audit logs in `conversation/2026-01-13_080325_mes-triage_next-steps.md`.

## Decisions
- Implement Audit Logs list UI at `/system/audit-logs` (table + card view, server pagination, filters, presets).
- Keep backend unchanged: use existing `GET /api/audit-logs` and `GET /api/audit-logs/:id`.
- Web must not import `@better-app/db` at runtime (Node-only); use type-only imports + local constants in `apps/web/src/lib/constants.ts`.

## Plan
- (Done) Land list page + hook + card/table components.
- (Done) Update ops deployment doc to include the UI path for audit logs.
- (Optional) Add fuzzy matching for `action`/`entityId` on backend if operators expect partial search.

## Open Questions
- Should audit log filters support partial match (Prisma `contains`) instead of exact match?
- Should non-admin users have a “My Audit Logs” entry outside System menu (self-only access)?

## References
- Web UI: `apps/web/src/routes/_authenticated/system/audit-logs.tsx`
- Web components: `apps/web/src/routes/_authenticated/system/-components/audit-log-*.tsx`
- Web hook: `apps/web/src/hooks/use-audit-logs.ts`
- Labels: `apps/web/src/lib/constants.ts`
- Backend: `apps/server/src/modules/audit/routes.ts`, `apps/server/src/modules/audit/service.ts`
- Ops doc: `agent_docs/05_ops/single_binary_deployment.md`
- Track A triage: `conversation/2026-01-13_080325_mes-triage_next-steps.md`
