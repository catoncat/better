# Worktree Notes: feat/smt-gap-time-rules

Task: SMT Gap Phase 2: Time Rule Config & UI
Plan: domain_docs/mes/plan/smt_gap_task_breakdown.md
Plan Item: Track C

## Status Block
- Branch: feat/smt-gap-time-rules
- Path: /Users/envvar/lzb/better-smt-time-rules
- Progress: [~] 66% (2/3 slices)

## Slices
- [x] Slice 1: Seed default rules & logic verification (Solder Paste 24h, Wash 4h)
- [x] Slice 2: CRUD UI for TimeRuleDefinition (List, Hook, Dialog, Nav)
- [ ] Slice 3: Integration testing & final validation

## Decisions
- Used `readiness:config` permission for Time Rule management.
- Added Time Rules under "Preparation and Error Proofing" in navigation.

## Progress
- 2026-01-24: Seeded default rules in `seed-mes.ts`.
- 2026-01-24: Implemented `useTimeRuleList`, `useCreateTimeRule`, etc. hooks.
- 2026-01-24: Created Time Rules management page and dialog.
- 2026-01-24: Added navigation entry.

## Next Steps
- Verify the UI with real data.
- Run `bun run lint` and `bun run check-types` in the worktree.
- Final commit and merge.
