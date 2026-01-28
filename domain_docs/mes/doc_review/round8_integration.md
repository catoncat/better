# 轮次8：Integration

> 用途：Integration 域 Doc ↔ API ↔ UI 对齐与偏差记录。

---

## 1. 轮次目标

- 对齐 Integration 域接口清单、UI 入口与文档说明，输出可执行偏差清单（Doc/API/UI）。

---

## 2. 覆盖范围（Scope）

- API 域：Integration
- UI 页面：
  - apps/web/src/routes/_authenticated/mes/integration/status.tsx
  - apps/web/src/routes/_authenticated/mes/integration/device-data.tsx
  - apps/web/src/routes/_authenticated/mes/integration/manual-entry.tsx
  - apps/web/src/routes/_authenticated/system/integrations.tsx
- 文档入口：
  - domain_docs/mes/tech/api/01_api_overview.md

---

## 3. 输入文档（按真源层级）

1. Spec：
   - domain_docs/mes/tech/api/01_api_overview.md（Integration 小节）
   - domain_docs/mes/spec/integration/01_system_integrations.md
   - domain_docs/mes/spec/integration/02_integration_payloads.md
   - domain_docs/mes/spec/impl_align/01_e2e_align.md（Integration 条目）
2. Playbook：-（暂无）
3. User Docs：
   - user_docs/01_admin.md
   - user_docs/03_engineer.md
   - user_docs/sop_degraded_mode.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 集成状态总览 | domain_docs/mes/tech/api/01_api_overview.md | GET /api/integration/status<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/mes/integration/status.tsx | 无 | - | UI 展示定时同步与游标 |
| 集成同步管理入口 | user_docs/01_admin.md<br>user_docs/03_engineer.md | GET /api/integration/status | apps/web/src/routes/_authenticated/system/integrations.tsx | 无 | - | 文档路由与实现一致 |
| 集成监控页路径 | user_docs/sop_degraded_mode.md | GET /api/integration/status | apps/web/src/routes/_authenticated/mes/integration/status.tsx | 命名不一致 | 文档 | 已修复：SOP 更新为 `/mes/integration/status` |
| ERP 路由同步 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/erp/routes/sync<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/system/integrations.tsx | 无 | - | 手动同步入口 |
| ERP 工单同步 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/erp/work-orders/sync<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/system/integrations.tsx | 无 | - | 手动同步入口 |
| ERP 物料/BOM/工位同步 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/erp/materials/sync<br>POST /api/integration/erp/boms/sync<br>POST /api/integration/erp/work-centers/sync<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/system/integrations.tsx | 无 | - | 手动同步入口 |
| TPM 设备/状态/保养同步 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/tpm/equipment/sync<br>POST /api/integration/tpm/status-logs/sync<br>POST /api/integration/tpm/maintenance-tasks/sync<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/system/integrations.tsx | 无 | - | 手动同步入口 |
| 外部推送工单 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/work-orders<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/mes/-components/work-order-receive-dialog.tsx | 无 | - | 入口在工单页（Work Orders） |
| 钢网/锡膏绑定状态推送 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/stencil-status<br>POST /api/integration/solder-paste-status<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/mes/integration/manual-entry.tsx | 无 | - | 手动录入耗材状态 |
| 设备数据查询 | domain_docs/mes/tech/api/01_api_overview.md | GET /api/integration/device-data<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/mes/integration/device-data.tsx | 无 | - | 列表/筛选查询 |
| 设备数据写入 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/device-data<br>apps/server/src/modules/mes/integration/routes.ts | - | 未实现 | 文档 | 已修复：API overview 说明“写入为外部系统推送” |
| 线体钢网/锡膏绑定 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/lines/:lineId/stencil/bind<br>POST /api/integration/lines/:lineId/stencil/unbind<br>POST /api/integration/lines/:lineId/solder-paste/bind<br>POST /api/integration/lines/:lineId/solder-paste/unbind<br>apps/server/src/modules/mes/integration/routes.ts | apps/web/src/routes/_authenticated/mes/integration/manual-entry.tsx | 无 | - | 线体绑定操作在手动录入页 |
| 出站事件回传 | domain_docs/mes/tech/api/01_api_overview.md | POST /api/integration/outbound/erp/runs/:runNo/completion<br>GET /api/integration/outbound/events<br>POST /api/integration/outbound/events/:eventId/retry<br>apps/server/src/modules/mes/integration/routes.ts | - | 未实现 | 文档 | 已修复：API overview 标注为运维/系统对接接口 |

---

## 5. 偏差清单

- 已修复：SOP 监控页路径更正为 `/mes/integration/status`。
- 已修复：API overview 补充设备数据写入与出站回传“无 UI 入口/系统对接”说明。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，可进入下一轮 Review。
