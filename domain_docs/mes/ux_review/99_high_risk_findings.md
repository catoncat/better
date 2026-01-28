# 高风险问题汇总（P0）— 产品交互 Review（MES）

> 说明：仅记录会造成主线无法闭环、越权/阻断、或高概率误导用户的 P0 级问题。  
> 触发条件：见 `domain_docs/mes/ux_review/00_review_method.md`（Severity 定义）。

| Scope | 问题结论 | 影响 | 证据 | 状态 | Updated |
|---|---|---|---|---|---|
| Core Execution | Run 收尾触发 `OQC_REQUIRED` 时，被 UI 当作“收尾失败”，缺少明确下一步/交接与入口 | 高概率导致主线卡死或误判流程异常；非质量角色不知道已创建 OQC 任务、应如何推进 | `domain_docs/mes/spec/process/01_end_to_end_flows.md`<br>`apps/server/src/modules/mes/run/service.ts`<br>`apps/web/src/hooks/use-runs.ts` | open | 2026-01-29 |
