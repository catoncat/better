# MES Next Triage: SMT Gap Phase 1

> Date: 2026-01-22
> Source: `/mes-next` skill
> Status: Awaiting user selection

## Context

- **Git**: `main` is clean, ahead of origin by 10 commits
- **In-flight worktree**: `role-redesign-v2` (dirty, ahead 6, behind 1)
  - Touches: db, domain_docs, server, web, worktree_notes
  - Files: seed scripts, login form, constants, permission audit, tasks.md, etc.
- **Milestone status**: M1-M3 complete; M4 in draft
- **Current priority**: SMT Gap tasks (`domain_docs/mes/plan/smt_gap_task_breakdown.md`) - Phase 1 is P0

## Worktree Scan

```
Current: /Users/envvar/lzb/better (main)

In-flight worktrees:
- /Users/envvar/lzb/better-worktrees/role-redesign-v2 (role-redesign-v2) [dirty, ahead 6, behind 1]
  - touch: db, domain_docs, other, server, web, worktree_notes
  - files: seed scripts, login form, constants, permission audit, tasks.md, ...
```

## Tracks & Candidates

### Track A: Readiness Model Extension (Prep Items)
**Theme**: Extend Readiness to support new PREP_* check types and waiver mechanism

- **T1.1 - Extend ReadinessCheckType**: Add `PREP_BAKE`, `PREP_PASTE`, `PREP_STENCIL_USAGE`, `PREP_STENCIL_CLEAN`, `PREP_SCRAPER`, `PREP_FIXTURE` enum values; update model and evaluation logic
  - Why now: P0 foundation for SMT compliance; no dependencies
  - Depends on: None
  - Touch points: `packages/db/prisma/schema/schema.prisma`, `apps/server/src/modules/mes/readiness/`

- **T1.2 - Waiver API**: POST `/readiness-items/:id/waive` with `waivedBy/waiveReason`; `prep:waive` permission
  - Why now: Enables controlled bypass for non-gate prep items
  - Depends on: T1.1
  - Touch points: `readiness/routes.ts`, `readiness/service.ts`, `permissions.ts`

- **T1.3 - Prep Dashboard UI**: Prep items board on Run PREP phase (status, input, waiver)
  - Why now: User-facing entry point for new prep checks
  - Depends on: T1.1, T1.2
  - Touch points: `apps/web/src/routes/_authenticated/mes/runs/`

### Track B: FAI Signature Enforcement
**Theme**: Enforce multi-signature requirement for FAI before Run authorization

- **T1.4 - FAI Signature Fields**: Add `signedBy/signedAt/signatureRemark` to Inspection; sign API
  - Why now: P0 compliance requirement; no dependencies; can parallel with Track A
  - Depends on: None
  - Touch points: `packages/db/prisma/schema/schema.prisma`, `apps/server/src/modules/mes/fai/`

- **T1.5 - Signature Gate Logic**: Run authorization must check FAI signature; trigger Readiness update on sign
  - Why now: Closes FAI compliance loop
  - Depends on: T1.4
  - Touch points: `fai/service.ts`, `run/service.ts`, `readiness/service.ts`

## Conflicts

- **Track A** conflicts with **role-redesign-v2** worktree:
  - Both touch `domain_docs/mes/plan/tasks.md` (minor, can rebase)
  - role-redesign-v2 touches `packages/db` and `apps/server` (potential schema/service conflicts)
  - Recommendation: Check if role-redesign-v2 is near completion; if not, use a dedicated worktree for SMT Gap work

- **Track A** and **Track B** are independent:
  - No shared touch points except Readiness evaluation (minimal)
  - Can be developed in parallel by different developers or sequentially

- **T1.1 subtasks conflict note**:
  - Subtask 1.1.7 (PREP_* enable strategy) and 1.1.8 (Run-level association) may touch seed scripts, which overlap with role-redesign-v2

## Recommended Selection

**For solo developer**: Start with **Track A (T1.1)** - it's the foundation for all subsequent SMT Gap work.

**For parallel work**: Track A + Track B can run in parallel if using separate worktrees.

## Next Steps

Pick one:
1. **Track A only** (T1.1 first, then T1.2, then T1.3)
2. **Track B only** (T1.4 first, then T1.5)
3. **Both in parallel** (requires worktree setup)

Also decide:
- Do you want a dedicated worktree for SMT Gap work? (Recommended given role-redesign-v2 is in-flight)
- Should we first merge/rebase role-redesign-v2 before starting?

## Decisions
- (awaiting user selection)

## Plan
- See Tracks above

## Findings
- M3 complete; SMT Gap Phase 1 is the current priority
- role-redesign-v2 worktree is in-flight and may conflict with schema/server changes

## Progress
- Triage complete
- Note created

## Errors
- (none)

## Open Questions
- Which track to pursue?
- Worktree strategy?
- role-redesign-v2 status?

## References
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
- `domain_docs/mes/plan/phase4_tasks.md`
- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/plan/01_milestones.md`
