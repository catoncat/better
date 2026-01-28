# 交互矩阵模板（业务逻辑 > 规划 > UX > UI）

> 用途：每轮 `roundN_*.md` 的核心表格。每行必须可复现，并带证据（UI 路径 / API endpoint / 文档路径）。

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 例：为工单创建批次 | WO=RELEASED；`run:create` | 点击“创建批次”并选择产线 | 成功 toast + 跳转到 Run 详情 | Run=PREP；冻结 routeVersion | `POST /api/work-orders/:woNo/runs` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx` | - | - |

