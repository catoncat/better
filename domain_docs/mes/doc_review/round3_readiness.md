# 轮次3：Readiness

---

## 1. 轮次目标

- 对齐 Readiness 域文档 ↔ API ↔ UI，覆盖 PRECHECK/FORMAL、豁免、异常视图与产线配置。

---

## 2. 覆盖范围（Scope）

- API 域：/api/runs/:runNo/readiness/*，/api/readiness/exceptions，/api/lines/:lineId/readiness-config
- UI 页面：apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx，apps/web/src/routes/_authenticated/mes/readiness-config.tsx，apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx
- 文档入口：domain_docs/mes/spec/impl_align/01_e2e_align.md，domain_docs/mes/tech/api/01_api_overview.md，domain_docs/mes/tech/api/02_api_contracts_execution.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/impl_align/01_e2e_align.md
2. Playbook：domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md
3. User Docs：user_docs/04_quality.md；user_docs/06_operator.md；user_docs/sop_degraded_mode.md；user_docs/demo/01_overview.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 就绪预检（PRECHECK） | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/tech/api/02_api_contracts_execution.md | POST /api/runs/:runNo/readiness/precheck<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 缺失 | 文档 | Run 详情页在 PREP 状态会自动触发预检刷新结果 |
| 就绪正式检查（FORMAL） | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/tech/api/02_api_contracts_execution.md | POST /api/runs/:runNo/readiness/check<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | 前端存在 usePerformFormalCheck，但 Run 详情页仅触发 precheck（handleRunCheck） |
| 准备项定义（PREP_* / TIME_RULE） | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；user_docs/06_operator.md | apps/server/src/modules/mes/readiness/service.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | PREP_PASTE/PROGRAM 描述与实际检查来源不一致 |
| 就绪结果查看 | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/tech/api/02_api_contracts_execution.md | GET /api/runs/:runNo/readiness/latest<br>GET /api/runs/:runNo/readiness/history<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 一致 | 无 | UI 展示检查类型/状态/汇总/明细（含 failReason/waiveReason） |
| 就绪豁免 | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；user_docs/04_quality.md；user_docs/sop_degraded_mode.md | POST /api/runs/:runNo/readiness/items/:itemId/waive<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 命名不一致/行为不一致 | 文档 | 实际权限为 `readiness:override`；后端未限制不可豁免项 |
| 就绪异常列表 | user_docs/04_quality.md | GET /api/readiness/exceptions<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx | 一致 | 无 | UI 支持 line/status/from/to 过滤，列表展示失败/豁免数量 |
| 产线就绪配置 | domain_docs/mes/tech/api/01_api_overview.md | GET /api/lines/:lineId/readiness-config<br>PUT /api/lines/:lineId/readiness-config | apps/web/src/routes/_authenticated/mes/readiness-config.tsx | 缺失 | 文档 | API 默认启用全部检查项；UI 还包含工艺类型维护（调用 /api/lines/:lineId PATCH）与“未配置默认全选”提示 |

---

## 5. 偏差清单

- 文档使用 `prep:waive` 作为就绪豁免权限，但实际权限为 `readiness:override`（命名不一致，文档修复）。
- Run 详情页只触发预检（precheck），未提供“正式检查”按钮；文档与验证步骤主要指向 `/readiness/check`（可能存在行为不一致，需确认 UI 是否补充 formal 入口或文档调整）。
- 产线准备检查配置页面包含工艺类型维护与“未配置默认全选”提示，文档未覆盖（文档缺失）。
- PREP_PASTE 文档描述为“锡膏批次状态 + 暴露规则”，实际检查读取 `SolderPasteUsageRecord`（行为不一致，文档修复或后端补齐）。
- PREP_PROGRAM 文档描述为“炉温程式一致性”，实际检查仅验证路由期望程式存在且 ACTIVE（行为不一致，文档修复或后端补齐）。
- User Docs 声称 ROUTE/LOADING 不可豁免，但后端 `waiveItem` 对 itemType 未做限制（行为不一致，文档修复或后端补齐）。
- demo 错误码文档使用 `READINESS_NOT_PASSED`/`PREP_CHECK_FAILED`，实际接口多为 `READINESS_CHECK_FAILED` 或 `READINESS_CHECK_NOT_PASSED`（命名不一致，文档修复）。

---

## 6. 结论与下一步

- 本轮发现文档命名不一致、行为不一致与缺失项，已记录在偏差清单。
- 下一步：优先修正文档（就绪检查/豁免权限与不可豁免项、PREP_* 定义、UI 实际入口、错误码与配置说明）。
