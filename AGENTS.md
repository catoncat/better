# Repository Guidelines

> **Note**: `CLAUDE.md` and `GEMINI.md` are symlinks to this file. Only edit `AGENTS.md`.

## Non-Negotiables
- Always use **bun**.
- Use `bun run lint` / `bun run format` (Biome) for linting and formatting.
- Use `bun run check-types` (tsc) for type checking.
- Start each task/turn with `git status` (if not clean, call it out before proceeding).
- **Update Docs with Code**: If implementation diverges from specs (in `agent_docs` or `domain_docs`), update the documentation *before* or *during* the PR. Docs must reflect reality.
- This is a greenfield system; do not assume legacy/transition behavior.
- If unsure whether something is legacy-related, check existing implementation or database data first; ask only if still unclear.
- Ask clarifying questions before coding if anything is unclear.

## Quick Start (Local Dev)
- Read `agent_docs/00_onboarding/setup.md` and follow the steps.

## Workflow & Planning
- **Follow the Plan**: When implementing a feature/domain, verify if a specific plan exists (e.g., `domain_docs/mes/plan/phase2_tasks.md`).
- **Mark Progress**: As you complete tasks in a plan file, update the file to mark them as done (e.g., `[x] Task 1.1`).
- **Update the Plan**: If new tasks are discovered or priorities change, update the plan file to reflect the new reality.
- **What Next (Triage)**: Group candidates into 2-4 parallelizable tracks and call out conflicts (shared touch points) explicitly.
- **Worktree**: If `git status` is not clean or the task is high-churn, recommend a dedicated `git worktree` + branch. When a user picks a task/track, ask whether to set up a worktree now.
- **Small-Step Commits**: Commit after each coherent slice (plan/docs/schema/api/ui) or completed plan checkbox; do not wait for full task completion. If you must stop mid-way, make a `wip:` commit and continue in the next commit.
- **Conversation Sync**: If a response includes discussion/plan/decision, also write a note to `conversation/YYYY-MM-DD_HHMMSS_<topic>.md` (timestamp via `date '+%Y-%m-%d_%H%M%S'`). If a plan was produced, include the plan content.
  - Template: Context, Decisions, Plan, Open Questions, References
- **Repo Skills**: Canonical skills live in `.claude/skills` (shared); `.codex/skills` is a symlink. Prefer `repo-dev-loop`, `task-slicer`, `small-step-commits`, `mes-triage`, `mes-implement`.
- **Worktree Cleanup**: When a worktree task is finished, remove the worktree and delete the branch (prefer `worktree-cleanup`).

## Worktree Bootstrap (Recommended)

Use a worktree to avoid `bun run lint` / `bun run check-types` noise from other in-flight edits.

- Create: `git worktree add -b <branch> <path>`
- Setup (in the worktree root):
  - `bun install`
  - Copy server env if present: `cp <main>/apps/server/.env apps/server/.env`
  - Ensure `DATABASE_URL` in `apps/server/.env` is an absolute `file:` path (so worktrees share the same DB without symlinks).

Shortcut: `bun scripts/worktree-new.ts <branch> <path>` (creates the worktree, runs `bun install`, copies `apps/server/.env` if present, rewrites `DATABASE_URL` to the canonical main worktree `data/`).
Run it from the worktree that owns the canonical `apps/server/.env` and `data/` (typically the main checkout).

Cleanup (after merge):
- Remove: `git worktree remove <path>` (or `--force` to discard)
- Prune: `git worktree prune`
- Delete branch: `git branch -d <branch>` (or `-D`)

---

# LLM Router (Shortest Path)

Use the smallest set of docs needed for the task. Skip anything not required.

## Start Here (New to Repo)
1. `agent_docs/00_onboarding/project_overview.md`
2. `agent_docs/00_onboarding/setup.md`

## Core Rules (Before Coding)
1. `agent_docs/01_core/coding_standards.md`
2. `agent_docs/01_core/architecture_overview.md`
3. `agent_docs/01_core/datetime_handling.md` (only if working with dates)

## Frontend / UI / Router
- New page or UI change:
  1. `agent_docs/02_frontend/ui_system.md`
  2. `agent_docs/02_frontend/routing_tanstack.md`
- API Data Fetching / Error Handling:
  1. `agent_docs/02_frontend/api_client.md`
- List page:
  1. `agent_docs/02_frontend/data_list_pattern.md`
  2. `agent_docs/02_frontend/list_sorting.md`
- Create/Edit dialog:
  1. `agent_docs/02_frontend/create_edit_dialog.md`
- Form building:
  1. `agent_docs/02_frontend/form_building.md`
- UI labels for enums:
  1. `agent_docs/02_frontend/localization_constants.md`

## Backend / API / Auth / Notifications
- New API endpoint:
  1. `agent_docs/03_backend/api_patterns.md`
- Auth changes:
  1. `agent_docs/03_backend/auth_better_auth.md`
- Notifications:
  1. `agent_docs/03_backend/notifications.md`
- Audit logging:
  1. `agent_docs/03_backend/audit_logs.md`
- Instruments or calibrations domain:
  1. `agent_docs/03_backend/domain_instruments_calibrations.md`

## Data / DB / JSON Schema
- Schema or migration:
  1. `agent_docs/04_data/prisma.md`
- JSON field typing:
  1. `agent_docs/04_data/json_schema_types.md`

## Scheduled Tasks / Ops
- Cron job:
  1. `agent_docs/05_ops/cron_jobs.md`
- Observability (Jaeger):
  1. `agent_docs/05_ops/observability_jaeger.md`

## Quality and Release
- Before commit or PR:
  1. `agent_docs/01_core/testing_quality.md`
  2. Run `bun run lint` and `bun run check-types` in the branch/worktree you are about to merge.

## Domain Specs (MES)

**Note**: When implementing MES features, strictly follow engineering standards in `agent_docs`.

### Quick Context (Read First for MES Tasks)
- `domain_docs/mes/CONTEXT.md` - docs index + reading path

### Update Rules (MES Features)

| Event | Must Update | Optional |
|------|------|------|
| Add process node (design) | flow, plan | align (add when implemented) |
| Implement feature (land code) | align, plan | - |
| Refactor / path changes | align | - |
| Remove / defer feature | flow, plan | align (remove related rows) |

**PR Guardrail**: Any PR that changes implementation or lands a new node MUST update the corresponding align file.

### Process Specs (Source of Truth)
- End-to-End Flows: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- State Machines: `domain_docs/mes/spec/process/02_state_machines.md`
- SMP Flows: `domain_docs/mes/spec/process/03_smp_flows.md`
- DIP Flows: `domain_docs/mes/spec/process/04_dip_flows.md`

### Implementation Alignment
- E2E Align: `domain_docs/mes/spec/impl_align/01_e2e_align.md`
- SMP Align: `domain_docs/mes/spec/impl_align/03_smp_align.md`
- DIP Align: `domain_docs/mes/spec/impl_align/04_dip_align.md`

### Routing
- Routing Engine: `domain_docs/mes/spec/routing/01_routing_engine.md`

### Data Collection
- Data Collection Specs: `domain_docs/mes/spec/data_collection/01_data_collection_specs.md`

### Traceability
- Traceability Contract: `domain_docs/mes/spec/traceability/01_traceability_contract.md`

### Tech - DB
- Prisma Schema: `domain_docs/mes/tech/db/01_prisma_schema.md`

### Tech - API
- API Overview: `domain_docs/mes/tech/api/01_api_overview.md`

### Tests
- Acceptance Scenarios: `domain_docs/mes/tests/01_acceptance_scenarios.md`

### Plan
- Milestones: `domain_docs/mes/plan/01_milestones.md`
- Current Tasks: `domain_docs/mes/plan/phase2_tasks.md`

## References (Only When Needed)
- `agent_docs/99_reference/elysia_reference.md`
- `agent_docs/99_reference/shadcn_ui.md`
- `agent_docs/99_reference/shadcn_charts.md`
