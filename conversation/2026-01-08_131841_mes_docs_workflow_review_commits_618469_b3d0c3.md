# mes_docs_workflow_review_commits_618469_b3d0c3

## Context
- User asked to review commits `618469908b7e3f7470b49b412f4fd02029f8ed29` and `b3d0c329107ad6893b3765c9b9ccb18345a8d0ce` and suspected the agent violated repo doc workflow (emoji, doc responsibility drift).
- Repo rule in `.claude/skills/mes-implement/SKILL.md`: no emoji in `domain_docs/mes`, and progress tracking should live only in `domain_docs/mes/plan`.

## Decisions
- Remove emoji from `domain_docs/mes/*` and validate via `rg -nP "[\\p{Extended_Pictographic}]" domain_docs/mes`.
- Keep `domain_docs/mes/CONTEXT.md` as an index/reading path document; keep milestone status/progress out of it.
- Make milestone definitions consistent across `README.md`, `domain_docs/mes/plan/01_milestones.md`, and `domain_docs/mes/CONTEXT.md`.

## Plan
- Review current working tree diffs for the above files, then commit a focused "docs: MES doc-contract cleanup" change (separate from any unrelated local changes).
- Decide what to do with the untracked workflow note `conversation/2026-01-08_131001_workflow_context-fork_guardrails_plan.md` (commit it or delete it).

## Open Questions
- Should `domain_docs/mes/tests/01_acceptance_scenarios.md` carry any "status" metadata, or keep it strictly as scenarios + references?
- Should `domain_docs/mes/CONTEXT.md` include a milestone overview table if it contains no progress/status (definitions only), or should it only link to `domain_docs/mes/plan/01_milestones.md`?

## References
- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/tests/01_acceptance_scenarios.md`
- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/plan/phase3_tasks.md`
- `README.md`
- `.claude/skills/mes-implement/SKILL.md`
