---
name: task-queue-status
description: "View the current state of the multi-AI task queue (任务队列状态/task queue status/队列进度). Shows which tasks are pending, in progress, or completed."
context: fork
trigger_examples:
  positive:
    - "任务队列状态"
    - "队列进度"
    - "task queue status"
    - "task-queue-status"
    - "show task queue"
    - "谁在做什么"
    - "任务分配情况"
  negative:
    - "认领任务" # → claim-task
    - "现在做什么" # → mes-next
    - "这个分支进度" # → worktree-status
---

# Task Queue Status

## Goal

Display the current state of the shared task queue for multi-AI coordination visibility.

## Workflow

0. Preflight per `AGENTS.md`:
   - Run `git status` and call out if the tree is dirty

1. Check if `.scratch/task-queue.md` exists:
   - If not, inform user: "No task queue found. Run `/mes-next` to triage and create tasks."
   - Exit.

2. Read and parse `.scratch/task-queue.md`.

3. Display summary:
   - Total tasks
   - Pending count
   - In-progress count (with claimer info)
   - Completed count

4. Display detailed status for each slice:
   - Task name
   - Status (`pending` | `in_progress` | `completed`)
   - Claimed by (branch name if claimed)
   - Dependencies status

5. Highlight any issues:
   - Tasks blocked by incomplete dependencies
   - Long-running tasks (claimed > X hours ago)
   - Orphaned claims (branch no longer exists)

6. Reference scratch index (optional):
   - `.scratch/index.md` should list the latest triage note and active files.
   - Task queue history lives in `.scratch/task-queue-archive/` (managed by scripts).

## Output Format

```
# Task Queue Status

**Created**: 2026-01-23T12:00:00
**Source**: mes-next triage

## Summary
- Total: 4
- Pending: 1
- In Progress: 2
- Completed: 1

## Slices

| # | Task | Status | Claimed By | Started |
|---|------|--------|------------|---------|
| 1 | Implement SMT flow | completed | feat/smt-flow | 2026-01-23T10:00 |
| 2 | Add inspection step | in_progress | feat/inspection | 2026-01-23T11:00 |
| 3 | AOI data collection | in_progress | feat/aoi | 2026-01-23T11:30 |
| 4 | Traceability links | pending | - | - |

## Dependency Graph
- Slice 4 blocked by: Slice 2, Slice 3

---

To claim a pending task: `/claim-task`
To mark your task complete: update `.scratch/task-queue.md` Status to `completed`

If a completed task queue was superseded, it should have been archived to `.scratch/task-queue-archive/`.
If you want to archive the current queue manually:
`bun scripts/task-queue-archive.ts` (or `--force`).
```

## Guardrails

- Read-only operation; do not modify the task queue
- If file format is invalid, warn and suggest regenerating via `/mes-next`
