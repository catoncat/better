# Repository Guidelines

> **Note**: `CLAUDE.md` and `GEMINI.md` are symlinks to this file. Only edit `AGENTS.md`.

## Non-Negotiables
- Always use **bun**.
- Use **biome** for linting and formatting.
- Use **tsc** for type checking.
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
- **Worktree**: If `git status` is not clean or the task is high-churn, recommend a dedicated `git worktree` + branch.
- **Small-Step Commits**: Commit after each coherent slice, keep commits minimally scoped, and avoid mixing unrelated changes.
- **Conversation Sync**: If a response includes discussion/plan/decision, also write a note to `conversation/YYYY-MM-DD_HHMMSS_<topic>.md` (timestamp via `date '+%Y-%m-%d_%H%M%S'`).

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

## Domain Specs (MES)

**Note**: When implementing MES features, strictly follow engineering standards in `agent_docs`.

### Quick Context (Read First for MES Tasks)
- `domain_docs/mes/CONTEXT.md` - 文档索引 + 阅读路径导航

### Update Rules (MES Features)

| 事件 | 必改 | 可选 |
|------|------|------|
| 新增流程节点（设计） | flow, plan | align（等实现时补） |
| 完成功能（实现落地） | align, plan | - |
| 重构/路径变更 | align | - |
| 砍掉/推迟功能 | flow, plan | align（删除对应行） |

**PR 护栏**：任何实现变更/新增节点落地的 PR 必须同步更新对应 align 文件。

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
