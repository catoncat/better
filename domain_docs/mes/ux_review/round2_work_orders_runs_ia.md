# Round 2: Work Orders & Runs IA（工单/批次信息架构）

> Scope: Work Orders & Runs IA
>
> 目标：聚焦“入口/导航/信息分组/跨角色交接”，让 planner/material/operator/quality 在工单与批次相关页面中，能快速找到下一步、减少重复入口与误导文案。

---

## 1. 轮次目标

- 梳理 `/mes` 默认入口、`/mes/work-orders` 与 `/mes/runs` 的职责边界与导航链路，识别对“不同角色”的阻断点与信息缺口，并给出 IA 层面的调整建议（不做实现）。

---

## 2. 覆盖范围（Scope）

- Scope：Work Orders & Runs IA
- 覆盖角色：planner / material / operator / quality（重点看“角色进来第一眼看到什么”）
- UI 页面（路径）：  
  - `apps/web/src/routes/_authenticated/mes/index.tsx`（默认入口重定向）  
  - `apps/web/src/routes/_authenticated/mes/work-orders.tsx`  
  - `apps/web/src/routes/_authenticated/mes/-components/work-order-card.tsx`  
  - `apps/web/src/routes/_authenticated/mes/runs/index.tsx`  
  - `apps/web/src/routes/_authenticated/mes/-components/run-card.tsx`  
  - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（批次详情承担“下一步指引”）  
- 关键 API/实体：  
  - WorkOrder：`GET /api/work-orders`，`POST /api/work-orders/:woNo/release`，`POST /api/work-orders/:woNo/runs`  
  - Run：`GET /api/runs`，`GET /api/runs/:runNo`，`POST /api/runs/:runNo/authorize`

---

## 3. 输入证据（按裁决顺序）

1. Spec：  
   - `domain_docs/mes/spec/process/01_end_to_end_flows.md`  
   - `domain_docs/mes/spec/process/02_state_machines.md`
2. API：  
   - `domain_docs/mes/tech/api/01_api_overview.md`
3. Permission：  
   - `domain_docs/mes/permission_audit.md`
4. UI：  
   - `apps/web/src/routes/_authenticated/mes/index.tsx`  
   - `apps/web/src/routes/_authenticated/mes/work-orders.tsx`  
   - `apps/web/src/routes/_authenticated/mes/runs/index.tsx`  
   - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 进入 MES（默认入口） | 角色不一定具备 `wo:read`（material/operator 典型不具备） | 访问 `/mes` | 强制重定向到 `/mes/work-orders`；无权限则显示 NoAccessCard | - | - | `apps/web/src/routes/_authenticated/mes/index.tsx` → `apps/web/src/routes/_authenticated/mes/work-orders.tsx` | 业务逻辑/P0：默认入口对 material/operator 直接落到无权限页面，形成“入口即阻断” | 产品/前端：按权限选择默认落点（如 exec→`/mes/execution`、material→`/mes/loading`），或提供可用模块导航页 |
| planner 查看工单并使用系统预设 | `wo:read` | `/mes/work-orders` 选择“可开工/待齐料”等预设 | 列表刷新；卡片左侧颜色/标签提示（可开工/待齐料） | - | `GET /api/work-orders` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx` + `apps/web/src/routes/_authenticated/mes/-components/work-order-card.tsx` | - | - |
| planner 在工单卡片完成“发布→创建批次”闭环（happy path） | WO=RECEIVED→RELEASED；`wo:release` + `run:create` | 工单卡片点“发布”→再点“创建批次”提交弹窗 | 成功 toast；创建后跳转到 `/mes/runs/:runNo` | WO=RELEASED；Run=PREP | `POST /api/work-orders/:woNo/release`、`POST /api/work-orders/:woNo/runs` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx`（createRun 后 navigate） | - | - |
| 在批次列表中定位某工单的所有批次 | `run:read` | 访问 `/mes/runs`，用搜索框输入 WO 号 | 列表筛出对应批次 | - | `GET /api/runs` | `apps/web/src/routes/_authenticated/mes/runs/index.tsx` | 功能规划/P1：WorkOrder 卡片缺少“一键查看该工单所有批次”的显式入口（需要用户自己想到去 runs 搜索） | 产品/前端：在工单卡片增加“查看批次（过滤）”入口或二级信息展示（已有批次数/最新批次） |
| 批次列表的“创建批次”入口 | `run:create`（但实际创建在 work-orders） | 在 `/mes/runs` 点击“创建批次” | 跳转到 `/mes/work-orders` | - | - | `apps/web/src/routes/_authenticated/mes/runs/index.tsx` | 功能规划/P2：Runs 页标题文案“创建生产批次并进行授权”，但创建不在本页完成；入口为跳转，语义不够直观 | 产品：调整文案/引导；或在 runs 页提供更直接的创建引导（不一定要实现创建） |
| runs 列表按产线过滤（异常：过滤入口受限） | 仅 `run:read`（quality/material 可具备）；`run:create` 可能没有 | 进入 `/mes/runs` 尝试按产线过滤 | 当前实现：产线过滤 UI 受 `RUN_READ && RUN_CREATE` gating（无 create 时可能无法选择产线） | - | `GET /api/runs` | `apps/web/src/routes/_authenticated/mes/runs/index.tsx`（`canViewLines`） | 业务逻辑/P1：按线体过滤属于“查看能力”，不应依赖 `run:create`；会导致质量/物料在 runs 列表信息密度下降 | 产品/前端：将线体过滤 gate 调整为 `run:read`（实现项后续 /dev） |
| 批量授权（异常：部分失败原因不可追溯） | `run:authorize`；选中多个 PREP 批次 | 选择多条 run → 点击“批量授权” | toast 仅显示成功/失败数量；失败原因丢失 | Run=AUTHORIZED（部分） | `POST /api/runs/:runNo/authorize` | `apps/web/src/routes/_authenticated/mes/runs/index.tsx`（Promise.allSettled） | UX/P1：批量操作缺少“失败原因列表 + 可重试/导出”，现场会反复问“为什么失败” | 产品/前端：在 toast 之外提供可展开的失败明细（runNo + error code/message） |
| 无权限访问工单/批次页面（异常路径） | 缺少 `wo:read` 或 `run:read` | 直接访问 `/mes/work-orders` 或 `/mes/runs` | 显示 NoAccessCard（固定文案） | - | - | `apps/web/src/routes/_authenticated/mes/work-orders.tsx`、`apps/web/src/routes/_authenticated/mes/runs/index.tsx` | UX/P2：NoAccessCard 文案缺少“下一步可去哪里”（例如 operator 应去 execution） | 产品/前端：在无权限卡中增加“建议入口”（按角色/权限推断） |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）

- [ ] **P0**：`/mes` 默认重定向到 `/mes/work-orders`，对 material/operator 等无 `wo:read` 角色形成“入口即无权限”的阻断。
  - 证据：`apps/web/src/routes/_authenticated/mes/index.tsx`、`apps/web/src/routes/_authenticated/mes/work-orders.tsx`、`domain_docs/mes/permission_audit.md`
- [ ] **P1**：Runs 列表的“线体过滤”入口被 `RUN_CREATE` 绑死，导致仅具备 `run:read` 的角色（如 quality/material）无法按线体筛选。
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/index.tsx`（`canViewLines`）、`domain_docs/mes/permission_audit.md`

### 5.2 功能规划合理（信息架构/入口/边界）

- [ ] **P1**：WorkOrder 与 Run 的导航链路缺少“查看该工单全部批次”的显式入口，用户需要靠记忆去 `/mes/runs` 搜索 WO。
  - 证据：`apps/web/src/routes/_authenticated/mes/-components/work-order-card.tsx`、`apps/web/src/routes/_authenticated/mes/runs/index.tsx`
- [ ] **P2**：Runs 页“创建批次”按钮实际是跳转到 Work Orders；标题/描述会让用户误以为本页可创建。
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/index.tsx`、`apps/web/src/routes/_authenticated/mes/work-orders.tsx`

### 5.3 UX（反馈/空态/错误/效率）

- [ ] **P1**：批量授权仅提示成功/失败数量，没有“失败原因列表（runNo+错误码）”，排障成本高。
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/index.tsx`、`domain_docs/mes/tech/api/01_api_overview.md`（授权相关错误码方向）
- [ ] **P2**：NoAccessCard 仅告诉“缺权限”，但不告诉“你现在应该去哪里/找谁处理”，对一线角色不友好。
  - 证据：`apps/web/src/components/ability/no-access-card.tsx`、`domain_docs/mes/permission_audit.md`

### 5.4 UI（一致性/组件规范）

- [ ] **P2**：WorkOrder 卡片使用了“可开工/待齐料”胶囊标签与左侧高亮边框，但 Runs 卡片/列表没有对应的“下一步”视觉提示，跨页面心智不连续。
  - 证据：`apps/web/src/routes/_authenticated/mes/-components/work-order-card.tsx`、`apps/web/src/routes/_authenticated/mes/-components/run-card.tsx`

---

## 6. 建议与下一步（可执行但不实现）

- 将 `/mes` 从“固定重定向”升级为“按权限选择默认模块”，或提供 MES 首页导航（可展示各模块卡片 + 无权限解释）。  
- 明确 WorkOrders 与 Runs 的页面职责：WorkOrders=派工与创建批次；Runs=批次视角的执行准备/授权与状态管理，并补齐跨页跳转入口。  
- 批量授权补充可追溯反馈：失败原因列表/可复制错误码/重试入口（不一定要做复杂 UI，最小可先做可展开 toast）。  

