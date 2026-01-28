# 轮次1：Loading

---

## 1. 轮次目标

- 对齐 Loading 域文档 ↔ API ↔ UI，覆盖上料执行与上料配置/料站映射。

---

## 2. 覆盖范围（Scope）

- API 域：/api/runs/:runNo/loading/*（含 /load-table），/api/loading/*，/api/lines/:lineId/feeder-slots*，/api/feeder-slots/:slotId/unlock，/api/slot-mappings*
- UI 页面：apps/web/src/routes/_authenticated/mes/loading/index.tsx，apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx
- 文档入口：domain_docs/mes/spec/impl_align/01_e2e_align.md，domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md，domain_docs/mes/tech/api/01_api_overview.md

---

## 3. 输入文档（按真源层级）

1. Spec：domain_docs/mes/spec/impl_align/01_e2e_align.md
2. Playbook：domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md
3. User Docs：user_docs/05_material.md

---

## 4. 对齐矩阵

> 参照 `00_alignment_matrix_template.md` 填写

| 功能点 | 文档（Spec/Playbook/User Docs） | API（路径/字段） | UI（页面/组件） | 偏差类型 | 修复责任 | 备注 |
|------|-------------------------------|----------------|---------------|---------|---------|------|
| 上料期望清单/加载状态 | domain_docs/mes/spec/impl_align/01_e2e_align.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md<br>user_docs/05_material.md | POST /api/runs/:runNo/loading/load-table<br>GET /api/runs/:runNo/loading<br>GET /api/runs/:runNo/loading/expectations<br>apps/server/src/modules/mes/loading/routes.ts | apps/web/src/routes/_authenticated/mes/loading/index.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx | 缺失 | 文档 | 已修复（user_docs/05_material.md 补充 load-table 失败场景与异常处理） |
| 上料验证 | domain_docs/mes/spec/impl_align/01_e2e_align.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md<br>user_docs/05_material.md | POST /api/loading/verify<br>apps/server/src/modules/mes/loading/routes.ts<br>apps/server/src/modules/mes/loading/service.ts | apps/web/src/routes/_authenticated/mes/loading/index.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx | 缺失 | 文档 | 已修复（user_docs/05_material.md 补充锁定/错误码处理） |
| 上料替换 | domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md<br>user_docs/05_material.md | POST /api/loading/replace<br>apps/server/src/modules/mes/loading/routes.ts<br>apps/server/src/modules/mes/loading/service.ts | apps/web/src/routes/_authenticated/mes/loading/index.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx | 行为不一致 | 文档 | 已修复（文档改为“换料模式”操作） |
| 料站槽位配置 | domain_docs/mes/smt_playbook/02_configuration/01_lines_and_slots.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md | GET/POST /api/lines/:lineId/feeder-slots<br>PUT/DELETE /api/lines/:lineId/feeder-slots/:slotId<br>POST /api/feeder-slots/:slotId/unlock<br>apps/server/src/modules/mes/loading/routes.ts | apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/slot-dialog.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx | 行为不一致 | 文档 | 已修复（解锁入参改为仅 reason + 登录用户记录） |
| 槽位映射 | domain_docs/mes/smt_playbook/02_configuration/03_slot_material_mapping.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md | GET/POST /api/slot-mappings<br>PUT/DELETE /api/slot-mappings/:id<br>apps/server/src/modules/mes/loading/routes.ts | apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/mapping-dialog.tsx | 命名不一致 | 文档 | 已修复（slotId 说明为 FeederSlot id，站位码为 slotCode） |

---

## 5. 偏差清单

- 已修复：user_docs/05_material.md 补充 load-table 失败场景与上料异常处理。
- 已修复：user_docs/05_material.md 换料操作描述改为“换料模式”。
- 已修复：03_loading_flow.md 解锁入参说明与 API 对齐。
- 已修复：03_slot_material_mapping.md 说明 slotId 为 FeederSlot id。

---

## 6. 结论与下一步

- 文档偏差已按“文档修复”完成，建议复核加载/换料/解锁指引一致性。
