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
| 上料期望清单/加载状态 | domain_docs/mes/spec/impl_align/01_e2e_align.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md<br>user_docs/05_material.md | POST /api/runs/:runNo/loading/load-table<br>GET /api/runs/:runNo/loading<br>GET /api/runs/:runNo/loading/expectations<br>apps/server/src/modules/mes/loading/routes.ts | apps/web/src/routes/_authenticated/mes/loading/index.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx | 缺失 | 文档 | user_docs/05_material.md 未覆盖 load-table 失败场景（SLOT_MAPPING_MISSING / LOADING_ALREADY_STARTED）与期望表异常处理 |
| 上料验证 | domain_docs/mes/spec/impl_align/01_e2e_align.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md<br>user_docs/05_material.md | POST /api/loading/verify<br>apps/server/src/modules/mes/loading/routes.ts<br>apps/server/src/modules/mes/loading/service.ts | apps/web/src/routes/_authenticated/mes/loading/index.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx | 缺失 | 文档 | user_docs/05_material.md 未覆盖幂等/锁定/错误码（SLOT_LOCKED、SLOT_ALREADY_LOADED 等）操作指引 |
| 上料替换 | domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md<br>user_docs/05_material.md | POST /api/loading/replace<br>apps/server/src/modules/mes/loading/routes.ts<br>apps/server/src/modules/mes/loading/service.ts | apps/web/src/routes/_authenticated/mes/loading/index.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx | 行为不一致 | 文档 | user_docs/05_material.md 描述“在站位列表中点击换料”，UI 实际为扫码面板“换料模式”切换，无行内按钮 |
| 料站槽位配置 | domain_docs/mes/smt_playbook/02_configuration/01_lines_and_slots.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md<br>domain_docs/mes/smt_playbook/05_validation/01_loading_validation.md | GET/POST /api/lines/:lineId/feeder-slots<br>PUT/DELETE /api/lines/:lineId/feeder-slots/:slotId<br>POST /api/feeder-slots/:slotId/unlock<br>apps/server/src/modules/mes/loading/routes.ts | apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/slot-dialog.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx | 行为不一致 | 文档 | 03_loading_flow.md 写“解锁需 operatorId”，但 API body 仅 reason（operatorId 取登录用户） |
| 槽位映射 | domain_docs/mes/smt_playbook/02_configuration/03_slot_material_mapping.md<br>domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md | GET/POST /api/slot-mappings<br>PUT/DELETE /api/slot-mappings/:id<br>apps/server/src/modules/mes/loading/routes.ts | apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx<br>apps/web/src/routes/_authenticated/mes/loading/-components/mapping-dialog.tsx | 命名不一致 | 文档 | 03_slot_material_mapping.md 中 `slotId` 示例为站位码（如 2F-46），实际 API 需要 FeederSlot id |

---

## 5. 偏差清单

- user_docs/05_material.md 未覆盖 load-table 失败场景与上料异常处理（SLOT_MAPPING_MISSING / LOADING_ALREADY_STARTED / SLOT_LOCKED 等）。
- user_docs/05_material.md 的换料操作描述与 UI 实际操作（扫码面板“换料模式”开关）不一致。
- smt_playbook/03_run_flow/03_loading_flow.md 对解锁入参（operatorId）描述与 API 实际一致性不足。
- smt_playbook/02_configuration/03_slot_material_mapping.md 字段示例 `slotId` 与实际 API 含义不一致。

---

## 6. 结论与下一步

- 建议优先修正 user_docs/05_material.md（补充异常场景与正确换料操作路径）。
- 修正 playbook 中解锁入参与 slotId 字段说明，避免与 API 含义冲突。
