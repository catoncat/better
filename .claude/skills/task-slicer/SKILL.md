---
name: task-slicer
description: 'Split a repo task into 2-6 conflict-friendly slices with explicit commit checkpoints. Use when starting a non-trivial task, when the user asks for a plan (拆分任务/拆分 plan/切片), or when small-step commits are desired (小步提交/多次 commit). Outputs a slice plan with staged file hints and commit message suggestions.'
---

# Task Slicer

## Goal

Turn one task into a short sequence of independently committable slices.

## Workflow

0. Run `git status` and call out a dirty tree before planning.
1. Identify the task source:
   - Prefer a plan item reference (e.g. `domain_docs/**/plan/*.md`).
   - If missing, ask the user for the task title + expected behavior + touched areas.
2. Enumerate touch points:
   - `db`: Prisma/schema, migrations, generated client
   - `server`: routes, services, permissions, tests
   - `web`: routes, hooks, UI components
   - `docs`: specs/align/plan/conversation notes
   - `scripts`: deterministic helpers
3. Propose 2-6 slices:
   - Each slice: clear goal, success criteria, likely files, commit message.
   - Minimize shared-file conflicts between slices.
4. Ask the user to confirm the slice plan.
5. After confirmation:
   - Commit after each slice. Do not wait for the entire task.
   - If a `worktree_notes/<branchSlug>.md` exists, keep the slice checklist there so progress/status questions can be answered without re-triage.

## Output Format

- Slice 1: `<name>`
  - Goal: `<1 line>`
  - Files: `<paths or globs>`
  - Commit: `<type>(<scope>): <summary>`
- Slice 2: ...
- Conflicts:
  - `<slice>` overlaps `<slice>`: `<shared touch point>`

## Defaults (Suggested Slice Shapes)

- Plan/docs slice first (if needed)
- DB slice (if needed)
- Server slice
- Web slice
- Align + plan backfill slice
