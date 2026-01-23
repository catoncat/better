---
type: worktree_note
createdAt: "2026-01-23T07:39:35.755Z"
branch: "feat/smt-gap-t1.1.8-followup"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "SMT Gap Phase1 T1.1.8 follow-up (UI + readiness)"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "1.1.8"
  triageNote: "conversation/2026-01-23_121403_mes-next_smt-gap_phase1_time-rule_m4.md"
touchPoints:
  - "apps/web/src/routes/_authenticated/mes"
  - "apps/server/src/modules/mes/readiness/service.ts"
---

# feat/smt-gap-t1.1.8-followup - SMT Gap Phase1 T1.1.8 follow-up (UI + readiness)

## Scope
- Goal: Complete SMT Gap Phase 1 T1.1.8 follow-ups (web UI/types) so prep records can be associated to a Run via `runNo` (and optionally `routingStepId`), and operators can filter/see run linkage.
- Non-goals: Build a full routing-step picker UX (UUID-free selector) unless it is cheap to reuse existing route/run data.
- Risks: If users enter both `runNo` and `lineCode`, backend enforces consistency; UI should guide to avoid mismatches.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: Web dialogs + list filters for run linkage
- [x] Slice 2: Verify (smart-verify) + commit

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-23T07:39:35.756Z
- BaseRef: origin/main
- CommitsAheadOfBase: 9
- Dirty: true
- ChangedFiles:
  - .claude/skills/claim-task/skill.md
  - .claude/skills/mes-next/SKILL.md
  - .claude/skills/task-queue-status/skill.md
  - .claude/skills/worktree-new/SKILL.md
  - .claude/skills/worktree-status/SKILL.md
  - .gitignore
  - "conversation/2026-01-23_123454_\351\241\271\347\233\256\346\212\245\345\221\212\350\257\204\345\256\241\350\264\250\351\207\217\345\256\211\345\205\250\346\265\213\350\257\225.md"
  - "conversation/2026-01-23_125950_MES_\346\265\213\350\257\225\345\210\206\345\261\202\344\270\216\344\274\230\345\205\210\347\272\247.md"
  - "conversation/2026-01-23_131956_MES_\346\265\213\350\257\225\346\241\206\346\236\266\350\256\276\350\256\241\345\237\272\344\272\216\347\216\260\346\234\211_acceptance_\350\204\232\346\234\254.md"
  - AGENTS.md
  - apps/server/src/modules/mes/bake/schema.ts
  - apps/server/src/modules/mes/bake/service.ts
  - apps/server/src/modules/mes/readiness/service.ts
  - apps/server/src/modules/mes/smt-basic/schema.ts
  - apps/server/src/modules/mes/smt-basic/service.ts
  - apps/server/src/modules/mes/solder-paste/schema.ts
  - apps/server/src/modules/mes/solder-paste/service.ts
  - conversation/2026-01-23_121017_mes-next_smt-gap-p2-timerule.md
  - conversation/2026-01-23_121403_mes-next_smt-gap_phase1_time-rule_m4.md
  - domain_docs/mes/plan/smt_gap_task_breakdown.md
  - packages/db/prisma/schema/migrations/20260123045904_prep_record_run_link/migration.sql
  - packages/db/prisma/schema/schema.prisma
  - scripts/conversation-new.ts
  - scripts/worktree-new.ts
  - worktree_notes/main.md
- Next:
  - Commit worktree note: git add worktree_notes/feat_smt-gap-t1.1.8-followup.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-
