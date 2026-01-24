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

## Slices
- [x] Slice 0: worktree note context
- [ ] Slice 1: Read plan/specs + capture requirements
- [ ] Slice 2: Server model/API updates for readiness config
- [ ] Slice 3: Web page for readiness config
- [ ] Slice 4: Plan/align docs + verification

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
-

## Open Questions
-

## Errors
- 2026-01-24T15:14:34Z: `.scratch/agent_session.md` missing in worktree; next: check `.scratch/` in main worktree for session context.
