---
name: mes-triage
description: 'Repo-specific MES next-work triage (global plan). Use when the user asks what to build next / next tasks / which milestone to do next for MES in this repo (e.g., "接下来开发什么/下一步做什么"). Not for current branch/worktree progress; use `worktree-status` for "做到哪/进度/完成怎么样". Read domain_docs/mes/CONTEXT.md and domain_docs/mes/plan/*, then output 2-4 parallelizable tracks with 3-5 candidates total and ask the user to pick one. Do not modify code/docs/plan during triage unless explicitly asked (except the required conversation sync note).'
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
    - "MES 待办"
    - "what's next"
    - "next task"
    - "what to build"
  negative:
    - "做到哪了" # → worktree-status
    - "进度怎么样" # → worktree-status
    - "这个分支完成了吗" # → worktree-status
    - "帮我实现 XXX" # → mes-implement
---

# MES Triage

## Goal

Select the next MES development target from the plan, then ask the user to choose one item before implementation.

## Workflow

0. Run `git status` (if not clean, call it out before proceeding).
0. Optional deterministic baseline (control plane):
   - Run: `bun scripts/workflow-run.ts agent_workflows/mes-triage.json`
   - This writes step-level artifacts to `.spec-workflow/` (gitignored) and writes a triage note under `conversation/`.
1. Worktree preflight (for parallel work):
   - Run `bun scripts/worktree-scan.ts` and capture the output.
   - Treat any non-current worktree that is `dirty` or `ahead` as "in-flight".
   - Use the touched areas/files as conflict signals when proposing parallel tracks.
1. Read the minimum docs:
   - `domain_docs/mes/CONTEXT.md`
   - `domain_docs/mes/plan/phase2_tasks.md`
   - `domain_docs/mes/plan/01_milestones.md`
2. Build a shortlist of 3-5 candidates:
   - Prefer items that are `[ ]` or `[~]` in `phase2_tasks.md`
   - Call out dependencies explicitly (what must be done first)
   - Keep each candidate one paragraph max
3. Group the shortlist into 2-4 parallelizable tracks:
   - Track = a set of tasks that do not block each other (avoid shared touch points like Prisma schema, `execution/service.ts`, routing engine).
   - Explicitly list conflicts (what cannot be done in parallel).
4. Produce the triage output (tracks + conflicts) in the Output Format below.
5. Sync triage output to a conversation note BEFORE asking the user to pick:
   - Create a note: `bun scripts/conversation-new.ts "mes-triage_<topic>"`
   - Paste the full triage output into the note (include Worktree Scan, Tracks, Candidates, Conflicts, and the selection prompt).
   - Do not save only the chosen track; the note must preserve all options for parallel agents.
6. Output the tracks + candidates to the user, then ask the user to pick one track or one candidate.
   - Also ask whether they want a dedicated worktree for the chosen item (recommended if they will run another track in parallel or run full lint/typecheck).
   - If yes, propose using `bun scripts/worktree-new.ts <branch> <path> --task ... --plan ... --plan-item ... --triage ...` so the new worktree carries context into `worktree_notes/`.
7. After the user picks:
   - Update the SAME triage note (append a short "Selected" section with the chosen track/task and any worktree decision).
8. After the user picks, switch to the implementation workflow (use `mes-implement`).

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

- Only write/update the conversation note; do not modify code/docs/plan during triage unless the user explicitly asks.
- Do not create worktrees or switch branches unless the user explicitly asks.
- Do not invent new tasks outside `domain_docs/mes/plan/` without proposing them as plan additions first.
- If the user is asking about "progress/status" of the current branch/worktree, use `worktree-status` instead of re-triaging.
