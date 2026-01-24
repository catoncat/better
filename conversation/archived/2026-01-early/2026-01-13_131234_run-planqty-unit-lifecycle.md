# run-planqty-unit-lifecycle

## Context
-

## Decisions
-

## Plan
-

## Open Questions
-

## References
-
# Context
- 背景：MES “工单/批次/单元” 设计收敛，Run 不再隐式继承工单数量；Unit 不再在 TrackIn 时自动创建。
- 目标：强制 Run 创建时提供批次计划数量（`Run.planQty`），Unit 的预生成数量不得超过该值；TrackIn 必须针对已存在 Unit；提供安全删除未处理 Unit 的能力；前端 UI 对齐。

# Decisions
- `Run.planQty` 作为批次级计划数量，创建 Run 必填；Run 详情 API/页面展示批次计划数量，同时保留工单 `plannedQty` 作为参考展示。
- `generateUnits` 增加约束：`quantity <= run.planQty`，并且当 Run 已存在 Unit 时禁止再次生成（需要先删）。
- `TrackIn` 不再自动创建 Unit：Unit 不存在直接返回错误，强制走 `generateUnits` 预生成。
- 新增 `deleteUnits` API：仅允许删除 `QUEUED` 且没有 Track 记录的 Unit，避免误删已处理数据。

# Plan
- [x] 后端：Run schema/service/route 增加 `planQty` 并强校验；`generateUnits` 数量上限；`TrackIn` 移除自动创建；新增 `deleteUnits`。
- [x] 脚本：seed / demo / verify 脚本补齐 `planQty` 与新的 Unit 预生成流程。
- [x] 前端：Run 创建对话框增加 `planQty`；Run 详情展示 `planQty`；生成 Unit 对话框 `max=planQty`。
- [ ] 提交：按 “schema+migration / server / web / scripts” 小步提交。
- [ ] 合并：将 `feat/3.4-training-sop` 合并到 `main`。
- [ ] 清理：移除 worktree `/Users/envvar/lzb/better-3.4` 并删除本地分支。

# Open Questions
- 是否需要将 `planQty` 与工单 `plannedQty` 的关系进一步收敛（例如默认值/上限规则）到 domain_docs/mes（当前以 UI 默认取 `plannedQty` 作为起始值）。

# References
- DB: `packages/db/prisma/schema/schema.prisma`
- Server: `apps/server/src/modules/mes/run/service.ts`, `apps/server/src/modules/mes/run/routes.ts`, `apps/server/src/modules/mes/execution/service.ts`
- Web: `apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx`, `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
- Scripts: `apps/server/scripts/seed.ts`, `apps/server/scripts/create-demo-run.ts`, `apps/server/scripts/verify-mes-m1-direct.ts`
