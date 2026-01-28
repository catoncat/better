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
| 缺陷列表/详情 | user_docs/04_quality.md | GET /api/defects<br>GET /api/defects/:defectId<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/defects.tsx | 缺失 | 文档 | 已修复：补齐缺陷查询合约 |
| 缺陷处置判定 | domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md；user_docs/04_quality.md | POST /api/defects/:defectId/disposition<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/defects.tsx | 无 | - | REWORK 创建返工任务并将 Unit 置为 QUEUED |
| 缺陷放行/解锁 | user_docs/04_quality.md | POST /api/defects/:defectId/release<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/defects.tsx | 缺失 | 文档 | 已修复：补齐放行/解锁说明 |
| 返工任务列表 | user_docs/04_quality.md | GET /api/rework-tasks<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/rework-tasks.tsx | 缺失 | 文档 | 已修复：补齐 rework-tasks 合约与“自动创建”说明 |
| 返工完成 | user_docs/04_quality.md | POST /api/rework-tasks/:taskId/complete<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/rework-tasks.tsx | 命名不一致 | 文档 | 已修复：合约路径对齐 |
| 返工记录录入 | user_docs/04_quality.md | POST /api/rework-tasks/:taskId/repair-record<br>apps/server/src/modules/mes/defect/routes.ts | apps/web/src/routes/_authenticated/mes/rework-tasks.tsx | 缺失 | 文档 | 已修复：补齐返修记录说明 |

---

## 5. 偏差清单

- 已修复：补齐缺陷查询与 release 放行合约。
- 已修复：rework 完成接口路径对齐。
- 已修复：补齐 rework-tasks 与 repair-record 合约。
- 已修复：User Docs 更新为“返工任务自动创建”并补充放行/返修记录说明。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，建议进入下一轮 Review。
