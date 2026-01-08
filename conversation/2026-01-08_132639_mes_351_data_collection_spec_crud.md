# mes_3.5.1_data_collection_spec_crud

## Context
- Implement MES Phase 3 task `3.5.1` (API: `DataCollectionSpec` CRUD) so engineers can manage data collection specs without relying on seed/hand-entered IDs.
- Work is isolated in a dedicated worktree/branch: `m3-data-collection-spec-crud`.

## Decisions
- API shape:
  - `GET /api/data-collection-specs` supports filter by `operationCode` / `name` / `isActive` + `sortBy`/`sortDir` + pagination.
  - `POST /api/data-collection-specs` creates a spec by `operationCode` (not operationId) to avoid exposing internal IDs.
  - `PATCH /api/data-collection-specs/:specId` updates spec fields including `isActive` (used for enable/disable).
- Data integrity:
  - Enforce `@@unique([operationId, name])` to avoid ambiguous TrackOut name-based lookups.
  - Add `@@index([operationId, isActive])` to match common list filters.
- RBAC/Audit:
  - Add permissions: `data_spec:read`, `data_spec:config`; grant `DATA_SPEC_CONFIG` to preset roles `admin` and `engineer`.
  - Audit writes via `AuditEntityType.SYSTEM_CONFIG` with actions `DATA_SPEC_CREATE` / `DATA_SPEC_UPDATE`.
- Worktree tooling:
  - Fix `scripts/worktree-new.ts` to preserve the sqlite DB filename (e.g. `data/db.db`) when rewriting `DATABASE_URL`, since `file:/.../data/` cannot be opened by sqlite.

## Plan
- Done (3.5.1):
  - Schema indexes/uniqueness
  - Server module + routes/schemas/services
  - RBAC permissions + preset roles + audit events
  - Eden types verified via `bun run check-types`
  - Plan checkbox marked done
- Next (3.5.x follow-ons):
  - `3.5.2` Web management page (list + create/edit dialog)
  - `3.5.3` Routing bind UI (replace `dataSpecIdsText`)
  - `3.5.4` Execution UI: TrackOut dynamic inputs + better error surfacing
  - `3.5.5` RBAC default alignment for config vs execution entrypoints

## Open Questions
- Should list endpoints also accept `operationId` for internal callers, or keep `operationCode` only?
- Should we add explicit `POST /:specId/enable` + `POST /:specId/disable` endpoints, or keep `PATCH` with `isActive` only?
- Repo-wide: migrate vs db-push baseline (currently no `packages/db/prisma/migrations`, so schema changes were applied with `bun run db:push -- --accept-data-loss`).

## References
- `domain_docs/mes/plan/phase3_tasks.md`
- `apps/server/src/modules/mes/data-collection-spec/routes.ts`
- `apps/server/src/modules/mes/data-collection-spec/schema.ts`
- `apps/server/src/modules/mes/data-collection-spec/service.ts`
- `packages/db/prisma/schema/schema.prisma`
- `packages/db/src/permissions/permissions.ts`
- `packages/db/src/permissions/preset-roles.ts`
- `domain_docs/mes/tests/01_acceptance_scenarios.md`
- `scripts/worktree-new.ts`
