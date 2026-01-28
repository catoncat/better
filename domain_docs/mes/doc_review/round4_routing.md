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
| 路由列表/查看 | domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md；user_docs/03_engineer.md | GET /api/routes<br>GET /api/routes/:routingCode | apps/web/src/routes/_authenticated/mes/routes/index.tsx<br>apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 行为不一致 | 文档 | 已修复：列表筛选与字段说明对齐（search + sourceSystem） |
| 路由工艺类型维护 | user_docs/03_engineer.md | PATCH /api/routes/:routingCode | apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 缺失 | 文档 | 已修复：补充 processType 更新入口说明 |
| 路由版本与编译 | domain_docs/mes/spec/routing/01_routing_engine.md；user_docs/03_engineer.md | GET /api/routes/:routingCode/versions<br>GET /api/routes/:routingCode/versions/:versionNo<br>POST /api/routes/:routingCode/compile | apps/web/src/routes/_authenticated/mes/route-versions.tsx<br>apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 行为不一致 | 文档 | 已修复：版本状态/编译流程与 UI 对齐 |
| 执行配置 | domain_docs/mes/spec/routing/01_routing_engine.md；user_docs/03_engineer.md | GET /api/routes/:routingCode/execution-config<br>POST /api/routes/:routingCode/execution-config<br>PATCH /api/routes/:routingCode/execution-config/:configId | apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx | 行为不一致 | 文档 | 已修复：执行语义配置项与 UI 表单对齐 |
| 路由选择与版本绑定 | domain_docs/mes/spec/routing/01_routing_engine.md；domain_docs/mes/smt_playbook/02_configuration/04_routes_and_products.md | POST /api/work-orders/:woNo/release<br>POST /api/work-orders/:woNo/runs<br>apps/server/src/modules/mes/work-order/service.ts | apps/web/src/routes/_authenticated/mes/-components/work-order-release-dialog.tsx<br>apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx | 行为不一致 | 文档 | 已修复：明确需关联 routingId 且仅使用 READY 版本 |

---

## 5. 偏差清单

- 已修复：路由管理说明收敛为“只读查看 + 执行语义配置 + 编译”。
- 已修复：路由列表筛选/字段与 UI 对齐。
- 已修复：路由版本状态/动作与 UI 对齐（READY/INVALID + 编译）。
- 已修复：补充路由工艺类型维护入口说明。
- 已修复：路由选择规则与实现对齐（必须关联 routingId）。

---

## 6. 结论与下一步

- 本轮偏差已修复并对齐文档，建议进入下一轮 Review。
