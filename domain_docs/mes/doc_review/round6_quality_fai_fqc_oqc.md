# 轮次6：Quality（FAI / FQC / OQC）

---

## 1. 轮次目标

- 对齐质量域（FAI / FQC / OQC）文档 ↔ API ↔ UI，覆盖质检任务、抽检规则与门禁语义。

---

## 2. 覆盖范围（Scope）

- API 域：/api/fai/*，/api/fqc/*，/api/oqc/*
- UI 页面：apps/web/src/routes/_authenticated/mes/fai.tsx，apps/web/src/routes/_authenticated/mes/fqc/index.tsx，apps/web/src/routes/_authenticated/mes/oqc/index.tsx，apps/web/src/routes/_authenticated/mes/oqc/rules.tsx
- 文档入口：domain_docs/mes/tech/api/01_api_overview.md，domain_docs/mes/tech/api/02_api_contracts_execution.md，domain_docs/mes/tech/api/03_api_contracts_quality.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/process/02_state_machines.md
2. Playbook：domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md
3. User Docs：user_docs/04_quality.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| FAI 任务（创建/开始/录入/完成） | domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；user_docs/04_quality.md | GET /api/fai<br>GET /api/fai/:faiId<br>GET /api/fai/run/:runNo<br>POST /api/fai/run/:runNo<br>POST /api/fai/:faiId/start<br>POST /api/fai/:faiId/items<br>POST /api/fai/:faiId/complete<br>apps/server/src/modules/mes/fai/routes.ts | apps/web/src/routes/_authenticated/mes/fai.tsx | 行为不一致 | 文档 | FAI 页仅列表/录入/完成；创建/试产入口在 Run 详情页 |
| FAI Gate | domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；user_docs/04_quality.md | GET /api/fai/run/:runNo/gate<br>apps/server/src/modules/mes/fai/routes.ts | apps/web/src/routes/_authenticated/mes/fai.tsx | 缺失 | 文档 | MRB_OVERRIDE + faiWaiver 可绕过 FAI gate（文档未写） |
| FAI 签字 | domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；user_docs/04_quality.md | POST /api/fai/:faiId/sign<br>apps/server/src/modules/mes/fai/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | UI 在 Run 详情页签字；权限为 QUALITY_FAI（文档写 fai:sign），API 合约未列 sign |
| FQC 任务（创建/开始/录入/完成） | user_docs/04_quality.md | GET /api/fqc<br>GET /api/fqc/:fqcId<br>GET /api/fqc/run/:runNo<br>POST /api/fqc/run/:runNo<br>POST /api/fqc/:fqcId/start<br>POST /api/fqc/:fqcId/items<br>POST /api/fqc/:fqcId/complete<br>apps/server/src/modules/mes/fqc/routes.ts | apps/web/src/routes/_authenticated/mes/fqc/index.tsx | 缺失 | 文档 | User Docs/质量合约未覆盖 FQC；权限当前为 QUALITY_FAI，UI 含签字入口 |
| FQC 签字 | user_docs/04_quality.md | POST /api/fqc/:fqcId/sign<br>apps/server/src/modules/mes/fqc/routes.ts | apps/web/src/routes/_authenticated/mes/fqc/index.tsx | 缺失 | 文档 | User Docs 未覆盖 FQC 签字（权限为 QUALITY_FAI） |
| OQC 任务（创建/开始/录入/完成） | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md；user_docs/04_quality.md | GET /api/oqc<br>GET /api/oqc/:oqcId<br>GET /api/oqc/run/:runNo<br>GET /api/oqc/run/:runNo/gate<br>POST /api/oqc/run/:runNo<br>POST /api/oqc/:oqcId/start<br>POST /api/oqc/:oqcId/items<br>POST /api/oqc/:oqcId/complete<br>apps/server/src/modules/mes/oqc/routes.ts | apps/web/src/routes/_authenticated/mes/oqc/index.tsx | 缺失 | 文档 | User Docs 未覆盖 OQC；UI 未提供手动创建入口；收尾接口见 apps/server/src/modules/mes/run/routes.ts（API overview 未列） |
| OQC 抽检规则 | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md；user_docs/04_quality.md | GET /api/oqc/sampling-rules<br>GET /api/oqc/sampling-rules/:ruleId<br>POST /api/oqc/sampling-rules<br>PATCH /api/oqc/sampling-rules/:ruleId<br>DELETE /api/oqc/sampling-rules/:ruleId<br>apps/server/src/modules/mes/oqc/sampling-rule-routes.ts | apps/web/src/routes/_authenticated/mes/oqc/rules.tsx | 缺失 | 文档 | User Docs 未覆盖抽检规则；samplingType: PERCENTAGE/FIXED，sampleValue 允许 0 |

---

## 5. 偏差清单

- **行为不一致**：FAI 创建/试产入口在 Run 详情页，FAI 页面仅列表/录入/完成，User Docs 未描述此分工。
- **文档缺失**：FAI Gate 的 MRB_OVERRIDE + faiWaiver 绕过逻辑未在 Playbook/User Docs 标注。
- **文档缺失**：FAI 签字 API 未在合约中列出，且权限文档写 `fai:sign`，实现使用 QUALITY_FAI。
- **文档缺失**：FQC（末件检验）及签字流程未在 User Docs / API 合约中覆盖。
- **文档缺失**：OQC 用户文档缺失；API overview 未列 `/api/runs/:runNo/close` 收尾接口；UI 无手动创建 OQC 入口需说明。

---

## 6. 结论与下一步

- 需补齐质量域文档与 API 合约（FAI 签字/权限、FQC、OQC 收尾与 UI 入口说明），对齐当前实现后再进入下一轮。
