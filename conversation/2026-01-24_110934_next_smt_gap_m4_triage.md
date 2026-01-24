# Triage: SMT Gap & M4 Next Steps

Date: 2026-01-24

## Worktree Scan
Current: /Users/envvar/lzb/better (main)
In-flight worktrees: none

## Shortlist Candidates

- Track A: SMT Gap Phase 1 & 2 (P0/P1)
  - **[SMT Gap] T1.1.8 Run-level association**: Finalize Phase 1 P0 items by ensuring prep records (paste, stencil, etc.) are correctly linked to production runs and route steps.
    - Touch points: `readiness/service.ts`, `paste/stencil/scraper services`
  - **[SMT Gap] Track C: Time Rule Engine**: Implement the core engine for monitoring time-sensitive SMT processes (e.g., solder paste exposure).
    - Depends on: T1.1.8 (for consistent readiness integration)
    - Touch points: `schema.prisma`, `time-rule/` (new module)

- Track B: M4 Ingest Foundation (P0)
  - **[M4] Ingest Event & Mapping Contract**: Define how external events (AUTO/TEST) are ingested and mapped to MES execution steps.
    - Touch points: `domain_docs/mes/spec/api/02_ingest_contract.md` (new)
  - **[M4] Ingest Event Foundation (DB + API)**: Implement the storage and ingestion endpoints for M4 events.
    - Touch points: `schema.prisma`, `ingest/` (new module)

## Conflicts
- **Track A (T1.1.8) blocks Track A (Track C)**: Track C should follow T1.1.8 to ensure that time-rule violations correctly trigger readiness failures using the updated association logic.
- **Track A & Track B**: Minimal conflicts, can be developed in parallel worktrees.

## Task Queue
Written to `.scratch/task-queue.md`.

## Selection Prompt
Pick one; I will confirm scope and start plan-first implementation.
Recommended: Dedicated worktree if running Track A and Track B in parallel.