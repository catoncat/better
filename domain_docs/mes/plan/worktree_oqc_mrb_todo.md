# Worktree TODO - OQC + MRB (SMP v2.4)

## Worktree Info
- Path: /Users/envvar/lzb/better-worktrees/mes-oqc-mrb
- Branch: feature/mes-oqc-mrb
- Base: main @ f1a64f8

## Goal
落地 OQC 抽检与 MRB 决策闭环，严格对齐 `domain_docs/mes/spec/process/03_smp_flows.md`。

## Tracking Policy
- 本文件是 OQC/MRB 任务追踪的唯一来源。
- 待所有事项完成后再更新 `domain_docs/mes/plan/phase2_tasks.md`。

## Scope (从 phase2_tasks.md 拆分)
Status: [x] done, [~] in progress, [ ] pending

- [x] 2.5.1 OQC 抽检规则模型 (比例/固定数量)
- [x] 2.5.2 OQC 任务创建逻辑 (Unit 完成触发，DONE-only gating)
- [x] 2.5.3 抽样算法 (比例/固定)
- [x] 2.5.4 OQC 任务管理 API (列表/详情)
- [x] 2.5.5 OQC 结果记录 API (PASS/FAIL)
- [x] 2.5.6 Gate: Run 完成需 OQC 通过；FAIL → RUN=ON_HOLD
- [x] 2.5.9 MRB 决策流程 (ON_HOLD → COMPLETED/CLOSED_REWORK/SCRAPPED)
- [x] 2.5.10 返修 Run 创建 API (`POST /api/runs/{runNo}/rework`)
- [x] 2.5.11 终态变更与审计 (CLOSED_REWORK / SCRAPPED)
- [x] 2.5.12 UI: OQC 任务列表/执行 + MRB 决策对话框

## Locked Decisions
- 返修 Run 复用原 Unit（更新 `runId`），不生成新 SN。
- OQC 触发条件为全部 Unit = DONE。
- 抽样结果持久化在 `inspection.data.sampledUnitIds`。
- 抽样规则优先级：specificity > priority > createdAt。
- MRB 决策记录落在 OQC inspection `data`，`Run.mrbDecisionId` 指向该 inspection。
- MRB FAI 豁免权限：`QUALITY_DISPOSITION`。
- MRB 决策原因最少 4 个字。

## Task Breakdown
1) Data/Schema
- [x] 新增 OQC 抽检规则表 (按路由/产品/线体维度配置)
- [x] 复用 Inspection(OQC) 作为任务载体，补齐必要字段

2) Service Logic
- [x] Unit 完成后触发 OQC 采样任务
- [x] 抽样算法实现与幂等保护
- [x] OQC FAIL 将 Run 置为 ON_HOLD，触发 MRB 流
- [x] MRB 决策：放行/返修/报废，并记录原因
- [x] Run 首次 TrackIn → IN_PROGRESS（允许后续 TrackIn/TrackOut）
- [x] 返修 Run 创建时重分配 Unit

3) API
- [x] OQC 任务列表/详情/结果录入
- [x] MRB 决策接口
- [x] 返修 Run 创建接口 (REUSE_PREP / FULL_PREP)

4) UI
- [x] OQC 任务列表 + 结果录入
- [x] Run 详情 MRB 决策入口/对话框
- [x] 状态标签/筛选支持 ON_HOLD/CLOSED_REWORK/SCRAPPED

5) QA/Docs
- [x] 同步更新 `phase2_tasks.md` 勾选
- [x] 必要的服务层测试或最小验收脚本

## Milestones
1) Schema + Rules CRUD
2) OQC Core (create/start/record/complete)
3) OQC Trigger + Gate (DONE-only + execution integration)
4) MRB Decision (release/rework/scrap + rework run)
5) UI + Polish (OQC list, MRB dialog, status badges)

## Key Test Scenarios
1) OQC Pass: all units pass → Run COMPLETED
2) OQC Fail → MRB Release → COMPLETED
3) OQC Fail → MRB Rework (REUSE_PREP) → CLOSED_REWORK + new Run(AUTHORIZED), units reassigned
4) OQC Fail → MRB Rework (FULL_PREP) → CLOSED_REWORK + new Run(PREP), units reassigned
5) OQC Fail → MRB Scrap → SCRAPPED
6) Idempotency: Duplicate OQC creation returns existing
7) Sampling: percentage/fixed calculations + specificity tie-breaker
8) Trigger gate: OQC only when all units DONE

## Critical Files
- `packages/db/prisma/schema/schema.prisma`
- `apps/server/src/modules/mes/execution/service.ts`
- `apps/server/src/modules/mes/oqc/service.ts`
- `apps/server/src/modules/mes/oqc/trigger-service.ts`
- `apps/server/src/modules/mes/oqc/sampling-rule-service.ts`
- `apps/server/src/modules/mes/oqc/mrb-service.ts`
- `apps/server/src/modules/mes/oqc/mrb-routes.ts`

## Out of Scope
- 上料防错 (2.4)
- 集成接口 (2.6)
- Closeout 收尾 (2.7)
