# MES Next Triage: M3 Final Tasks

> Date: 2026-01-13
> Worktree: main (clean)
> In-flight worktrees: none

## Context

M3 (Go-Live Readiness) is nearly complete. From `domain_docs/mes/plan/phase3_tasks.md`:

| Track | Status |
|-------|--------|
| Track A: Docs & Contract Alignment | DONE |
| Track B: E2E Demo & Seed Hardening | DONE |
| Track C: Ops & Deployment Readiness | DONE |
| Track D: UX & Training | Partial (3.4.3 pending, 3.4.4 in progress) |
| Track E: Data Collection | DONE |

## Remaining Tasks

### Pending `[ ]`
- **3.4.3** 体验优化清单（仅收敛到 P1 阻断项）
  - 3.4.3.1 Demo guide "dry run" 校验
  - 3.4.3.2 Run detail -> Execution 深链
  - 3.4.3.3 Execution 增加"待执行批次"列表
  - 3.4.3.4 Demo guide 明确 Unit 生成路径

### In Progress `[~]`
- **3.4.4** 外部集成降级 SOP（TPM/WMS/SPI/AOI/钢网/锡膏）
  - As-built: 部分覆盖在 `user_docs/` 角色指南中，待收敛为独立 SOP

---

## Tracks & Candidates

### Track A: UX Hardening (体验优化)
Focus on improving demo/execution flow before go-live.

**Candidates:**
- **3.4.3.1 Demo Guide Dry Run**: Validate `user_docs/demo/guide.md` end-to-end and fix text/entry drift.
  - Why now: Ensures demo docs are accurate before training/rollout.
  - Depends on: Nothing (doc-only, no blocking deps).
  - Touch points: `user_docs/demo/guide.md`, `apps/web/src/routes/_authenticated/mes/*` (read-only validation).

- **3.4.3.2 Run Detail -> Execution Deep Link**: Add "Start Execution" button in Run detail page that pre-fills runNo/woNo.
  - Why now: Reduces navigation friction for operators.
  - Depends on: Nothing.
  - Touch points: `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`, `apps/web/src/routes/_authenticated/mes/execution.tsx`.

- **3.4.3.3 Execution: Pending Runs List**: Show AUTHORIZED + PREP (trial-capable) runs for quick selection.
  - Why now: Operators currently must manually enter runNo; listing available runs improves UX.
  - Depends on: Nothing.
  - Touch points: `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/web/src/hooks/use-runs.ts` (or new hook).

- **3.4.3.4 Demo Guide: Unit Generation Path**: Clarify TrackIn auto-creates Unit vs manual "Generate Unit" button.
  - Why now: Reduces confusion during demos.
  - Depends on: Nothing (doc-only).
  - Touch points: `user_docs/demo/guide.md`.

### Track B: Integration SOP (降级 SOP 收敛)
Consolidate degraded-mode documentation into a single SOP.

**Candidates:**
- **3.4.4 外部集成降级 SOP**: Create standalone SOP from scattered content in role guides.
  - Why now: Go-live requires clear fallback procedures for TPM/WMS/SPI/AOI downtime.
  - Depends on: Nothing (doc consolidation).
  - Touch points: `user_docs/` (new SOP file), references in `user_docs/05_leader.md`, `user_docs/06_operator.md`, `user_docs/03_engineer.md`.

---

## Conflicts

- **Track A vs Track B**: No conflict. Both can run in parallel.
- **Within Track A**: All 4 subtasks are independent; can be parallelized or serialized.

---

## Selection Prompt

Pick one track or specific task to implement:

1. **Track A (UX Hardening)**: Complete 3.4.3 subtasks (demo guide + execution UX).
2. **Track B (Integration SOP)**: Complete 3.4.4 (consolidate degraded-mode SOP).
3. **Both in parallel**: Recommend separate worktrees if running concurrently.

Also: Would you like a dedicated worktree for the chosen track?

---

## Selected

(To be filled after user picks)
