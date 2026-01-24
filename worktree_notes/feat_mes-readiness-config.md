---
type: worktree_note
createdAt: "2026-01-24T15:12:27.717Z"
branch: "feat/mes-readiness-config"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "Slice 4: Readiness config model + web page (T4.4.1, T4.4.2)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.4.1/T4.4.2"
---

# feat/mes-readiness-config - Slice 4: Readiness config model + web page (T4.4.1, T4.4.2)

## Scope
- Goal: Land readiness config model + readiness config page for T4.4.1/T4.4.2.
- Non-goals: Unrelated readiness/traceability changes outside slice scope.
- Risks: Spec gaps for readiness config fields or API expectations.

## Findings
- `.scratch/agent_session.md` appears stale (mentions slice 2 device POC); don't rely on it for current task context.
- `phase4_tasks.md` T4.4.1 = readiness config model/API (toggle/rules/defaults configurable); T4.4.2 = web config page with permissions/audit and depends on T4.4.1.
- Existing `apps/server/src/modules/mes/readiness/schema.ts` covers readiness checks/waive/exceptions; no config model types yet.
- `apps/server/src/modules/mes/readiness/routes.ts` exposes precheck/formal check, latest/history, waive, and exceptions; uses auth + permissions + audit logging; no config endpoints yet.
- `apps/server/src/modules/mes/readiness/service.ts` implements readiness checks (equipment/material/route/etc.) and parses enabled checks from `line.meta.readinessChecks.enabled`; no dedicated config persistence yet.
- `apps/web` already has `/mes/readiness-config` route + `use-readiness` hooks that call `client.api.lines.{lineId}.readiness-config` GET/PUT; permissions gate uses `READINESS_CONFIG`.
- `apps/web/src/routes/_authenticated/mes/readiness-config.tsx` is already built (line selector, process type save, config toggles, save button) and relies on readiness-config API + line process type update.
- `apps/server/src/modules/mes/line/routes.ts` already defines `/:lineId/readiness-config` GET/PUT; test script references these endpoints.
- Line readiness-config endpoints read/write `line.meta.readinessChecks.enabled` and rely on `parseReadinessConfig` + readiness config schemas.
- `parseReadinessConfig` defaults to `ALL_READINESS_TYPES` (all `ReadinessItemType` values) when meta missing/invalid and filters enabled to valid enum values.
- Line readiness config schema already enumerates all readiness item types including PREP_* and TIME_RULE in `apps/server/src/modules/mes/line/schema.ts`.
- `phase4_tasks.md` marks T4.4.* under "Readiness 配置（可选，P1）" and still unchecked.
- `permission_audit.md` includes a full `/mes/readiness-config` page audit; UI gating for view/action is marked OK; no explicit backend audit requirement listed there.
- No `readiness-config` references under `domain_docs/mes/spec/*` (rg returned none), so align updates may only need plan status changes.
- `domain_docs/mes/tech/api/01_api_overview.md` lists readiness run endpoints but omits `/lines/:lineId/readiness-config` GET/PUT.
- `domain_docs/mes/spec/process/03_smt_flows.md` claims readiness config is controlled by `Run.meta.readinessChecks.enabled` but current implementation uses `Line.meta.readinessChecks.enabled` (doc mismatch).
- `agent_docs/03_backend/audit_logs.md` states config changes should be audit-logged; readiness-config PUT currently lacks audit logging.
- Prisma schema had duplicate `TimeRuleInstance.activeKey`; removed duplicate line (no DB migration needed per `db:migrate`).

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: Read plan/specs + capture requirements
- [x] Slice 2: Server model/API updates for readiness config
- [x] Slice 3: Web page for readiness config
- [x] Slice 4: Plan/align docs + verification

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T15:12:27.717Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Add audit logging for readiness-config updates to match audit policy for config writes.

## Open Questions
-

## Errors
- 2026-01-24T15:14:34Z: `.scratch/agent_session.md` missing in worktree; next: check `.scratch/` in main worktree for session context.
- 2026-01-24T15:40:36Z: `bun scripts/smart-verify.ts` failed in `db:generate` with Prisma P1012: `Field "activeKey" is already defined on model "TimeRuleInstance"` (`prisma/schema/schema.prisma:2189`). Next: confirm upstream schema state before retrying.
