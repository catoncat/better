# Worktree Notes

`worktree_notes/` stores branch-scoped task context and progress so worktrees keep their own “what am I doing” state.

## Why

- Creating a worktree should carry task context into the branch directory.
- Asking “这个分支做到哪了 / 还差什么” inside a worktree should not trigger full repo triage.
- Progress updates should be safe and low-conflict (automation edits only the AUTO block).

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

