# 轮次4：Routing

---

## 1. 轮次目标

- 对齐 Routing 域文档 ↔ API ↔ UI，覆盖路由列表/详情、版本、编译与执行配置。

---

## 2. 覆盖范围（Scope）

- API 域：/api/routes/*
- UI 页面：apps/web/src/routes/_authenticated/mes/routes/index.tsx，apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx，apps/web/src/routes/_authenticated/mes/route-versions.tsx
- 文档入口：domain_docs/mes/spec/routing/01_routing_engine.md，domain_docs/mes/tech/api/01_api_overview.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/routing/01_routing_engine.md
2. Playbook：domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md
3. User Docs：user_docs/03_engineer.md；user_docs/02_planner.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 路由列表/查看 | domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md；user_docs/03_engineer.md | GET /api/routes<br>GET /api/routes/:routingCode | apps/web/src/routes/_authenticated/mes/routes/index.tsx<br>apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 行为不一致 | 文档 | search 支持路由编码/名称/产品编码；列表列包含产品编码/工艺类型/步骤数 |
| 路由工艺类型维护 | user_docs/03_engineer.md | PATCH /api/routes/:routingCode | apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 缺失 | 文档 | 路由详情页支持 processType 更新 |
| 路由版本与编译 | domain_docs/mes/spec/routing/01_routing_engine.md；user_docs/03_engineer.md | GET /api/routes/:routingCode/versions<br>GET /api/routes/:routingCode/versions/:versionNo<br>POST /api/routes/:routingCode/compile | apps/web/src/routes/_authenticated/mes/route-versions.tsx<br>apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 行为不一致 | 文档 | 版本状态为 READY/INVALID，无发布/废弃动作；编译后触发受影响 Run 预检 |
| 执行配置 | domain_docs/mes/spec/routing/01_routing_engine.md；user_docs/03_engineer.md | GET /api/routes/:routingCode/execution-config<br>POST /api/routes/:routingCode/execution-config<br>PATCH /api/routes/:routingCode/execution-config/:configId | apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 行为不一致 | 文档 | UI 表单维护 scope(ROUTE/STEP)、stationType、站点组/允许站点、FAI/授权门禁、数据采集与 ingestMapping |
| 路由选择与版本绑定 | domain_docs/mes/spec/routing/01_routing_engine.md；domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md | POST /api/work-orders/:woNo/release<br>POST /api/work-orders/:woNo/runs<br>apps/server/src/modules/mes/work-order/service.ts | apps/web/src/routes/_authenticated/mes/-components/work-order-release-dialog.tsx<br>apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx | 行为不一致 | 文档 | 实际要求工单已关联 routingId，且仅选择 READY 版本 |

---

## 5. 偏差清单

- user_docs/03_engineer.md 描述路由创建/流程图编辑/发布版本等能力，但当前 UI/API 仅支持路由查看、执行配置维护与编译。
- 路由列表筛选条件与 UI 不一致（文档含产品/状态/创建日期）。
- 路由版本状态/动作与 UI 不一致（文档含“发布/废弃”，UI 显示 READY/INVALID）。
- 路由工艺类型维护未在文档中体现。
- 路由选择规则与实现不一致（文档描述自动匹配 productCode/有效期，实际发布需明确关联 routingId 且仅取 READY 版本）。

---

## 6. 结论与下一步

- 本轮发现路由管理文档与现有 UI/API 存在差异，需修正文档以贴合实际能力与路由选择逻辑。
