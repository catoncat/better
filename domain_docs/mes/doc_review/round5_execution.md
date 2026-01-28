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
| 手动进站 | domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md；user_docs/06_operator.md | POST /api/stations/:stationCode/track-in | apps/web/src/routes/_authenticated/mes/execution.tsx | 行为不一致 | 文档 | Playbook 前置条件仅允许 AUTHORIZED；实现允许 PREP + FAI 试产门禁 |
| 手动出站 | domain_docs/mes/smt_playbook/03_run_flow/05_execution_and_trace.md；user_docs/06_operator.md | POST /api/stations/:stationCode/track-out | apps/web/src/routes/_authenticated/mes/execution.tsx | 行为不一致 | 文档 | 实现允许 PREP + FAI 试产门禁；SPI/AOI FAIL 会强制结果为 FAIL |
| SN 解析/自动填充 | 缺失（待补 API 合约） | GET /api/stations/resolve-unit/:sn | apps/web/src/routes/_authenticated/mes/execution.tsx | 缺失 | 文档 | API 合约未描述 resolve-unit |
| 数据采集规格 | 缺失（待补 API 合约） | GET /api/stations/:stationCode/unit/:sn/data-specs | apps/web/src/routes/_authenticated/mes/execution.tsx<br>apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx | 缺失 | 文档 | API 合约未描述 data-specs |
| 作业指导书（SOP）入口 | user_docs/06_operator.md | - | - | 未实现 | 文档 | UI 暂无 SOP/作业指导书入口 |
| 手动检测结果录入 | user_docs/06_operator.md | - | - | 未实现 | 文档 | UI 暂无“检测结果录入”入口（非出站弹窗） |

---

## 5. 偏差清单

- **文档缺失**：API 合约未描述 `GET /api/stations/resolve-unit/:sn` 与 `GET /api/stations/:stationCode/unit/:sn/data-specs`（文档补充）。
- **行为不一致**：Playbook 前置条件仅允许 `AUTHORIZED`（且 FAI=PASS），实现允许 `PREP` 在 FAI 试产门禁通过后 TrackIn（文档需补充）。
- **行为不一致**：实现存在 SPI/AOI 检测 FAIL 自动强制 TrackOut 结果为 FAIL；Playbook/User Docs 未描述。
- **文档缺失**：TrackIn 受 TPM 设备状态/维护任务影响（`TPM_EQUIPMENT_UNAVAILABLE`/`TPM_MAINTENANCE_IN_PROGRESS`），当前文档未覆盖。
- **未实现**：User Docs 描述 SOP/作业指导书入口，但 UI 未提供入口（文档需降级描述）。
- **未实现**：User Docs 描述“检测结果录入”入口，但 UI 未提供入口（文档需降级描述）。

---

## 6. 结论与下一步

- 需要补齐执行域 API 合约与 operator 文档，确保与当前 UI/API 一致。
- 补充 Playbook 对 PREP + FAI 试产门禁的说明。
