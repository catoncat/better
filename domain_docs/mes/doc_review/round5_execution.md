# 轮次5：Stations / Execution

---

## 1. 轮次目标

- 对齐 Stations / Execution 域文档 ↔ API ↔ UI，覆盖站点列表、队列、进出站与执行门禁。

---

## 2. 覆盖范围（Scope）

- API 域：/api/stations/*
- UI 页面：apps/web/src/routes/_authenticated/mes/execution.tsx
- 文档入口：domain_docs/mes/tech/api/01_api_overview.md，domain_docs/mes/tech/api/02_api_contracts_execution.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/process/02_state_machines.md
2. Playbook：domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md
3. User Docs：user_docs/06_operator.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 站点列表/分组 | domain_docs/mes/tech/api/01_api_overview.md | GET /api/stations<br>GET /api/stations/groups | apps/web/src/routes/_authenticated/mes/execution.tsx | 无 | - | 列表按用户数据权限过滤 |
| 站点队列 | domain_docs/mes/tech/api/01_api_overview.md | GET /api/stations/:stationCode/queue | apps/web/src/routes/_authenticated/mes/execution.tsx | 无 | - | 队列返回当前 IN_STATION 单件 |
| 手动进站 | domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md；user_docs/06_operator.md | POST /api/stations/:stationCode/track-in | apps/web/src/routes/_authenticated/mes/execution.tsx | 行为不一致 | 文档 | 已修复：补充 PREP + FAI 试产门禁与首工序限制 |
| 手动出站 | domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md；user_docs/06_operator.md | POST /api/stations/:stationCode/track-out | apps/web/src/routes/_authenticated/mes/execution.tsx | 行为不一致 | 文档 | 已修复：补充 PREP + FAI 试产门禁、SPI/AOI FAIL 强制结果 |
| SN 解析/自动填充 | domain_docs/mes/tech/api/02_api_contracts_execution.md | GET /api/stations/resolve-unit/:sn | apps/web/src/routes/_authenticated/mes/execution.tsx | 缺失 | 文档 | 已修复：补充 resolve-unit API 合约 |
| 数据采集规格 | domain_docs/mes/tech/api/02_api_contracts_execution.md | GET /api/stations/:stationCode/unit/:sn/data-specs | apps/web/src/routes/_authenticated/mes/execution.tsx<br>apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx | 缺失 | 文档 | 已修复：补充 data-specs API 合约 |
| 作业指导书（SOP）入口 | user_docs/06_operator.md | - | - | 未实现 | 文档 | 已修复：降级描述为“工艺文档/工位配置查看” |
| 手动检测结果录入 | user_docs/06_operator.md | - | - | 未实现 | 文档 | 已修复：移除未实现入口说明 |

---

## 5. 偏差清单

- 已修复：补充 resolve-unit 与 data-specs 的 API 合约说明。
- 已修复：Playbook 补充 PREP + FAI 试产门禁与首工序限制。
- 已修复：Playbook/User Docs 补充 SPI/AOI FAIL 强制结果说明。
- 已修复：补充 TrackIn 受 TPM 设备状态/维护任务影响说明。
- 已修复：User Docs 降级 SOP 入口描述。
- 已修复：User Docs 移除“检测结果录入”入口说明。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，建议进入下一轮 Review。
