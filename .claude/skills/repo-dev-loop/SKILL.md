---
name: repo-dev-loop
description: 'Repo-wide default development workflow for this repository. Use when the user asks to implement/build/fix/refactor/change code or docs (实现/开发/修复/重构/改代码/改文档). Enforces git-status preflight, worktree decision, task slicing, small-step commits, conversation sync notes, and bun-based verification (lint/typecheck) in the worktree being merged.'
context: fork
---

# Repo Dev Loop

## Workflow

| Step | Action |
|------|--------|
| 0 | Preflight per `AGENTS.md` (`git status`, call out dirty tree) |
| 1 | Worktree? High-churn or dirty tree → recommend `bun scripts/worktree-new.ts <branch> <path> --task ...` (writes `worktree_notes/`) |
| 2 | Slice (2-6): use `task-slicer`; prefer independently committable slices |
| 3 | Implement slice-by-slice; if the user hasn’t asked for commits, ask before running `git commit` |
| 4 | If discussion/plan/decision happened: write a `conversation/` note (`bun scripts/conversation-new.ts`) |
| 5 | Verify before merge: `bun scripts/smart-verify.ts` (doc-only skips; `--force` overrides) |

## Guardrails

- Don’t run full triage for progress/status questions; use `worktree-status` instead.
