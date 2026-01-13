## Context
- Seed and acceptance scripts are write-heavy and should not run against a production DB.
- We want a safe, repeatable acceptance workflow that uses an isolated SQLite DB file.

## Decisions
- Standardize on a dedicated acceptance DB: `data/acceptance.db`.
- Add convenience scripts to deploy migrations, seed, and run an end-to-end MES acceptance flow against the acceptance DB and a dedicated port (`3002`).

## Plan
1) Add root `bun` scripts for acceptance DB deploy/seed/server
2) Add one-command runner to deploy → seed → start server → run flow → shutdown
3) Document the safe acceptance workflow

## Open Questions
- None.

## References
- `package.json`
- `scripts/mes-acceptance.ts`
- `agent_docs/00_onboarding/setup.md`
