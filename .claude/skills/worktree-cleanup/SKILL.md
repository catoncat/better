---
name: worktree-cleanup
description: "Clean up finished git worktrees and branches (删除 worktree/清理 worktree/prune/删分支). Use when a task is done and the user wants to remove a worktree directory and delete the associated local/remote branch."
trigger_examples:
  positive:
    - "删除 worktree"
    - "清理 worktree"
    - "删分支"
    - "清理分支"
    - "任务完成了，清理"
    - "remove worktree"
    - "delete branch"
    - "cleanup"
    - "prune"
  negative:
    - "创建 worktree" # → worktree-bootstrap
    - "worktree 状态" # → worktree-status
---

# Worktree Cleanup

## Goal

Remove completed worktrees and delete no-longer-needed branches to keep parallel development manageable.

## Workflow

0. Preflight:
   - Ensure you are NOT inside the worktree directory you plan to remove.
   - Run `git worktree list`.
1. Remove the worktree:
   - `git worktree remove <path>`
   - If it refuses due to local changes you intentionally want to discard:
     - `git worktree remove --force <path>`
2. Prune stale worktree metadata:
   - `git worktree prune`
3. Delete the local branch (after worktree is removed):
   - If already merged: `git branch -d <branch>`
   - If not merged but you still want to delete: `git branch -D <branch>`
4. Delete the remote branch (only if it exists and was pushed):
   - `git push origin --delete <branch>`
   - `git fetch --prune`

## Guardrails

- Never remove the current worktree.
- If unsure whether the branch is merged, check:
  - `git branch --merged main`
- If the branch is still checked out by another worktree, remove that worktree first.
