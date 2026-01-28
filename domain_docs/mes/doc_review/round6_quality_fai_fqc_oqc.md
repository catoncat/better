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
| FAI 任务（创建/开始/录入/完成） | domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；user_docs/04_quality.md | GET /api/fai<br>GET /api/fai/:faiId<br>GET /api/fai/run/:runNo<br>POST /api/fai/run/:runNo<br>POST /api/fai/:faiId/start<br>POST /api/fai/:faiId/items<br>POST /api/fai/:faiId/complete<br>apps/server/src/modules/mes/fai/routes.ts | apps/web/src/routes/_authenticated/mes/fai.tsx | 行为不一致 | 文档 | 已修复：补充 Run 详情页创建/试产入口说明 |
| FAI Gate | domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；user_docs/04_quality.md | GET /api/fai/run/:runNo/gate<br>apps/server/src/modules/mes/fai/routes.ts | apps/web/src/routes/_authenticated/mes/fai.tsx | 缺失 | 文档 | 已修复：补充 MRB_OVERRIDE + faiWaiver 例外说明 |
| FAI 签字 | domain_docs/mes/smt_playbook/03_run_flow/04_fai_flow.md；user_docs/04_quality.md | POST /api/fai/:faiId/sign<br>apps/server/src/modules/mes/fai/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | 已修复：签字入口/权限与 API 合约对齐 |
| FQC 任务（创建/开始/录入/完成） | user_docs/04_quality.md | GET /api/fqc<br>GET /api/fqc/:fqcId<br>GET /api/fqc/run/:runNo<br>POST /api/fqc/run/:runNo<br>POST /api/fqc/:fqcId/start<br>POST /api/fqc/:fqcId/items<br>POST /api/fqc/:fqcId/complete<br>apps/server/src/modules/mes/fqc/routes.ts | apps/web/src/routes/_authenticated/mes/fqc/index.tsx | 缺失 | 文档 | 已修复：补齐 FQC 说明与 API 合约 |
| FQC 签字 | user_docs/04_quality.md | POST /api/fqc/:fqcId/sign<br>apps/server/src/modules/mes/fqc/routes.ts | apps/web/src/routes/_authenticated/mes/fqc/index.tsx | 缺失 | 文档 | 已修复：补齐 FQC 签字说明 |
| OQC 任务（创建/开始/录入/完成） | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md；user_docs/04_quality.md | GET /api/oqc<br>GET /api/oqc/:oqcId<br>GET /api/oqc/run/:runNo<br>GET /api/oqc/run/:runNo/gate<br>POST /api/oqc/run/:runNo<br>POST /api/oqc/:oqcId/start<br>POST /api/oqc/:oqcId/items<br>POST /api/oqc/:oqcId/complete<br>apps/server/src/modules/mes/oqc/routes.ts | apps/web/src/routes/_authenticated/mes/oqc/index.tsx | 缺失 | 文档 | 已修复：补齐 OQC/收尾入口说明与 API overview |
| OQC 抽检规则 | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md；user_docs/04_quality.md | GET /api/oqc/sampling-rules<br>GET /api/oqc/sampling-rules/:ruleId<br>POST /api/oqc/sampling-rules<br>PATCH /api/oqc/sampling-rules/:ruleId<br>DELETE /api/oqc/sampling-rules/:ruleId<br>apps/server/src/modules/mes/oqc/sampling-rule-routes.ts | apps/web/src/routes/_authenticated/mes/oqc/rules.tsx | 缺失 | 文档 | 已修复：补齐抽检规则说明 |

---

## 5. 偏差清单

- 已修复：FAI 创建/试产入口说明补齐（Run 详情页）。
- 已修复：FAI Gate MRB_OVERRIDE + faiWaiver 例外说明补齐。
- 已修复：FAI 签字入口/权限与 API 合约对齐。
- 已修复：补齐 FQC（末件检验）及签字说明与 API 合约。
- 已修复：补齐 OQC/收尾入口说明与 API overview。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，建议进入下一轮 Review。
