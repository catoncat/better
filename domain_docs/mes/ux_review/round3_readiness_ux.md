# Round 3: Readiness UX（准备检查体验）

> Scope: Readiness UX
>
> 目标：让“准备检查（预检/正式）→ 失败项处理 → 豁免 → 再检查 → 授权”的路径对不同角色可理解、可恢复，并且不会因权限/入口缺失造成卡死或误导。

---

## 1. 轮次目标

- 基于 API 合约的 precheck/formal 语义，核对当前 UI 的触发点、结果呈现与异常/豁免路径是否一致，并列出阻断点与“下一步”引导缺口。

---

## 2. 覆盖范围（Scope）

- Scope：Readiness UX
- 覆盖角色：planner / quality / engineer（检查/豁免/配置）；material/operator（被动查看与交接）
- UI 页面（路径）：  
  - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（批次详情：准备状态 + 豁免入口 + 去处理）  
  - `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx`（准备异常看板）  
  - `apps/web/src/routes/_authenticated/mes/readiness-config.tsx`（准备检查配置）  
- 关键 API：  
  - `POST /api/runs/:runNo/readiness/precheck`（预检）  
  - `POST /api/runs/:runNo/readiness/check`（正式检查）  
  - `GET /api/runs/:runNo/readiness/latest`（latest）  
  - `POST /api/runs/:runNo/readiness/items/:itemId/waive`（豁免）  
  - `GET /api/readiness/exceptions`（异常看板）

---

## 3. 输入证据（按裁决顺序）

1. Spec：  
   - `domain_docs/mes/spec/process/01_end_to_end_flows.md`（P→POK→PEX→P 循环）  
2. API：  
   - `domain_docs/mes/tech/api/02_api_contracts_execution.md`（precheck/formal 定义与授权门禁）  
   - `domain_docs/mes/tech/api/01_api_overview.md`（Readiness 相关 endpoints 与错误码）  
3. Permission：  
   - `domain_docs/mes/permission_audit.md`（`readiness:view/check/override/config` 与页面可访问性）  
4. UI：  
   - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`  
   - `apps/web/src/hooks/use-readiness.ts`  
   - `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx`  
   - `apps/web/src/routes/_authenticated/mes/readiness-config.tsx`

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| PREP 批次首次进入详情（无检查记录） | Run=PREP；`readiness:view` | 打开 `/mes/runs/:runNo` | “准备状态”显示“暂无检查记录”，提示可执行检查；进度卡显示就绪检查“待开始/未检查” | - | `GET /api/runs/:runNo/readiness/latest`（无记录可返回 `NO_CHECK_FOUND`） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` + `apps/web/src/hooks/use-readiness.ts` | - | - |
| 系统自动触发预检（异常：非静默反馈） | Run=PREP；`readiness:check`（具备检查权限） | 进入 run detail 页面后自动触发预检 | toast “预检完成”（非显式用户动作） | 生成 PRECHECK 记录 | `POST /api/runs/:runNo/readiness/precheck` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（useEffect） + `apps/web/src/hooks/use-readiness.ts`（toast） | UX/P2：注释称“silently”，但会弹 toast；易造成“我没点为什么提示完成” | 前端：为自动预检提供 silent 模式（跳过 toast），或在 UI 明确“已自动刷新” |
| 手动点击“执行准备检查”刷新结果（happy path） | Run=PREP；`readiness:view` + `readiness:check` | 点击准备状态卡片右上角按钮 | 显示加载态；完成后刷新表格，汇总 PASS/FAIL/WAIVE | readiness latest 更新；可能 status=PASSED | `POST /api/runs/:runNo/readiness/precheck` + `GET /api/runs/:runNo/readiness/latest` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（handleRunCheck） | 业务逻辑/P1：当前 UI 只触发 precheck，但授权门禁会基于 formal（或授权时自动触发 formal）；用户容易误解“我已经正式通过” | 产品/前端：在按钮/文案上明确“预检 vs 正式检查”；必要时开放 formal 的显式入口（仅具备权限者可见） |
| 就绪失败项的“去处理”导航 | Run=PREP；readiness status=FAILED；item.status=FAILED | 点击某失败项的“配置站位表/前往上料/查看路由/设备管理…” | 跳转到对应页面；若缺权限则按钮 disabled 并提示原因 | - | -（跳转到处理页面，各自再调用 API） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（getReadinessItemAction） | UX/P1：disabledReason 多为“无权限…”，缺少交接信息（谁来处理/把 runNo/lineId/失败项带走） | 产品/前端：提供“交接包”（可复制 runNo/line/失败项/建议处理角色）并在 disabledReason 处展示 |
| 失败项豁免（异常路径：原因必填/权限限制） | Run=PREP；`readiness:override`；item.status=FAILED | 点击“豁免”→填写原因→确认 | 弹窗展示失败原因；原因必填；成功 toast “检查项已豁免” | item.status=WAIVED；summary.waived+1 | `POST /api/runs/:runNo/readiness/items/:itemId/waive`（body: `{ reason }`） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（Dialog） + `apps/web/src/hooks/use-readiness.ts` | - | - |
| 无权限查看 readiness（异常路径） | 缺少 `readiness:view` | 打开 `/mes/runs/:runNo` | readiness 卡片与模板卡片显示 NoAccessCard；进度阶段标记“无权限” | - | - | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（NoAccessCard） | UX/P2：仅提示“无权限”，缺少“为何你需要看/由谁处理/如何继续” | 产品/前端：在无权限状态增加“流程说明 + 下一步”引导（例如让用户联系 planner/quality） |
| 准备异常看板（空态/筛选/跳转） | `readiness:view` | 打开 `/mes/readiness-exceptions`；筛选日期/状态；点击 runNo | 空态提示“暂无准备异常的批次”；有数据时可跳转 run detail | - | `GET /api/readiness/exceptions` | `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx` | 功能规划/P2：状态筛选仅支持 PREP/ALL，缺少对“已授权但仍有异常/历史异常”的视角（是否需要由产品定义） | 产品：明确异常看板的目标用户与闭环（只看 PREP 还是全生命周期） |
| 准备检查配置（异常路径：线体选择门禁） | `readiness:view`；配置需 `readiness:config`；线体选择被 `RUN_READ && RUN_CREATE` gating | 打开 `/mes/readiness-config` | 若无 canViewLines 显示 NoAccessCard（提示需要批次权限）；无法选择产线 | - | `GET /api/lines/:lineId/readiness-config`、`PUT /api/lines/:lineId/readiness-config` | `apps/web/src/routes/_authenticated/mes/readiness-config.tsx` | 业务逻辑/P1：Readiness 配置页的“选择产线”门禁依赖 run:create，可能阻断 engineer/配置角色的正常入口 | 产品/前端：将线体列表 gate 调整到更合理的权限（如 line/config 或 readiness:config） |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）

- [ ] **P1**：预检/正式检查语义在 UI 中不够清晰：UI 默认触发 precheck，但授权门禁可能基于 formal（或授权时自动触发 formal），用户容易误判“已通过正式门禁”。  
  - 证据：`domain_docs/mes/tech/api/02_api_contracts_execution.md`（2.1）、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（handleRunCheck=precheck）
- [ ] **P1**：Readiness 配置/异常看板的“产线筛选/选择” gate 依赖 `RUN_CREATE`，与“查看/配置 readiness”职责不匹配，可能阻断配置角色。  
  - 证据：`apps/web/src/routes/_authenticated/mes/readiness-config.tsx`、`apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx`、`domain_docs/mes/permission_audit.md`

### 5.2 功能规划合理（信息架构/入口/边界）

- [ ] **P2**：准备异常看板的 status 维度较单一（PREP/ALL），需要产品明确是否只服务“准备阶段处置”，还是也要追踪后续阶段的异常闭环。  
  - 证据：`apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx`、`domain_docs/mes/spec/process/01_end_to_end_flows.md`

### 5.3 UX（反馈/空态/错误/效率）

- [ ] **P2**：run detail 页面自动触发预检却会 toast“预检完成”，与“静默刷新”的注释不一致，容易打扰用户。  
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（useEffect 调 precheck）、`apps/web/src/hooks/use-readiness.ts`（onSuccess toast）
- [ ] **P1**：失败项“去处理/禁用原因”缺少交接引导（谁负责/如何继续/上下文复制），对现场协作不友好。  
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（getReadinessItemAction disabledReason）、`domain_docs/mes/permission_audit.md`
- [ ] **P2**：Readiness 查询失败（非 `NO_CHECK_FOUND`）在页面缺少明确错误态（当前主要是 loading/empty/no-access），排障不直观。  
  - 证据：`apps/web/src/hooks/use-readiness.ts`（throw error）、`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（未显式处理 readiness error）

### 5.4 UI（一致性/组件规范）

- [ ] **P2**：失败原因在表格中被 truncate，且“失败项处理”入口分散在每行按钮，信息密度高但可读性一般（尤其在失败项较多时）。  
  - 证据：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（TableCell truncate + actions）

---

## 6. 建议与下一步（可执行但不实现）

- 明确并显式化 readiness 的两种检查：在 UI 文案/按钮上标注“预检（提示）/正式检查（门禁）”，并让授权前的“门禁来源”可解释（即使 formal 由授权触发，也要让用户知道）。  
- 为 readiness 失败项提供跨角色协作信息：在禁用按钮/无权限状态下，输出“应由谁处理 + 可复制交接信息（runNo/line/失败项）”。  
- Readiness 异常看板与配置页的产线筛选 gate 需要与权限模型对齐（看板=查看，配置=readiness:config/line config），避免非预期阻断。  

