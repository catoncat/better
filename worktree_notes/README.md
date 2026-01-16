# Worktree Notes

`worktree_notes/` stores branch-scoped task context and progress so worktrees keep their own "what am I doing" state.

## Why

- Creating a worktree should carry task context into the branch directory.
- Asking "这个分支做到哪了 / 还差什么" inside a worktree should not trigger full repo triage.
- Progress updates should be safe and low-conflict (automation edits only the AUTO block).

## Important: No notes for main branch

**不要为 main 分支创建 worktree note。** 原因：

1. `worktree_notes/` 的设计假设是"一分支一任务"
2. main 是稳定分支，不应该有"进行中的任务"
3. 多个 AI/用户可能同时在 main 上工作，共享一个 note 会导致混乱

**在 main 分支上工作时**：
- 调查/讨论 → 用 `conversation/` 记录
- 要写代码 → 创建 feature 分支 + worktree

## Naming (one note per branch)

- Path: `worktree_notes/<branchSlug>.md`
- `branchSlug` rules:
  - `/` → `__`
  - other non `[A-Za-z0-9._-]` → `_`
  - example: `feat/mes/material-binding` → `feat__mes__material-binding.md`

This avoids merge conflicts across multiple feature branches (each branch writes its own note file).

## Auto-update contract

Automation may update only the status block:

```md
<!-- AUTO:BEGIN status -->
... auto-managed ...
<!-- AUTO:END status -->
```

Everything else is human-owned unless explicitly requested.

## Recommended flow

1. Create worktree with context (preferred):
   - `bun scripts/worktree-new.ts <branch> <path> --task "..." --plan ... --plan-item ... --triage ... --touch ... --slice ...`
2. First commit in the new branch:
   - `git add worktree_notes/*.md`
   - `git commit -m "docs(worktree): add task context"`

