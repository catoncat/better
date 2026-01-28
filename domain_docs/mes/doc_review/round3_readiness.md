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
| 就绪预检（PRECHECK） | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/tech/api/02_api_contracts_execution.md | POST /api/runs/:runNo/readiness/precheck<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 缺失 | 文档 | 已修复：补充 PRECHECK 说明与 UI 自动预检行为 |
| 就绪正式检查（FORMAL） | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/tech/api/02_api_contracts_execution.md | POST /api/runs/:runNo/readiness/check<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | 已修复：文档注明 formal 触发方式（接口/授权自动） |
| 准备项定义（PREP_* / TIME_RULE） | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；user_docs/06_operator.md | apps/server/src/modules/mes/readiness/service.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | 已修复：PREP_PASTE/PROGRAM 定义与数据来源对齐 |
| 就绪结果查看 | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；domain_docs/mes/tech/api/02_api_contracts_execution.md | GET /api/runs/:runNo/readiness/latest<br>GET /api/runs/:runNo/readiness/history<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 一致 | 无 | UI 展示检查类型/状态/汇总/明细（含 failReason/waiveReason） |
| 就绪豁免 | domain_docs/mes/smt_playbook/03_run_flow/02_readiness_and_prep.md；user_docs/04_quality.md；user_docs/sop_degraded_mode.md | POST /api/runs/:runNo/readiness/items/:itemId/waive<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 命名不一致/行为不一致 | 文档 | 已修复：统一 `readiness:override` 术语并移除不可豁免限制描述 |
| 就绪异常列表 | user_docs/04_quality.md | GET /api/readiness/exceptions<br>apps/server/src/modules/mes/readiness/routes.ts | apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx | 一致 | 无 | UI 支持 line/status/from/to 过滤，列表展示失败/豁免数量 |
| 产线就绪配置 | domain_docs/mes/tech/api/01_api_overview.md | GET /api/lines/:lineId/readiness-config<br>PUT /api/lines/:lineId/readiness-config | apps/web/src/routes/_authenticated/mes/readiness-config.tsx | 缺失 | 文档 | 已修复：补充默认启用与工艺类型说明 |

---

## 5. 偏差清单

- 已修复：统一 `readiness:override` 术语，删除不可豁免限制描述。
- 已修复：补充 PRECHECK/FORMAL 触发方式与 UI 行为说明。
- 已修复：PREP_PASTE/PROGRAM 数据来源与说明对齐实现。
- 已修复：就绪配置说明补齐默认启用与工艺类型维护。
- 已修复：demo/异常相关错误码对齐实现（READINESS_CHECK_FAILED / READINESS_CHECK_NOT_PASSED）。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，建议进入下一轮 Review。
