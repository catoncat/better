# admin demo seed endpoint

## Context
- 用户要求：提供管理员可控的演示数据生成入口（可选择数据集、覆盖/追加）。
- 当前主分支高频提交，使用新 worktree 实现以避免冲突。

## Decisions
- 权限：新增 `system:demo_seed`，仅具备权限的管理员可执行。
- 运行保护：仅在 `ALLOW_DEMO_SEED=true` 环境允许执行。
- 覆盖/追加：追加为默认；覆盖会清空数据库并重建（UI 强提醒）。
- UI 位置：系统设置页新增“演示数据”卡片与对话框。

## Plan
- 后端：新增 demo seed API（schema/service/routes），写审计日志并做权限校验。
- 种子：将 scripts 改造为可复用函数（避免 import 副作用），供 API 调用。
- 前端：在系统设置页加入入口与表单（数据集选择 + 模式切换）。

## Findings
- system 模块已有设置路由与审计模式，可复用。
- demo seed 脚本位于 `apps/server/scripts/*`，目前包含顶层执行/dotenv。
- MES 主数据已有可复用模块 `seed-mes-master-data.ts`。

## Progress
- 已建立 worktree `demo-seed-admin` 并记录任务计划。

## Errors
-

## Open Questions
-

## References
-
