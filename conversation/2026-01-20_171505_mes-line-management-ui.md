# Context
- Add MES 产线管理（Line master data）UI + API so users can create/edit/delete lines instead of editing DB/scripts.
- Existing repo has processType on Line and Routing; current UI only exposes processType change inside readiness config.

# Decisions
- Add a dedicated Line Management page under “工艺与主数据” with list + create/edit/delete.
- Allow delete only when the line has no dependent records; otherwise return a clear error message with guidance.
- Use a dedicated permission for line management to avoid overloading readiness/system permissions.

# Plan
1. Read required repo docs (core, backend API patterns, frontend list/dialog/form patterns, routing).
2. Add permissions + backend CRUD endpoints for Line (list, detail, create, update, delete with dependency checks).
3. Add web list page + create/edit dialog; wire permissions; add nav entry.
4. Update MES plan/align docs if required; run verification as possible.

# Findings
- Worktree is dirty: `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` and an older conversation note are modified; avoid touching.

# Progress
- Created conversation note.

# Errors
- None.

# Open Questions
- None.

# References
- Repo root: /Users/envvar/lzb/better

# Findings (Dev/Task-Split)
- Workflow requires: dirty tree callout, slice plan with commit checkpoints, update MES plan/align, and avoid emoji in domain_docs/mes.
- Task-split expects 2-6 slices with file hints and commit messages, and to persist the slice plan in conversation/worktree notes.

# Findings (Commits/API)
- Small-step commits required with scoped commit messages; stage only relevant files per slice.
- Backend endpoint workflow: read api_patterns.md, define contract, implement schema/routes/service, add audit success/fail.

# Findings (Web)
- List page must use DataListLayout in server mode with table+card views and URL search syncing; canonical example is runs list.
- Create/edit dialog should use Eden types + Zod + TanStack Form, with parent owning mutation state and dialog owning form state.

# Findings (Notes/Core)
- Use conversation note template for decisions/plans; keep structured sections.
- Frontend API types must be inferred from Eden; no manual types; use constants.ts for enum labels.

# Findings (Core/API)
- Backend uses controller-service split with TypeBox schemas and explicit audit logging for writes.
- Use envelope responses and standard error codes; multi-step writes use transactions.

# Findings (Frontend Base)
- UI must use semantic tokens (no hardcoded colors), Chinese copy, and standard shadcn components; inputs full width.
- TanStack Router file-based routes with createFileRoute + validateSearch for URL params.

# Findings (List Pattern)
- List pages must use DataListLayout (server mode), provide table + card view, sync URL search, and avoid an “All” preset.
- Master data lists should default sort by business identifier ascending (with stable fallback).

# Findings (Dialog/Form)
- Create/edit dialog: parent owns mutation state; dialog owns form; use Zod schema + TanStack Form with Eden-inferred types.
- Forms require full-width inputs, validation space reserved, and normalization of empty strings.

# Findings (API Client/Quality)
- Web hooks must use `unwrap` with Eden; custom error handling via ApiError when needed.
- Verification should use `bun scripts/smart-verify.ts` (code changes run lint + typecheck).

# Findings (Plan Files)
- MES plan files present: `domain_docs/mes/plan/phase4_tasks.md`, `domain_docs/mes/plan/tasks.md`, and `01_milestones.md`.

# Errors (Plan Files)
- `domain_docs/mes/plan/phase3_tasks.md` not found; do not retry that path.

# Findings (MES Plan)
- M3 tracking is in `domain_docs/mes/plan/tasks.md` (completed); M4 planning in `phase4_tasks.md`.
- New line management work is not currently listed; plan update needed to track the task.

# Findings (Align)
- Align files focus on process nodes; no current entry for Line master data. If we add Line management, decide whether to add a new row under “路由/主数据同步闭环”.

# Findings (Line Module)
- Line schema exposes list + update schema limited to processType only; service only updates processType.
- Need to extend schema/service/routes for full CRUD + validation and add delete checks.

# Findings (Web Routes)
- `apps/web/src/routes/_authenticated/mes/work-centers/index.tsx` exists and can serve as master-data list example.

# Errors (Search)
- `rg --files -g "*work-centers*"` returned nothing; use direct folder listing instead.

# Findings (List Examples)
- `mes/work-centers` list uses DataListLayout with URL-synced filters/sorting; can follow its structure for master data.
- `mes/runs` list uses DataListLayout + card view (RunCard); use as reference for card rendering.

# Findings (Server Patterns)
- Master data list endpoints live under `mes/master-data` with `ROUTE_READ` permission; list routes return raw data without envelope handling here.
- Line module is separate; CRUD can follow line module with audit and envelope responses.

# Findings (Permissions)
- Permissions are centralized in `packages/db/src/permissions/permissions.ts` with grouped labels for UI; new permission should be added there.
