---
type: worktree_note
createdAt: "2026-01-27T07:06:37.781Z"
branch: "feat/mes-t4-6-8-1-inspection-exception-v2"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "SMT traceability: device inspection exception linkage (T4.6.8.1)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.6.8.1"
  triageNote: ".scratch/2026-01-27_135438_next_mes.md"
touchPoints:
  - "apps/server/src/modules/mes/smt-basic"
  - "apps/server/src/modules/mes/audit"
  - "apps/web"
  - "domain_docs/mes/plan/phase4_tasks.md"
  - "domain_docs/mes/spec/impl_align/03_smt_align.md"
---

# feat/mes-t4-6-8-1-inspection-exception-v2 - SMT traceability: device inspection exception linkage (T4.6.8.1)

## Scope
- Goal:
- Non-goals:
- Risks:

## Findings
- `createEquipmentInspectionRecord` currently creates only `EquipmentInspectionRecord` and returns mapped data; no exception handling.
- Equipment inspection creation uses `resolveLineId` and stores optional `meta`; response excludes `meta`.
- Equipment inspection routes only record audit for inspection creation; no exception audit.
- Production exception create schema allows `meta` for linkage payload without schema changes.
- `AuditEntityType` includes `PRODUCTION_EXCEPTION`, so audit logging can reuse existing enum.
- `createProductionExceptionRecord` validates description + issuedBy + issuedAt; other fields optional, `meta` accepted.
- `phase4_tasks.md` lists T4.6.8.1 as pending (⬜) with note “点检失败触发异常反馈链路”.
- `03_smt_align.md` has a single row for “设备点检记录” without exception linkage notes.

## Slices
- [ ] Slice 7: SMT traceability - device inspection exception linkage (T4.6.8.1)

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-27T07:06:37.781Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - domain_docs/mes/dip_playbook/00_scope_and_terms.md
  - domain_docs/mes/dip_playbook/03_run_flow/02_readiness_and_prep.md
  - domain_docs/mes/dip_playbook/03_run_flow/06_fai_and_ipqc.md
  - domain_docs/mes/dip_playbook/03_run_flow/10_maintenance.md
  - domain_docs/mes/dip_playbook/README.md
  - domain_docs/mes/smt_playbook/00_scope_and_terms.md
  - domain_docs/mes/smt_playbook/02_configuration/05_reflow_profile.md
  - domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md
  - domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md
  - domain_docs/mes/smt_playbook/03_run_flow/08_time_rules.md
  - domain_docs/mes/smt_playbook/03_run_flow/09_maintenance.md
  - domain_docs/mes/smt_playbook/README.md
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Auto-create `ProductionExceptionRecord` when equipment inspection result is FAIL; keep API response unchanged.

## Open Questions
-
