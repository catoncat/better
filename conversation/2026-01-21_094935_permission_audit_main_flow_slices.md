# Context
- User selected track 1: continue permission-first audit fixes for MES main flow pages.
- Worktree `permission-audit` is active; config/ops + master data gating already landed.
- Need a slice plan with explicit commits before implementing main-flow changes.

# Decisions
- Keep permission-first gating (not role-based); prioritize flow continuity per `user_docs/demo/permission_audit_plan.md`.
- Require user confirmation on the slice plan before editing.
- Align work-order receive permission to `wo:receive`.
- For run detail flow cards (readiness/FAI/OQC/loading), show NoAccess placeholders when missing view permission.

# Plan
- Slice 1: Work orders + runs list gating
  - Goal: gate route/line filters, fix batch authorize UI visibility, align work-order receive permission.
  - Files: `apps/web/src/routes/_authenticated/mes/work-orders.tsx`, `apps/web/src/routes/_authenticated/mes/runs/index.tsx`, `apps/web/src/components/select/line-select.tsx`, `apps/web/src/hooks/use-work-orders.ts`
  - Commit: `feat(web): gate work-orders and runs list`
- Slice 2: Run detail flow gating
  - Goal: ensure readiness/FAI/OQC/units sections use view-permission `enabled` and show NoAccess for flow-critical cards; gate generate-units and loading links.
  - Files: `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`, related hooks already support `enabled`
  - Commit: `feat(web): gate run detail flow modules`
- Slice 3: Readiness + loading pages
  - Goal: readiness config/exceptions and loading pages query gating + hide/disable actions by permission.
  - Files: `apps/web/src/routes/_authenticated/mes/readiness-config.tsx`, `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx`, `apps/web/src/routes/_authenticated/mes/loading.tsx`, `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`, `apps/web/src/hooks/use-loading*.ts`
  - Commit: `feat(web): gate readiness and loading pages`
- Slice 4: Execution page gating
  - Goal: gate stations/queues/resolve-unit/data-specs queries and disable actions when missing exec permissions.
  - Files: `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/web/src/hooks/use-station*.ts`, `apps/web/src/hooks/use-execution*.ts`
  - Commit: `feat(web): gate execution page`
- Slice 5: Quality + trace pages
  - Goal: gate FAI/OQC lists, dialogs, OQC rules, defects, rework, trace; hide links without view perms.
  - Files: `apps/web/src/routes/_authenticated/mes/fai.tsx`, `apps/web/src/routes/_authenticated/mes/oqc.tsx`, `apps/web/src/routes/_authenticated/mes/oqc/rules.tsx`, `apps/web/src/routes/_authenticated/mes/defects.tsx`, `apps/web/src/routes/_authenticated/mes/rework-tasks.tsx`, `apps/web/src/routes/_authenticated/mes/trace.tsx`
  - Commit: `feat(web): gate quality and trace pages`

# Findings
- Remaining gaps are listed in `user_docs/demo/permission_audit_plan.md` for work-orders, runs, readiness, loading, execution, FAI/OQC, defects, rework, trace.
- Work-order receive UI uses `wo:receive` while API requires `system:integration`; needs alignment.

# Progress
- Completed config/ops and master data page gating and updated audit statuses.
- `bun scripts/smart-verify.ts` passes on current branch after formatting.

# Errors
- None in this slice planning step.

# Open Questions
- None.

# References
- `user_docs/demo/permission_audit_plan.md`
- `worktree_notes/permission-audit.md`
