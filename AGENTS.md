# Repository Guidelines

> **Note**: `CLAUDE.md` and `GEMINI.md` are symlinks to this file. Only edit `AGENTS.md`.

## Non-Negotiables
- Always use **bun**.
- Use **biome** for linting and formatting.
- Use **tsc** for type checking.
- Ask clarifying questions before coding if anything is unclear.

## Quick Start (Local Dev)
- Read `agent_docs/00_onboarding/setup.md` and follow the steps.

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
- List page:
  1. `agent_docs/02_frontend/data_list_pattern.md`
  2. `agent_docs/02_frontend/list_sorting.md`
- Create/Edit dialog:
  1. `agent_docs/02_frontend/create_edit_dialog.md`
- UI labels for enums:
  1. `agent_docs/02_frontend/localization_constants.md`

## Backend / API / Auth / Notifications
- New API endpoint:
  1. `agent_docs/03_backend/api_patterns.md`
- Auth changes:
  1. `agent_docs/03_backend/auth_better_auth.md`
- Notifications:
  1. `agent_docs/03_backend/notifications.md`
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

## Quality and Release
- Before commit or PR:
  1. `agent_docs/01_core/testing_quality.md`

## References (Only When Needed)
- `agent_docs/99_reference/elysia_reference.md`
- `agent_docs/99_reference/shadcn_ui.md`
- `agent_docs/99_reference/shadcn_charts.md`
