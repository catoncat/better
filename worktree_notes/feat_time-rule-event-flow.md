---
type: worktree_note
createdAt: "2026-01-24T06:30:01.772Z"
branch: "feat/time-rule-event-flow"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "Time Rule 事件流（Plan A）"
  planPath: "domain_docs/mes/plan/smt_gap_task_breakdown.md"
  planItem: "T2.9–T2.13"
---

# feat/time-rule-event-flow - Time Rule 事件流（Plan A）

## Scope
- Goal: 落地 Plan A 事件流（DB 事件表 + 30s 轮询）替换 TimeRule 硬编码触发。
- Non-goals: 不引入外部队列/消息中间件；不改 UI；不调整规则定义业务含义。
- Risks: 事件码来源分散、幂等边界不清、轮询负载与延迟不稳。

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: 事件表模型 + 索引 + 迁移（T2.9）
- [x] Slice 2: 事件发射（TrackIn/TrackOut/锡膏使用）（T2.10）
- [x] Slice 3: 事件处理器（30s 轮询、幂等、重试 10 次指数退避）（T2.11）
- [x] Slice 4: TimeRule 触发改为事件驱动（T2.12）
- [x] Slice 5: 事件保留与清理任务（30 天）（T2.13）

## Findings
- main 本地分支领先 origin/main（需确认是否先合并 feat/smt-gap-time-rules）
- Prisma 规范：`packages/db/prisma/schema/schema.prisma` 修改后用 `bun run db:migrate -- --name <change>` 生成迁移
- TimeRule 相关模型位于 `schema.prisma` 约 2067 行附近（TimeRuleDefinition/Instance）
- 现有事件型模型仅有 `AuditEvent`（含 status/error/payload/createdAt/idempotencyKey 索引）
- TimeRuleDefinition/Instance 已含 startEvent/endEvent 字段与 scope/priority/meta 结构
- Track in/out 在 `apps/server/src/modules/mes/execution/routes.ts`，成功后会写 `AuditEvent`（action: TRACK_IN/TRACK_OUT）
- 锡膏使用记录在 `apps/server/src/modules/mes/solder-paste/routes.ts`，成功后写 `AuditEvent`（action: SOLDER_PASTE_USAGE_CREATE）
- TimeRule 逻辑分散在 `mes/execution/service.ts` 与 `mes/solder-paste/service.ts`，需改为事件驱动
- TimeRule 实例创建/完成逻辑在 `apps/server/src/modules/mes/time-rule/service.ts`
- Readiness 检查依赖 `checkTimeRules`（`apps/server/src/modules/mes/readiness/service.ts`）
- 现有 TimeRule Cron 在 `apps/server/src/plugins/time-rule-cron.ts`，每分钟处理超时/预警并发通知
- 系统通用日志模型为 `SystemLog`（`schema.prisma`），cron 任务会写 `system_logs`
- `mes/solder-paste/service.ts` 在 issuedAt 时创建 `SOLDER_PASTE_24H` 实例
- `mes/execution/service.ts` TrackOut(REFLOW) 创建 `WASH_4H` 实例；TrackIn(WASH) 完成实例
- `db:migrate` 脚本即 `prisma migrate dev`（支持 `DATABASE_URL` 临时库）
- worktree 根目录暂无 `data/`，需创建临时库路径
- 新生成迁移 `20260124064831_mes_event_table` 意外包含 `MaintenanceRecord` 表（需手工剔除以避免重复建表）
- 已生成事件表迁移并手工剔除多余的 `MaintenanceRecord` 语句；`check-types` 通过
- 集成模块已有事件幂等模式（如 `mes/integration/solder-paste-service.ts` 用 `eventId` 去重）
- 新增 `mes/event/service.ts` 作为事件发射入口，TrackIn/TrackOut/锡膏使用将写入 `mes_events`
- `@elysiajs/cron` 使用 Croner，支持秒级表达式（README 示例 `*/1 * * * * *`）
- `scopeValue` 可能对齐 `Line.code` / `Routing.code` / `WorkOrder.productCode`（需在事件处理器里支持 ID 或 code）
- Cron 插件注册在 `apps/server/src/app.ts`（`createApi` enableCrons 分支）
- 事件处理器修正 `entityDisplay` 类型后，`check-types` 通过
- 已移除 TrackIn/TrackOut/锡膏使用中的 TimeRule 硬编码触发，改由事件处理器负责
- 增加 MES 事件保留清理任务（按 `retentionUntil` 或 30 天阈值删除）
- SMT 对齐文档新增时间规则事件流节点记录
- 冒烟验证（acceptance.db）成功：TrackIn/TrackOut/锡膏使用生成 3 条事件并被处理；SOLDER_PASTE_24H 生成 ACTIVE 实例

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T06:30:01.773Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Plan A：DB 事件表 + 30s 轮询
- 事件粒度 A（TRACK_IN / TRACK_OUT / SOLDER_PASTE_USAGE_CREATE + payload）
- 保留期 30 天；重试 10 次 + 指数退避

## Open Questions
- 事件发射点是否已有统一事件中心可复用（待盘点）

## Errors
- 2026-01-24: `bun run db:migrate -- --name mes_event_table` 失败，提示 SQLite DB drift（shared DB 含 ReflowProfile 等表，要求 reset）。下一步：使用独立临时 DB（`DATABASE_URL=file:/.../data/db-temp.db`）执行 migrate dev 生成迁移，避免重置共享 DB。
- 2026-01-24: `bun run check-types` 失败，TS2322（`entityDisplay` 传入 `string | null`）。已改为 `?? undefined`，准备重跑。
- 2026-01-24: `bun run db:seed:acceptance` 失败（seed 脚本在 apps/server cwd 解析为 `apps/server/data`，触发 safeDir 拒绝）。下一步：改用绝对 `DATABASE_URL=file:/.../data/acceptance.db` 直接执行 `bun run --filter server db:seed`。
- 2026-01-24: `bun .scratch/mes-event-smoke.ts` 失败（无法解析 `@better-app/db`）。下一步：将脚本移到 `apps/server/scripts` 并在该目录执行。
- 2026-01-24: `mes-event-smoke.ts` 失败（`db.RunStatus` 不存在）。下一步：改为从 `@better-app/db` 显式导入 `RunStatus`。
