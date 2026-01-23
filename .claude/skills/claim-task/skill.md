---
name: claim-task
description: "Claim a pending task from the task queue for multi-AI coordination (认领任务/claim task/领取任务). Use when starting a new AI session to pick up work from `.scratch/task-queue.md`."
context: fork
trigger_examples:
  positive:
    - "认领任务"
    - "领取任务"
    - "claim task"
    - "pick up a task"
    - "有什么任务可以做"
    - "继续之前的任务"
  negative:
    - "现在做什么" # → mes-next (for triage)
    - "任务队列状态" # → task-queue-status
---

# Claim Task

## Goal

Allow an AI session to claim a pending task from the shared task queue (`.scratch/task-queue.md`) for multi-AI coordination.

## Workflow

1. Check if `.scratch/task-queue.md` exists:
   - If not, inform the user: "No task queue found. Run `/mes-next` to triage and create tasks first."
   - Exit.

2. Read `.scratch/task-queue.md` and parse slices.

3. Get current branch name:
   - Run `git branch --show-current`
   - This will be used as the claimer identifier.

4. Find available tasks:
   - Filter slices with `Status: pending`
   - Check `Depends On` field; only show tasks whose dependencies are `completed`
   - Display available tasks to user.

5. If no tasks available:
   - If all are `completed`: "All tasks are done! 🎉"
   - If all are `in_progress`: "All tasks are claimed. Check `/task-queue-status` for details."
   - If blocked by dependencies: "Remaining tasks are blocked by in-progress work."

6. Let user pick a task (or auto-claim if only one available).

7. Update `.scratch/task-queue.md`:
   - Set the chosen slice's `Status` to `in_progress`
   - Set `Claimed By` to current branch name
   - Set `Started At` to current ISO timestamp
   - Update the Progress Summary counts

8. Suggest next steps:
   - If not in a feature branch/worktree, recommend creating one:
     `bun scripts/worktree-new.ts <branch> <path> --task "<task title>"`
   - Otherwise, proceed with implementation.

## Output Format

```
## Available Tasks

1. **Slice 2: Implement SMT inspection**
   - Depends On: - (no blockers)
   - Touch Points: apps/server/src/modules/mes/smt-inspection/

2. **Slice 3: Add AOI data collection**
   - Depends On: Slice 2
   - Touch Points: apps/server/src/modules/mes/aoi/

---

Which task do you want to claim? (Enter number or "skip")
```

## Conflict Prevention

- Before claiming, verify the task is still `pending` (another AI might have claimed it)
- If conflict detected, re-read the file and show updated list
- Use branch name as identifier (auto-detected, human-readable)

## Guardrails

- Do not modify code or docs; only update `.scratch/task-queue.md`
- Do not create worktrees unless user explicitly asks
- If task queue format is invalid, warn and suggest running `/mes-next` again
