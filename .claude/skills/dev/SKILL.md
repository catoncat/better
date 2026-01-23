---
name: dev
description: 'Repo-wide development workflow. Use when the user asks to implement/build/fix/refactor/change code or docs (实现/开发/修复/重构/改代码/改文档). Enforces git-status preflight, worktree decision, task slicing, small-step commits, and bun-based verification. For domain-specific features, also enforces doc contracts defined in AGENTS.md.'
context: fork
trigger_examples:
  positive:
    - "帮我实现"
    - "开发这个功能"
    - "修复 bug"
    - "重构"
    - "改一下代码"
    - "implement"
    - "build this"
    - "fix this"
  negative:
    - "现在做什么" # → next
    - "进度怎么样" # → worktree-status
---

# Dev

## Workflow

| Step | Action |
|------|--------|
| 0 | Preflight: `git status` (if dirty, ask to stash/commit or use worktree) |
| 1 | Worktree? High-churn or dirty → `bun scripts/worktree-new.ts <branch> <path> --task ...` |
| 2 | Slice (2-6): break into independently committable slices |
| 3 | Implement slice-by-slice with small-step commits |
| 4 | If discussion/plan/decision: write a `conversation/` note |
| 5 | Verify before merge: `bun scripts/smart-verify.ts` |
| 6 | After merge: clean up worktree if used |

## Persistent Planning (Files As Memory)

- Branch-scoped plan/progress lives in `worktree_notes/<branchSlug>.md` (Slices + checkboxes + Decisions + Errors).
- Cross-cutting decisions/research live in `conversation/*.md` (paste plans/checklists verbatim so another agent can resume).
- For domain work with custom plan directories (see `## Task Sources` in AGENTS.md), keep canonical progress/status in the domain plan directory (worktree notes are branch-local execution context, not the source of truth).
- After every ~2 read/view/search operations, write the takeaway to `Findings` in the relevant note.
- Before major decisions (or after context switches), re-read the relevant plan/note.
- On failures: log error + attempts + next approach; do not retry the exact same action repeatedly.

## Domain-Specific Rules

When working in a domain with custom rules (defined in AGENTS.md), follow the domain's doc contract and workflow additions.

Check `AGENTS.md` for:
- `## Domain Specs` sections (e.g., MES, Instruments, etc.)
- Update rules for the domain (what to update when code changes)
- Doc contracts (which files serve which purpose)

For this repo, see `AGENTS.md` > `## Domain Specs (MES)` for MES-specific rules including:
- Doc contracts for plan/flow/align files
- Workflow additions (align file updates, emoji checks)
- PR guardrails

## Commit Checkpoints

Commit after each slice (don't wait until the end):
- Plan/docs updates
- Schema/migration
- API/service
- UI
- Align backfill

## Guardrails

- For "what next" questions: use `next` instead
- For "progress/status" questions: use `worktree-status` instead
