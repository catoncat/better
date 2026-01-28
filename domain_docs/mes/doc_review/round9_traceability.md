# 轮次9：Traceability

> 用途：Traceability 域 Doc ↔ API ↔ UI 对齐与偏差记录。

---

## 1. 轮次目标

- 对齐 Traceability 查询接口、输出字段与 UI 展示，产出可执行偏差清单。

---

## 2. 覆盖范围（Scope）

- API 域：Traceability
- UI 页面：
  - apps/web/src/routes/_authenticated/mes/trace.tsx
- 文档入口：
  - domain_docs/mes/tech/api/01_api_overview.md
  - domain_docs/mes/tech/api/04_api_contracts_trace.md
  - domain_docs/mes/spec/traceability/01_traceability_contract.md

---

## 3. 输入文档（按真源层级）

1. Spec：
   - domain_docs/mes/tech/api/01_api_overview.md（Traceability 小节）
   - domain_docs/mes/tech/api/04_api_contracts_trace.md
   - domain_docs/mes/spec/traceability/01_traceability_contract.md
2. Playbook：-（暂无）
3. User Docs：
   - user_docs/07_trace.md
   - user_docs/04_quality.md
   - user_docs/02_planner.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| SN 追溯查询 | domain_docs/mes/tech/api/04_api_contracts_trace.md<br>user_docs/07_trace.md | GET /api/trace/units/:sn<br>query: mode=run|latest<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 无 | - | UI 支持 SN 查询与 mode 切换 |
| 关键料批次反查 SN | domain_docs/mes/tech/api/04_api_contracts_trace.md<br>user_docs/07_trace.md | GET /api/trace/material-lots/:materialCode/:lotNo/units<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 无 | - | 已实现批次反查入口 |
| 追溯报告导出 | user_docs/07_trace.md | - | - | 未实现 | API/UI | 仍未开放 |
| Route/Steps/Tracks 输出 | domain_docs/mes/tech/api/04_api_contracts_trace.md | trace 响应：route、routeVersion、steps、tracks<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 无 | - | UI 已展示 steps |
| Ingest/载具追溯输出 | domain_docs/mes/tech/api/04_api_contracts_trace.md | trace 响应：ingestEvents、carrierTracks、carrierLoads、carrierDataValues<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 无 | - | UI 已展示载具/ingest 追溯 |
| 质量/上料/物料追溯输出 | domain_docs/mes/tech/api/04_api_contracts_trace.md | trace 响应：inspections、defects、loadingRecords、materials<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 无 | - | UI 已展示 inspections/loadingRecords |

---

## 5. 偏差清单

- 待实现：追溯报告导出（API/UI）。

---

## 6. 结论与下一步

- Traceability 关键缺口已补齐，仅保留导出能力待实现。
