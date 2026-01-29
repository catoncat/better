# 高风险问题汇总（P0）— 产品交互 Review（MES）

> 说明：仅记录会造成主线无法闭环、越权/阻断、或高概率误导用户的 P0 级问题。  
> 触发条件：见 `domain_docs/mes/ux_review/00_review_method.md`（Severity 定义）。

| Scope | 问题结论 | 影响 | 证据 | 状态 | Updated |
|---|---|---|---|---|---|
| Core Execution | Run 收尾触发 `OQC_REQUIRED` 时，被 UI 当作“收尾失败”，缺少明确下一步/交接与入口 | 高概率导致主线卡死或误判流程异常；非质量角色不知道已创建 OQC 任务、应如何推进 | `domain_docs/mes/spec/process/01_end_to_end_flows.md`<br>`apps/server/src/modules/mes/run/service.ts`<br>`apps/web/src/hooks/use-runs.ts` | open | 2026-01-29 |
| Work Orders & Runs IA | `/mes` 默认重定向到 `/mes/work-orders`，对 material/operator 等无 `wo:read` 角色形成“入口即无权限” | 高概率造成用户误以为无法使用 MES；一线角色入口被阻断，需要依赖“知道正确 URL/侧边栏”才能继续 | `apps/web/src/routes/_authenticated/mes/index.tsx`<br>`domain_docs/mes/permission_audit.md` | open | 2026-01-29 |
| Routing & Config | AUTO/TEST ingest 未强制 Run 授权（Run=PREP 也可能写入 Track/推进 Unit），授权门禁在 MANUAL/BATCH 与 AUTO/TEST 间不一致 | 可能绕过 Readiness/FAI/授权等主线门禁，导致 PREP 阶段推进生产并污染追溯；同时 UI 的 `requiresAuthorization` 配置项存在“以为生效但实际不生效”的误导风险 | `apps/server/src/modules/mes/ingest/service.ts`<br>`domain_docs/mes/spec/routing/03_route_execution_config.md`<br>`domain_docs/mes/ux_review/round6_routing_config.md` | open | 2026-01-29 |
| Loading UX | `slot-config` 页面强依赖 `loading:view` 且 UI 端产线列表 gate 过严（`run:read && run:create`），导致有 `loading:config` 的配置角色也可能无法配置站位/映射 | 站位表/映射无法配置 → load-table 无法通过 → 上料主线无法闭环 | `domain_docs/mes/permission_audit.md`<br>`apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`<br>`apps/server/src/modules/mes/line/routes.ts` | open | 2026-01-29 |
