# main-uncommitted-mes-guards-commit-slicing

## Context
- User asked what uncommitted changes on `main` were, whether they were finished, and whether it was safe to commit.
- Worktree was dirty and `main` was already ahead of `origin/main`.

## Decisions
- Proceed with option A: run Biome fixes, re-run `bun run lint` + `bun run check-types`, then commit in small, coherent slices.
- Keep work on `main` (no worktree/branch) to unblock immediate cleanup.

## Plan
- Run `bun run lint:fix` and `bun run format`.
- Verify `bun run lint` and `bun run check-types`.
- Commit in slices: lint-only fixes, server guardrails, web UX/error handling, docs/plan, scripts + demo notes.

## Open Questions
- Push the now-ahead `main` commits to `origin/main` now, or keep local until a PR/branch workflow is chosen?

## References
- `apps/server/src/modules/mes/work-order/service.ts`
- `apps/server/src/modules/mes/readiness/service.ts`
- `apps/server/src/modules/mes/execution/service.ts`
- `apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx`
- `apps/web/src/hooks/use-work-orders.ts`
- `domain_docs/mes/plan/phase3_tasks.md`
- `domain_docs/mes/tech/api/01_api_overview.md`
- `domain_docs/mes/tech/api/02_api_contracts_execution.md`
- Commits on `main`: `f8985f2`, `71c196a`, `8482ace`, `7214469`, `5d5301d`, `a5fb945`
