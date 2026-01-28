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
| 工单接收（外部） | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | POST /api/integration/work-orders | apps/web/src/routes/_authenticated/mes/-components/work-order-receive-dialog.tsx | 行为不一致 | 文档 | UI 为“接收外部工单”手动录入；user_docs/02_planner.md 描述为列表中点击接收待接收工单 |
| 工单列表/查看 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | GET /api/work-orders<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/work-orders.tsx | 行为不一致 | 文档 | 列表查询仅支持 status/erpPickStatus/routingId/search；无产品型号/日期范围筛选 |
| 工单释放 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | POST /api/work-orders/:woNo/release<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/work-orders.tsx<br>apps/web/src/routes/_authenticated/mes/-components/work-order-release-dialog.tsx | TBD | TBD | 需 WO=RECEIVED；路由需 READY；记录派工线到 meta.dispatch |
| 创建批次 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md<br>user_docs/02_planner.md | POST /api/work-orders/:woNo/runs<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/work-orders.tsx<br>apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx | 行为不一致 | 文档 | 实际仅线体 + 计划数量；shiftCode/changeoverNo 暂隐藏，未见序列号范围/计划开始/备注 |
| 工单更新（计划数量/交期/优先级/备注） | user_docs/02_planner.md | - | - | 未实现 | 文档 | 仅存在 routing/pick-status 更新接口，未见通用工单编辑能力 |
| 工单路由更新 | user_docs/02_planner.md | PATCH /api/work-orders/:woNo/routing<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/-components/work-order-routing-dialog.tsx | 缺失 | 文档 | user_docs/02_planner.md 未描述路由调整流程（仅提“确认路由已配置”） |
| 工单领料状态更新 | user_docs/02_planner.md | PATCH /api/work-orders/:woNo/pick-status<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/-components/pick-status-dialog.tsx | 缺失 | 文档 | UI 仅对“非 ERP 工单”开放编辑；user_docs/02_planner.md 未描述领料状态维护 |
| 工单收尾 | user_docs/02_planner.md | POST /api/work-orders/:woNo/close<br>apps/server/src/modules/mes/work-order/routes.ts | apps/web/src/routes/_authenticated/mes/-components/closeout-dialog.tsx | 缺失 | 文档 | user_docs/02_planner.md 未覆盖工单收尾操作 |
| 批次列表/查看 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>user_docs/02_planner.md | GET /api/runs<br>GET /api/runs/:runNo<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/index.tsx<br>apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 行为不一致 | 文档 | 列表查询仅 status/search/woNo/lineCode，未见创建日期筛选 |
| 批次授权 | domain_docs/mes/smt_playbook/03_run_flow/01_work_order_to_run.md<br>domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md<br>domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md<br>user_docs/02_planner.md | POST /api/runs/:runNo/authorize<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | 命名不一致 | 文档 | 异常文档错误码与实现不一致：实现为 READINESS_CHECK_FAILED / FAI_NOT_PASSED / RUN_NOT_READY |
| 生成单件 | domain_docs/mes/smt_playbook/05_validation/02_run_and_execution_validation.md | POST /api/runs/:runNo/generate-units<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | TBD | TBD | UI 仅输入数量，未暴露 snPrefix |
| 批次收尾 | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md | POST /api/runs/:runNo/close<br>apps/server/src/modules/mes/run/routes.ts | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx<br>apps/web/src/routes/_authenticated/mes/-components/closeout-dialog.tsx | 行为不一致 | 文档 | 实际需手动触发 closeout；仅 IN_PROGRESS 且 Unit 终态可关闭，可能返回 OQC_REQUIRED |
| 批次让步/MRB | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md<br>domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md | POST /api/runs/:runNo/mrb-decision | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx<br>apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx | TBD | TBD | MRB 决策含 reworkType/faiWaiver/原因；REWORK 会自动创建返修 Run |
| 批次返工 | domain_docs/mes/smt_playbook/03_run_flow/06_oqc_closeout.md<br>domain_docs/mes/smt_playbook/03_run_flow/07_exception_and_recovery.md | POST /api/runs/:runNo/rework<br>GET /api/runs/:runNo/rework-runs | apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx | TBD | TBD | reworkType + mrbDecisionId + faiWaiver（合约约束） |

---

## 5. 偏差清单

- 工单接收：user_docs/02_planner.md 描述为列表中“接收待接收工单”，UI 实际为“接收外部工单”手动录入。
- 工单列表/批次列表：user_docs/02_planner.md 提到产品型号/日期筛选，但 API/UI 当前未支持。
- 创建批次：user_docs/02_planner.md 描述序列号范围/计划开始/备注等字段，UI 仅线体+计划数量。
- 工单更新：user_docs/02_planner.md 描述通用编辑能力，但当前仅支持路由/领料状态更新。
- 工单路由/领料状态/收尾：API+UI 存在，user_docs/02_planner.md 缺失操作说明。
- 批次授权异常码：异常文档中的错误码与实现不一致（READINESS_CHECK_FAILED / FAI_NOT_PASSED / RUN_NOT_READY）。
- 批次收尾：文档描述偏“自动完工”，实现需手动触发 closeout 且有 OQC_REQUIRED 返回。

---

## 6. 结论与下一步

- 优先更新 user_docs/02_planner.md：接收方式、筛选项、创建批次字段、工单更新/收尾/领料状态说明。
- 更新异常文档（03_run_flow/07_exception_and_recovery.md）中的授权错误码以匹配实现。
- 在 06_oqc_closeout.md 中补充“手动触发 closeout”的操作入口与返回码说明。
