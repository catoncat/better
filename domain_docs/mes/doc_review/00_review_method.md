# Doc Review 方法（Meta）

> 目标：保证文档与实现一致，且 Review 产出可追踪、可拆分。

---

## 1. 真源层级（裁决）

1. `domain_docs/mes/spec/`
2. `domain_docs/mes/dip_playbook/`、`domain_docs/mes/smt_playbook/`
3. `user_docs/`

冲突处理：以高层级文档为准，低层级文档必须修正或显式标注偏差。

---

## 2. 驱动入口

- **API 驱动**：先对齐 API 合约/实现，再回查文档并对齐 UI。

---

## 3. 最小 Review 单元

每个功能点必须映射：
- 文档位置（spec/playbook/user_docs）
- API 接口（路径/字段）
- UI 位置（页面/组件/路由）

并输出：
- 对齐矩阵
- 偏差类型：缺失 / 命名不一致 / 行为不一致 / 未实现
- 修复责任：文档 / API / UI / 暂缓

---

## 4. 产出与状态

- 对齐矩阵：`00_alignment_matrix_template.md`
- 功能点清单：`00_review_backlog.md`
- 进度状态：`00_status.md`

---

## 5. 执行节奏（轮次）

- 以 API 域为维度划分轮次
- 轮次顺序后续再定，不在此文档锁死
