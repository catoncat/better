## Context
- `domain_docs/mes/plan/phase3_tasks.md` task 3.2.1.4 required `bun run db:seed` to produce a repeatable acceptance dataset (not relying on upsert-only behavior).
- Existing `apps/server/scripts/seed-mes.ts` and `apps/server/scripts/seed.ts` were mostly `upsert`-based and did not guarantee a clean, reproducible DB state.

## Decisions
- Make `apps/server/scripts/seed.ts` perform a full SQLite data reset (delete all rows from all tables except `_prisma_migrations`) and then `create` deterministic seed data.
- Add a safety guard: refuse to reset DB paths outside repo `./data/` unless `SEED_ALLOW_UNSAFE_RESET=true` is set.
- Seed includes SMT + DIP minimal master data, READY executable route versions, RBAC roles/users, and a small demo business dataset (WO/Run/Units).

## Plan
1) Inspect current seed scripts and schema
2) Implement clean deterministic `db:seed`
3) Update MES plan + onboarding docs
4) Verify via `bun run lint` and `bun run check-types`

## Open Questions
- None.

## References
- `apps/server/scripts/seed.ts`
- `domain_docs/mes/plan/phase3_tasks.md`
- `agent_docs/00_onboarding/setup.md`
