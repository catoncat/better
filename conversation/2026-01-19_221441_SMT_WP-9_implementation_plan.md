# Context
User asked to proceed with the SMT deep-analysis plan after fixing Prisma migration issues. Starting with Track F / WP-9 (换料记录增强).

# Decisions
- Implement WP-9 first (LoadingRecord enhancements + slot mapping extra fields) before larger time-window and lifecycle work.
- Keep main branch (no worktree) and avoid touching unrelated untracked files.

# Plan
- Slice 1 (server/API): extend loading schemas and service mappings to include `packageQty`, `reviewedBy`, `reviewedAt`; extend slot mapping schema/service with `unitConsumption`, `isCommonMaterial`.
- Slice 2 (web UI/hooks): add changeover fields in ScanPanel, add slot mapping fields in MappingDialog + table, and show loading history with new columns.
- Slice 3 (docs/plan): update `domain_docs/mes/spec/impl_align/03_smt_align.md` for changeover record and mark `4.6.10` done in `domain_docs/mes/plan/phase4_tasks.md`.
- Verification: `bun scripts/smart-verify.ts`.

# Findings
- Loading module already has verify/replace endpoints and LoadingRecord model; new columns exist in Prisma schema but are not surfaced in API or UI.
- Slot mapping API/UI currently only supports materialCode/productCode/routing/priority/isAlternate.
- Loading history is not rendered in UI despite hook support.

# Progress
- Implemented loading record + slot mapping field support (server + web).
- Added loading history UI and updated plan/align docs for WP-9.

# Errors
-

# Open Questions
-

# References
- `domain_docs/mes/plan/phase4_tasks.md`
- `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`
- `apps/server/src/modules/mes/loading/*`
- `apps/web/src/routes/_authenticated/mes/loading/*`
