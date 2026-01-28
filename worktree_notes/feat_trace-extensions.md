---
type: worktree_note
createdAt: "2026-01-28T19:44:18.596Z"
branch: "feat/trace-extensions"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "Trace material-lot API + trace UI detail expansions"
---

# feat/trace-extensions - Trace material-lot API + trace UI detail expansions

## Scope
- Goal: implement trace material-lot reverse lookup API and expand Trace UI detail sections (steps/inspections/loadingRecords/ingest/carrier).
- Non-goals: export/report feature; bulk search/filter UI beyond trace page.
- Risks: response payload size and UI performance; schema mismatch with existing trace service.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: API - material lot reverse lookup endpoint + schema/service
- [x] Slice 2: UI - trace page details (steps/inspections/loadingRecords/ingest/carrier)
- [x] Slice 3: Docs - traceability contracts + user docs alignment

## Findings
- 2026-01-28: Trace API currently only implements GET /api/trace/units/:sn; material-lot reverse lookup is doc-only and needs backend route.
- 2026-01-28: API patterns require ServiceResult, envelope, and audit in routes; external read endpoints can skip audit (no writes).
- 2026-01-28: Trace service already composes defects/materials/loading/inspections/carrier data; UI can reuse existing UnitTrace shape.
- 2026-01-28: Trace UI will add material-lot lookup and additional sections for steps/inspections/loading/ingest/carrier.
- 2026-01-28: Docs updated to reflect material-lot query now available; export still marked reserved.

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T19:44:18.597Z
- BaseRef: origin/main
- CommitsAheadOfBase: 15
- Dirty: true
- ChangedFiles:
  - .claude/skills/ux-review-exec/SKILL.md
  - .claude/skills/ux-review-meta/SKILL.md
  - domain_docs/mes/dip_playbook/03_run_flow/02_readiness_and_prep.md
  - domain_docs/mes/doc_review/00_status.md
  - domain_docs/mes/doc_review/round3_readiness.md
  - domain_docs/mes/doc_review/round4_routing.md
  - domain_docs/mes/doc_review/round5_execution.md
  - domain_docs/mes/doc_review/round6_quality_fai_fqc_oqc.md
  - domain_docs/mes/doc_review/round7_quality_defects_rework.md
  - domain_docs/mes/doc_review/round8_integration.md
  - domain_docs/mes/doc_review/round9_traceability.md
  - domain_docs/mes/plan/smt_gap_task_breakdown.md
  - domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md
  - domain_docs/mes/smt_playbook/02_configuration/05_reflow_profile.md
  - domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md
  - domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md
  - domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md
  - domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md
  - domain_docs/mes/smt_playbook/03_run_flow/08_time_rules.md
  - domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md
  - domain_docs/mes/smt_playbook/99_appendix/02_api_and_ui_index.md
  - domain_docs/mes/spec/config/02_db_override_schema.md
  - domain_docs/mes/spec/config/samples/smt_a_prep_item_policy.yaml
  - domain_docs/mes/spec/config/samples/smt_a_time_rule_config.yaml
  - domain_docs/mes/spec/config/samples/smt_a_waive_permission_matrix.yaml
  - domain_docs/mes/spec/config/templates/prep_item_policy.template.yaml
  - domain_docs/mes/spec/config/templates/time_rule_config.template.yaml
  - domain_docs/mes/spec/config/templates/waive_permission_matrix.template.yaml
  - domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md
  - domain_docs/mes/spec/routing/01_routing_engine.md
  - domain_docs/mes/tech/api/01_api_overview.md
  - domain_docs/mes/tech/api/02_api_contracts_execution.md
  - domain_docs/mes/tech/api/03_api_contracts_quality.md
  - domain_docs/mes/tech/api/04_api_contracts_trace.md
  - domain_docs/mes/ux_review/00_interaction_matrix_template.md
  - domain_docs/mes/ux_review/00_review_backlog.md
  - domain_docs/mes/ux_review/00_review_method.md
  - domain_docs/mes/ux_review/00_status.md
  - domain_docs/mes/ux_review/99_high_risk_findings.md
  - domain_docs/mes/ux_review/round1_template.md
  - domain_docs/mes/ux_review/ux_review_tasks.md
  - user_docs/00_role_overview.md
  - user_docs/01_admin.md
  - user_docs/02_planner.md
  - user_docs/03_engineer.md
  - user_docs/04_quality.md
  - user_docs/06_operator.md
  - user_docs/07_trace.md
  - user_docs/demo/01_overview.md
  - user_docs/demo/acceptance_plan_dip.md
  - ... (+10 more)
- Next:
  - Commit worktree note: git add worktree_notes/feat_trace-extensions.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
- Verify with `bun scripts/smart-verify.ts` before merge.

## Verification
- 2026-01-28: `bun scripts/smart-verify.ts` failed due to existing Biome lint in chat components (unused imports/vars) and format suggestions; trace routes import order can be fixed locally, but unrelated chat files require decision.

## Findings
- 2026-01-28: Lint failures from chat components (unused clearMessages, unused lucide imports) and Biome formatting diffs in chat files and trace page; will fix manually without full-format run.
- 2026-01-28: Need to adjust chat UI formatting (MessageBubble props multiline) and remove unused icon import in chat-suggestions.
- 2026-01-28: Added main commit hash c668c79 to doc_review/00_status.md header.
- 2026-01-28: `bun scripts/smart-verify.ts` passed after fixing trace route typing and lint/format.
