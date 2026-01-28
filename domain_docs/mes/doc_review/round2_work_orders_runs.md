# 轮次2：Work Orders / Runs

---

## 1. 轮次目标

- 对齐 Work Orders / Runs 域文档 ↔ API ↔ UI，覆盖工单释放、批次创建、批次授权/返工/让步等核心动作。

---

## 2. 覆盖范围（Scope）

- API 域：/api/work-orders/*，/api/runs/*
- UI 页面：apps/web/src/routes/_authenticated/mes/work-orders.tsx，apps/web/src/routes/_authenticated/mes/runs/index.tsx，apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx
- 文档入口：domain_docs/mes/spec/impl_align/01_e2e_align.md，domain_docs/mes/tech/api/01_api_overview.md，domain_docs/mes/tech/api/02_api_contracts_execution.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/impl_align/01_e2e_align.md
2. Playbook：domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md；domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md；domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md；domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md
3. User Docs：user_docs/02_planner.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 工单接收（外部） | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | POST /api/integration/work-orders | apps/web/src/routes/_authenticated/mes/-components/work-order-receive-dialog.tsx | 行为不一致 | 文档 | 已修复：user_docs/02_planner.md 改为“接收外部工单”手动录入 |
| 工单列表/查看 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | GET /api/work-orders<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/work-orders.tsx | 行为不一致 | 文档 | 已修复：user_docs/02_planner.md 调整为状态/领料/路由/搜索 |
| 工单释放 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | POST /api/work-orders/:woNo/release<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/work-orders.tsx<br>apps/web/src/routes/_authenticated/mes/-components/work-order-release-dialog.tsx | TBD | TBD | 需 WO=RECEIVED；路由需 READY；记录派工线到 meta.dispatch |
| 创建批次 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md<br>user_docs/02_planner.md | POST /api/work-orders/:woNo/runs<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/work-orders.tsx<br>apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx | 行为不一致 | 文档 | 已修复：user_docs/02_planner.md 仅保留线体+计划数量 |
| 工单更新（计划数量/交期/优先级/备注） | user_docs/02_planner.md | - | - | 未实现 | 文档 | 已修复：user_docs/02_planner.md 改为路由/领料/收尾操作 |
| 工单路由更新 | user_docs/02_planner.md | PATCH /api/work-orders/:woNo/routing<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/-components/work-order-routing-dialog.tsx | 缺失 | 文档 | 已修复：user_docs/02_planner.md 补充“关联路由”操作 |
| 工单领料状态更新 | user_docs/02_planner.md | PATCH /api/work-orders/:woNo/pick-status<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/-components/pick-status-dialog.tsx | 缺失 | 文档 | 已修复：user_docs/02_planner.md 补充“修改物料状态”（仅手工工单） |
| 工单收尾 | user_docs/02_planner.md | POST /api/work-orders/:woNo/close<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/-components/closeout-dialog.tsx | 缺失 | 文档 | 已修复：user_docs/02_planner.md 补充收尾操作 |
| 批次列表/查看 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | GET /api/runs<br>GET /api/runs/:runNo<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/index.tsx<br>apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | 已修复：user_docs/02_planner.md 调整为状态/线体/搜索 |
| 批次授权 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md<br>domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md<br>user_docs/02_planner.md | POST /api/runs/:runNo/authorize<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 命名不一致 | 文档 | 已修复：异常文档错误码与实现对齐（READINESS_CHECK_FAILED / FAI_NOT_PASSED / RUN_NOT_READY） |
| 生成单件 | domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md | POST /api/runs/:runNo/generate-units<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | TBD | TBD | UI 仅输入数量，未暴露 snPrefix |
| 批次收尾 | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md | POST /api/runs/:runNo/close<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx<br>apps/web/src/routes/_authenticated/mes/-components/closeout-dialog.tsx | 行为不一致 | 文档 | 已修复：文档补充手动触发与 OQC_REQUIRED 行为 |
| 批次让步/MRB | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md<br>domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md | POST /api/runs/:runNo/mrb-decision | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx<br>apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx | TBD | TBD | MRB 决策含 reworkType/faiWaiver/原因；REWORK 会自动创建返修 Run |
| 批次返工 | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md<br>domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md | POST /api/runs/:runNo/rework<br>GET /api/runs/:runNo/rework-runs | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | TBD | TBD | reworkType + mrbDecisionId + faiWaiver（合约约束） |

---

## 5. 偏差清单

- 已修复：工单接收流程与 UI 对齐（手动接收外部工单）。
- 已修复：工单/批次列表筛选说明与现有能力对齐。
- 已修复：创建批次字段与 UI 对齐（线体 + 计划数量）。
- 已修复：工单维护能力改为路由/领料/收尾操作说明。
- 已修复：授权错误码与实现对齐。
- 已修复：收尾需手动触发与 OQC_REQUIRED 说明补齐。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，建议进入下一轮 Review。
