---
type: conversation
createdAt: "2026-01-19T19:36:17.000Z"
source: "conversation-new"
---

# Context
- User requested to continue; next workstream is 5.3 API error handling audit in `domain_docs/mes/plan/tasks.md`.
- Working tree is dirty with user edits under `domain_docs/mes/spec/process/compair/` and untracked reports; avoid touching those files.

# Decisions
- Proceed with a sliced audit/implementation plan for 5.3 to keep commits small and conflict-free.

# Plan
- Slice 1: Audit scaffold + status
  - Goal: establish audit checklist tracking, identify shared error handling utility touch points, and mark 5.3 as in progress.
  - Files: `domain_docs/mes/plan/tasks.md`, `apps/web/src/lib/api-error.ts` (or new helper), `apps/web/src/hooks/*` (if needed).
  - Commit: `chore(mes): start API error handling audit`
- Slice 2: Readiness + Loading
  - Goal: ensure backend returns consistent error codes/messages and frontend surfaces toasts for readiness/loading flows.
  - Files: `apps/server/src/modules/mes/readiness/*`, `apps/server/src/modules/mes/loading/*`, `apps/web/src/hooks/use-loading.ts`, `apps/web/src/routes/_authenticated/mes/loading/*`.
  - Commit: `fix(mes): surface readiness/loading API errors`
- Slice 3: Runs + Execution + FAI
  - Goal: normalize errors and toasts for run authorize/detail, execution track-in/out, FAI flows.
  - Files: `apps/server/src/modules/mes/run/*`, `apps/server/src/modules/mes/execution/*`, `apps/server/src/modules/mes/fai/*`, `apps/web/src/hooks/use-runs.ts`, `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/web/src/routes/_authenticated/mes/fai.tsx`, `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
  - Commit: `fix(mes): normalize run/execution/FAI error feedback`
- Slice 4: OQC + MRB + Trace + audit closeout
  - Goal: finalize error handling in quality/trace endpoints and update audit table status.
  - Files: `apps/server/src/modules/mes/oqc/*`, `apps/server/src/modules/mes/oqc/mrb-service.ts`, `apps/server/src/modules/mes/trace/*`, `apps/web/src/routes/_authenticated/mes/oqc.tsx`, `apps/web/src/routes/_authenticated/mes/defects.tsx`, `domain_docs/mes/plan/tasks.md`.
  - Commit: `fix(mes): complete 5.3 API error audit`

# Findings
- 5.3 audit is still marked "待启动" with module checklist empty in `domain_docs/mes/plan/tasks.md`.

# Progress
- Plan drafted; no code changes yet for 5.3.

# Errors
- None.

# Open Questions
- Whether to add a shared error-code registry or keep localized fixes only.

# References
- `domain_docs/mes/plan/tasks.md`
- `apps/web/src/lib/api-error.ts`
