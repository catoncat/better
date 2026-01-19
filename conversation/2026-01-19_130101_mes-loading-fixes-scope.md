# Context
- User is continuously adding issues in `domain_docs/mes/plan/tasks.md` and asked to fix a chosen scope in a worktree.

# Decisions
- Scope this pass to P0 + low-risk P1: 5.1.8 (LOADING readiness false pass), 5.1.1 (run detail link to loading after readiness pass), 5.1.7 (surface backend error on loading validation failure).
- Use worktree `fix/mes-loading-ux` at `../better-wt/mes-loading-ux`.

# Plan
- [ ] Create worktree and initialize notes.
- [ ] Implement 5.1.8 server readiness fix (distinct error code/message).
- [ ] Implement 5.1.1 UI entry to loading after readiness passes.
- [ ] Implement 5.1.7 UI error surface for loading validation failure.
- [ ] Update plan status in `domain_docs/mes/plan/tasks.md` and run checks.

# Findings
- None yet.

# Progress
- None yet.

# Errors
- None.

# Open Questions
- None (error wording/code will follow best practice: distinct code + user-readable message).

# References
- `domain_docs/mes/plan/tasks.md`
