# MES Next Triage: SMT Gap Phase 2 - Time Rule Engine

> Created: 2026-01-23
> Status: Triage complete, awaiting user selection

## Context

Based on `domain_docs/mes/CONTEXT.md`:
- M3 is **complete** (Go-Live Readiness)
- Current priority: **SMT Gap task breakdown** (`smt_gap_task_breakdown.md`)
- Phase 1 (prep model + FAI signature): **mostly complete**
- Phase 2 (time rule engine + reflow profile + stencil/scraper): **next priority**

## Worktree Scan

- Current: `/Users/envvar/lzb/better` (main)
- In-flight worktrees: **none**
- Conflicts: No parallel work detected

## Phase Status Summary

### Phase 1 (Track A/B)
- T1.1 (Readiness extension): Done except 1.1.4, 1.1.6, 1.1.8
- T1.2 (Waive API): Done
- T1.3 (Prep dashboard UI): Done
- T1.4 (FAI signature fields): Done
- T1.5 (Signature gate logic): Done

### Phase 2 (Track C/D/E)
- **Track C (Time Rule Engine)**: T2.1-T2.4 all pending
- **Track D (Reflow Profile)**: T2.5-T2.6 all done
- **Track E (Stencil/Scraper)**: T2.7-T2.8 all done

## Tracks (Parallelizable)

### Track 1: Time Rule Engine (T2.1-T2.4)
Core time-based compliance rules for SMT production.

**Candidates:**
- **T2.1 TimeRule Model**: Design `TimeRuleDefinition` + `TimeRuleInstance` models; depends on Phase 1 (mostly done); touch points: `prisma/schema`, new `time-rule/` module
- **T2.2 Rule Monitoring Cron**: Implement cron job scanning active instances for timeout; depends on T2.1; touch points: `cron/`, `time-rule/service.ts`, notification system
- **T2.3 Solder Paste Exposure Rule**: 24h exposure limit with alert + waive; depends on T2.1+T2.2; touch points: `time-rule/` config
- **T2.4 Water Wash Time Rule**: 4h limit (reflow/AOI -> wash) for routes with wash step; depends on T2.1+T2.2; touch points: `time-rule/` config

### Track 2: Phase 1 Cleanup (Remaining Items)
Complete pending Phase 1 subtasks before fully closing out.

**Candidates:**
- **T1.1.4 PrepItemPolicy Config Template**: Define policy config template (recordRequired/confirmMode/dataSource); no blocking dependencies; touch points: `readiness/` types/config
- **T1.1.6 Config Override Strategy**: DB override + audit + rollback mechanism; depends on T1.1.4; touch points: `readiness/`, audit logging
- **T1.1.8 Run-Level Association Fields**: Add runId/runNo/routeStepId to prep item records; touch points: `prisma/schema`, `readiness/service.ts`

### Track 3: Phase 3 (Post-Phase 2)
Lower priority - maintenance forms and optional device data collection.

**Candidates:**
- **T3.1 Maintenance Form**: Repair/maintenance records for equipment/fixtures with Readiness refresh; depends on Phase 2 complete; touch points: new `repair/` module
- **T3.2-T3.3 Device Data Collection**: Optional - gateway design + auto data source integration; depends on Phase 2; touch points: new data ingestion infrastructure

## Conflicts

- **Track 1 (T2.1) blocks T2.2/T2.3/T2.4**: TimeRule model must be in place before monitoring cron or specific rules
- **Track 1 vs Track 2**: No conflict - can run in parallel (different modules)
- **Track 3 depends on Phase 2**: Should not start until Track 1 (time rules) is complete

## Recommendations

1. **Primary Focus**: Track 1 (Time Rule Engine) - this is the remaining P1 priority for Phase 2
2. **Secondary/Parallel**: Track 2 (Phase 1 Cleanup) - can run in parallel with Track 1 if capacity allows
3. **Defer**: Track 3 until Phase 2 is complete

## Decisions

(Awaiting user selection)

## Plan

(To be filled after selection)

## Findings

- Phase 2 Track D (Reflow Profile) and Track E (Stencil/Scraper) are already complete
- Only Track C (Time Rule Engine) remains for Phase 2 completion
- Phase 1 has 3 pending subtasks (T1.1.4, T1.1.6, T1.1.8) that are non-blocking but should be cleaned up

## Progress

- [x] Worktree scan complete
- [x] Doc review complete
- [x] Triage output generated
- [ ] User selection pending

## Errors

(None)

## Open Questions

- Should Phase 1 cleanup (Track 2) be done before or in parallel with Track 1?
- Does the user want a dedicated worktree for this work?

## References

- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/plan/phase4_tasks.md`
