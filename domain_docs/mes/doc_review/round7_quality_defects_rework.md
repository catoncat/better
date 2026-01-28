# 轮次7：Quality（Defects / Rework Tasks）

---

## 1. 轮次目标

- 对齐缺陷处置与返工任务文档 ↔ API ↔ UI，覆盖不良登记、处置判定、返工任务流转。

---

## 2. 覆盖范围（Scope）

- API 域：/api/defects/*，/api/rework-tasks/*
- UI 页面：apps/web/src/routes/_authenticated/mes/defects.tsx，apps/web/src/routes/_authenticated/mes/rework-tasks.tsx
- 文档入口：domain_docs/mes/tech/api/03_api_contracts_quality.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/process/02_state_machines.md
2. Playbook：domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md
3. User Docs：user_docs/04_quality.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 缺陷列表/详情 | user_docs/04_quality.md | GET /api/defects<br>GET /api/defects/:defectId<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/defects.tsx | 缺失 | 文档 | API 合约未覆盖 GET 缺陷接口 |
| 缺陷处置判定 | domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md；user_docs/04_quality.md | POST /api/defects/:defectId/disposition<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/defects.tsx | 无 | - | REWORK 创建返工任务并将 Unit 置为 QUEUED |
| 缺陷放行/解锁 | TBD | POST /api/defects/:defectId/release<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/defects.tsx | 缺失 | 文档 | API 合约未覆盖 release |
| 返工任务列表 | user_docs/04_quality.md | GET /api/rework-tasks<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/rework-tasks.tsx | 缺失 | 文档 | API 合约未覆盖 rework-tasks 列表；User Docs 描述“手动创建”与 UI 不一致 |
| 返工完成 | user_docs/04_quality.md | POST /api/rework-tasks/:taskId/complete<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/rework-tasks.tsx | 命名不一致 | 文档 | 合约写 /api/rework/:reworkId/complete |
| 返工记录录入 | user_docs/04_quality.md | POST /api/rework-tasks/:taskId/repair-record<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/rework-tasks.tsx | 缺失 | 文档 | UI 支持记录返修原因/动作/结果 |

---

## 5. 偏差清单

- **文档缺失**：API 合约未覆盖缺陷查询（GET /api/defects、GET /api/defects/:id）与 release 释放。
- **命名不一致**：API 合约写 `/api/rework/{reworkId}/complete`，实际为 `/api/rework-tasks/:taskId/complete`。
- **文档缺失**：API 合约未覆盖 rework-tasks 列表与 repair-record 记录。
- **行为不一致**：User Docs 说明返工任务可手动创建，但 UI 无入口，实际为处置自动生成。
- **文档缺失**：User Docs 未描述 HOLD 放行与返修记录录入。

---

## 6. 结论与下一步

- 需补齐质量合约与用户文档（缺陷查询/放行、返工任务与返修记录说明），对齐当前实现后再进入下一轮。
