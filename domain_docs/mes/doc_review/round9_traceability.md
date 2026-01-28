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
| 关键料批次反查 SN | domain_docs/mes/tech/api/04_api_contracts_trace.md<br>user_docs/07_trace.md | GET /api/trace/material-lots/:materialCode/:lotNo/units | - | 未实现 | API | 合约/文档存在，但后端路由未实现 |
| 追溯报告导出 | user_docs/07_trace.md | - | - | 未实现 | API/UI | 文档提到导出能力，当前未发现接口与 UI |
| Route/Steps/Tracks 输出 | domain_docs/mes/tech/api/04_api_contracts_trace.md | trace 响应：route、routeVersion、steps、tracks<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 缺失 | UI | UI 展示 route + tracks，未展示 steps |
| Ingest/载具追溯输出 | domain_docs/mes/tech/api/04_api_contracts_trace.md | trace 响应：ingestEvents、carrierTracks、carrierLoads、carrierDataValues<br>apps/server/src/modules/mes/trace/routes.ts | - | 未实现 | UI | UI 未展示载具/ingest 追溯 |
| 质量/上料/物料追溯输出 | domain_docs/mes/tech/api/04_api_contracts_trace.md | trace 响应：inspections、defects、loadingRecords、materials<br>apps/server/src/modules/mes/trace/routes.ts | apps/web/src/routes/_authenticated/mes/trace.tsx | 缺失 | UI | UI 展示 defects/materials/dataValues，未展示 inspections/loadingRecords |

---

## 5. 偏差清单

- [ ] Severity: High | 关键料批次反查接口未实现 | 证据：domain_docs/mes/tech/api/04_api_contracts_trace.md；apps/server/src/modules/mes/trace/routes.ts | 建议归属：API | 下一步：补实现或调整合约/文档
- [ ] Severity: Medium | 追溯报告导出未实现 | 证据：user_docs/07_trace.md；未发现 API/UI | 建议归属：API/UI | 下一步：补接口与导出入口或修正文档
- [ ] Severity: Medium | Trace 输出字段 UI 缺失（steps/inspections/loadingRecords/ingest/carrier） | 证据：domain_docs/mes/tech/api/04_api_contracts_trace.md；apps/web/src/routes/_authenticated/mes/trace.tsx | 建议归属：UI | 下一步：补展示或说明范围

---

## 6. 结论与下一步

- Trace 基础 SN 查询可用，但“反向追溯/导出/载具与质检明细展示”存在缺口。
