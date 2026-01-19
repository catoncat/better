# Context
- User asked to review `domain_docs/mes/plan/tasks.md` for newly added issues and plan fixes.
- Working tree is dirty; user requested using a worktree.

# Decisions
- Use a new worktree via `bun scripts/worktree-new.ts` before making changes.

# Plan
- [ ] Create a worktree and capture branch-scoped notes.
- [ ] Slice tasks from section 5.1 into prioritized fixes (start with P0).
- [ ] Implement fixes in small commits per slice.

# Findings
- `domain_docs/mes/plan/tasks.md` section 5.1 lists eight UX/bug items for loading flow; only one P0: 5.1.8 LOADING readiness passes when feeder slots exist but RunSlotExpectation is empty.
- Other items are P1/P2 (run detail "前往上料" entry, loading run selector, error messages, idempotent scan feedback, etc.).

# Progress
- None yet.

# Errors
- None.

# Open Questions
- Which items to fix in this pass? (suggest starting with P0 5.1.8, then selected P1s).
- Branch name and worktree path to use.

# References
- `domain_docs/mes/plan/tasks.md`
