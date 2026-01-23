---
name: next
description: 'Repo-wide next-work triage (global plan). Use when the user asks what to build next / next tasks / which milestone to do next (e.g., "接下来开发什么/下一步做什么"). Not for current branch/worktree progress; use `worktree-status` for "做到哪/进度/完成怎么样". Reads task sources from AGENTS.md (## Task Sources), outputs 2-4 parallelizable tracks with 3-5 candidates total, and asks the user to pick one. Do not modify code/docs/plan during triage unless explicitly asked (except the required conversation sync note).'
context: fork
trigger_examples:
  positive:
    - "现在做什么"
    - "做什么"
    - "干什么"
    - "下一步"
    - "接下来"
    - "下个任务"
    - "先做哪个"
    - "优先做什么"
    - "待办"
    - "what's next"
    - "next task"
    - "what to build"
  negative:
    - "做到哪了" # → worktree-status
    - "进度怎么样" # → worktree-status
    - "这个分支完成了吗" # → worktree-status
    - "帮我实现 XXX" # → dev
---

# Next

## Goal

Select the next development target from the plan, then ask the user to choose one item before implementation.

## Configuration

This skill reads task sources from `AGENTS.md`. Look for the `## Task Sources` section which defines:

- **Context File** (optional): A file to read first for domain context (e.g., `domain_docs/mes/CONTEXT.md`)
- **Plan Directory**: Directory containing task/plan files (e.g., `domain_docs/mes/plan/`)
- **Milestones**: File listing milestones (e.g., `domain_docs/mes/plan/01_milestones.md`)
- **Current Tasks**: File listing current tasks (e.g., `domain_docs/mes/plan/tasks.md`)

If `## Task Sources` is not found in `AGENTS.md`, prompt the user to configure it.

## Workflow

0. Run `git status` (if not clean, call it out before proceeding).
1. **Read task sources from AGENTS.md**:
   - Parse `AGENTS.md` to find the `## Task Sources` section
   - If not found, inform the user and ask them to configure it
2. Worktree preflight (for parallel work):
   - Run `bun scripts/worktree-scan.ts` and capture the output.
   - Treat any non-current worktree that is `dirty` or `ahead` as "in-flight".
   - Use the touched areas/files as conflict signals when proposing parallel tracks.
3. Read the minimum docs (from Task Sources config):
   - Context file (if defined)
   - Current tasks file
   - Milestones file (if defined)
4. Build a shortlist of 3-5 candidates:
   - Prefer items that are `[ ]` or `[~]` in the tasks file
   - Call out dependencies explicitly (what must be done first)
   - Keep each candidate one paragraph max
5. Group the shortlist into 2-4 parallelizable tracks:
   - Track = a set of tasks that do not block each other (avoid shared touch points)
   - Explicitly list conflicts (what cannot be done in parallel)
6. Produce the triage output (tracks + conflicts) in the Output Format below.
7. **Write task queue for multi-AI coordination**:
   - Write to `.scratch/task-queue.md` using the Task Queue Format below.
   - This allows other AI sessions to claim pending tasks.
8. Sync triage output to a conversation note BEFORE asking the user to pick:
   - Create a note: `bun scripts/conversation-new.ts "next_<topic>"`
   - Paste the full triage output into the note (include Worktree Scan, Tracks, Candidates, Conflicts, and the selection prompt).
   - Do not save only the chosen track; the note must preserve all options for parallel agents.
9. Output the tracks + candidates to the user, then ask the user to pick one track or one candidate.
   - Also ask whether they want a dedicated worktree for the chosen item (recommended if they will run another track in parallel or run full lint/typecheck).
   - If yes, propose using `bun scripts/worktree-new.ts <branch> <path> --task ... --plan ... --plan-item ... --triage ...` so the new worktree carries context into `worktree_notes/`.
   - **Mention**: "Task queue written to `.scratch/task-queue.md`. Other AI sessions can run `/claim-task` to pick up remaining tasks."
10. After the user picks:
    - Update the SAME triage note (append a short "Selected" section with the chosen track/task and any worktree decision).
    - Update `.scratch/task-queue.md` to mark the selected slice as `in_progress` and set `Claimed By` to the branch name.
11. After the user picks, switch to the implementation workflow (use `dev`).

## Output Format

Use this structure:

- Track A: `<theme>`
  - Candidates:
    - `<name>`: why now `<1 line>`; depends on `<1 line>`; touch points `<plan/flow/align/code>`
    - `<name>`: ...
- Track B: ...
- Conflicts:
  - `<Track A>` blocks `<Track B>`: `<reason>`

End with: "Pick one; I will confirm scope and start plan-first implementation."

## Guardrails

- Only write/update the conversation note and task queue; do not modify code/docs/plan during triage unless the user explicitly asks.
- Do not create worktrees or switch branches unless the user explicitly asks.
- Do not invent new tasks outside the configured plan directory without proposing them as plan additions first.
- If the user is asking about "progress/status" of the current branch/worktree, use `worktree-status` instead of re-triaging.

## Task Queue Format

Write to `.scratch/task-queue.md` with this structure:

```markdown
# Task Queue
Created: <ISO timestamp>
Source: next triage

## Slices

### Slice 1: <task name>
- **Status**: pending
- **Claimed By**: -
- **Branch**: -
- **Started At**: -
- **Depends On**: -
- **Touch Points**: <list key files/areas>

### Slice 2: <task name>
- **Status**: pending
- **Claimed By**: -
- **Branch**: -
- **Started At**: -
- **Depends On**: Slice 1 (if applicable)
- **Touch Points**: <list key files/areas>

---

## Progress Summary
- Total: 2
- pending: 2
- in_progress: 0
- completed: 0
```

When a task is claimed:
- Set `Status` to `in_progress`
- Set `Claimed By` to the branch name (e.g., `feat/smt-inspection`)
- Set `Started At` to ISO timestamp
