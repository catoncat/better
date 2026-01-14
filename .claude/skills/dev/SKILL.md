---
name: dev
description: 'Repo-wide development workflow. Use when the user asks to implement/build/fix/refactor/change code or docs (实现/开发/修复/重构/改代码/改文档). Enforces git-status preflight, worktree decision, task slicing, small-step commits, and bun-based verification. For MES features, also enforces MES doc contract.'
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
    - "MES 上料"
    - "MES OQC"
  negative:
    - "现在做什么" # → mes-next
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
- For MES work, keep canonical progress/status in `domain_docs/mes/plan/*` (worktree notes are branch-local execution context, not the source of truth).
- After every ~2 read/view/search operations, write the takeaway to `Findings` in the relevant note.
- Before major decisions (or after context switches), re-read the relevant plan/note.
- On failures: log error + attempts + next approach; do not retry the exact same action repeatedly.

## MES-Specific Rules

When touching `apps/server/src/modules/mes`, `apps/web/src/routes/_authenticated/mes`, or `domain_docs/mes`:

### Doc Contract (Do Not Violate)

- **Plan**: progress tracking lives only in `domain_docs/mes/plan/`
- **Flow**: `domain_docs/mes/spec/process/*` is diagram + notes only. No status tables.
- **Align**: `domain_docs/mes/spec/impl_align/*` is node-to-API mapping only. No status.
- **No emoji** in `domain_docs/mes`

### MES Workflow Additions

1. Require a reference to `domain_docs/mes/plan/*`
2. Confirm MES scope: states affected? failure branch? UI entry point?
3. After code lands: update corresponding align file
4. Sanity check: `rg -nP \"\p{Extended_Pictographic}\" domain_docs/mes` (must be empty)

## Commit Checkpoints

Commit after each slice (don't wait until the end):
- Plan/docs updates
- Schema/migration
- API/service
- UI
- Align backfill

## Guardrails

- For "what next" questions: use `mes-next` instead
- For "progress/status" questions: use `worktree-status` instead
