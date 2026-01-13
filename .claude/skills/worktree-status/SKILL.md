---
name: worktree-status
description: "Report current branch/worktree progress (分支进度/做到哪/还差什么/worktree 状态). Reads and updates `worktree_notes/<branchSlug>.md` (AUTO status block) and reports next steps; do not triage/slice unless explicitly asked."
context: fork
---

# Worktree Status

## Triggers

- “这个分支做到哪了 / 还差什么 / 进度如何 / 当前任务完成怎么样”
- “worktree 状态 / branch status / progress”

## Workflow

| Step | Action |
|------|--------|
| 0 | Preflight per `AGENTS.md` (`git status`, call out dirty tree) |
| 1 | Update note (deterministic): `bun scripts/worktree-note-status.ts` |
| 2 | Read `worktree_notes/<branchSlug>.md` and report: task summary + slices + changed files + suggested next step |

## Guardrails

- Do not run `mes-triage` / `task-slicer` for progress questions unless explicitly asked to “重新拆分/重新 triage”.
- Do not rewrite non-AUTO sections of the note without explicit user instruction.

