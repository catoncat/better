# Round 6: Routing & Config（路由/版本/执行配置）

> Scope: Routing & Config
>
> 目标：让 engineer/planner 在「路由查看 → 配置执行语义 → 编译生成可执行版本 → 在 Run/追溯中解释使用的冻结版本」上路径清晰、门禁一致、错误可行动。

---

## 1. 轮次目标

- 梳理“路由（ERP/MES）→ 执行语义（MES 配置）→ 可执行版本（编译产物）”三者的心智模型与入口边界，明确哪些配置会影响 Run 创建/授权/执行与追溯。
- 输出本范围内的高风险门禁缺口（P0/P1）、信息架构断点，以及可执行的改进建议（不落实现）。

---

## 2. 覆盖范围（Scope）

- Scope：Routing & Config
- 覆盖角色：engineer / planner（附：integration/system 的只读排障视角）
- UI 页面（路径）：
  - `apps/web/src/routes/_authenticated/mes/routes/index.tsx`
  - `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
  - `apps/web/src/routes/_authenticated/mes/route-versions.tsx`
  -（边界证据）`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（Run 详情中的“路由版本”卡片）
- 关键 API：`/api/routes*`（Routing / ExecutableRouteVersion）

---

## 3. 输入证据（按裁决顺序）

1. Spec：
   - `domain_docs/mes/spec/routing/01_routing_engine.md`
   - `domain_docs/mes/spec/routing/03_route_execution_config.md`
   - `domain_docs/mes/spec/routing/04_route_versioning_and_change_management.md`
2. API：
   - `domain_docs/mes/tech/api/01_api_overview.md`
3. Permission：
   - `domain_docs/mes/permission_audit.md`
   - `packages/db/src/permissions/permissions.ts`
4. UI：
   - `apps/web/src/routes/_authenticated/mes/routes/index.tsx`
   - `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
   - `apps/web/src/routes/_authenticated/mes/route-versions.tsx`
   - `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
5. Backend（作为事实证据）：
   - `apps/server/src/modules/mes/routing/routes.ts`
   - `apps/server/src/modules/mes/routing/service.ts`
   - `apps/server/src/modules/mes/ingest/routes.ts`
   - `apps/server/src/modules/mes/ingest/service.ts`
6. Error 文案对齐（作为 UX 事实证据）：
   - `packages/shared/src/error-codes.ts`

---

## 4. 交互矩阵（核心产出）

| 用户意图/场景 | 前置条件（状态/权限/数据） | 用户动作 | 系统反馈（UI） | 状态/数据变化 | API（路径/字段/约束） | UI 位置（页面/组件） | 发现问题（分类+Severity） | 建议/责任归属 |
|---|---|---|---|---|---|---|---|---|
| 路由列表：搜索/筛选来源/进入详情 | 已登录；`route:read` | 打开 `/mes/routes`；用搜索框/“ERP来源”“MES来源”预设；点击“查看详情” | 列表加载/错误态明确；无权限显示 NoAccessCard | - | `GET /api/routes`（page/pageSize/search/sourceSystem） | `apps/web/src/routes/_authenticated/mes/routes/index.tsx` | 功能规划/P2：列表缺少“最新可执行版本状态/最近编译时间”摘要，工程师很难在列表层判断哪些路由“可用/不可用” | 产品/后端：在 `GET /api/routes` 增加 latestExecutableVersionStatus/compiledAt（或单独接口）；前端：增加列/徽标与快捷入口 |
| 路由详情：查看路由与步骤（ERP 只读提示） | `route:read`；routingCode 存在 | 进入 `/mes/routes/$routingCode` | 展示路由基本信息；若 ERP 来源提示“步骤顺序只读；可配置执行语义”；步骤表格支持空态 | - | `GET /api/routes/:routingCode` | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（路由信息/步骤列表） | - | - |
| 路由详情：执行语义状态徽标（READY/缺失 N） | `route:read`；已加载 steps + execution-config | 查看顶部徽标与 tooltip；缺失时使用“快速为缺失步骤配置站点组” | 显示“执行语义 READY/缺失 N”；缺失时提示“编译会得到 INVALID”；批量配置需要 `route:configure` | 执行配置可能新增/更新 | `GET /api/routes/:routingCode/execution-config`、`POST /api/routes/:routingCode/execution-config` | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（徽标 + 缺失提示卡片 + 批量配置） | 业务逻辑/P1：当前 READY 判断仅覆盖“站点约束缺失”，未覆盖 AUTO/BATCH/TEST 的 ingestMapping、dataSpecIds 绑定有效性等编译必要条件，易出现“徽标 READY 但编译仍 INVALID” | 前端/产品：扩展就绪检查维度或改名为“站点约束就绪”；tooltip 明确“仍可能因映射/采集项等失败” |
| 修改路由工艺类型（processType） | `route:configure` | 选择“工艺类型”并保存 | toast “路由工艺已更新”；页面不提示影响范围 | 路由 processType 变化；影响后续 Run 创建的“产线工艺匹配”校验 | `PATCH /api/routes/:routingCode` | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（路由信息卡片） | UX/P2：缺少“改工艺类型会影响哪些流程/错误码”的轻量提示（例如创建批次时报 `LINE_ROUTING_PROCESS_MISMATCH`） | 产品/前端：在字段旁补充说明（影响 Run 创建/Readiness 配置）；必要时二次确认 |
| 新增/编辑执行配置（ROUTE 默认/STEP 覆盖） | `route:configure`；routing 有 steps | 点“新增配置/编辑”→选择范围→填写站点类型/站点组/允许站点/采集项等→提交 | 成功 toast；列表更新；scopeLabel 以“全局默认/Step N”展示 | 新增/更新 RouteExecutionConfig；影响编译产物与执行约束 | `POST /api/routes/:routingCode/execution-config`、`PATCH /api/routes/:routingCode/execution-config/:configId` | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（ExecutionConfigDialog） | UX/P2：表单未强制“站点组/允许站点至少一项”，允许保存“必 INVALID”的配置，反馈滞后到编译阶段 | 前端：在 Dialog 级做校验并提示；产品：若允许“草稿”，需在列表与徽标上显式标注“未就绪/草稿” |
| 配置“允许站点”（Allowed stations） | 需要可用 station 列表；当前 `GET /api/stations` 权限为 exec:*（engineer 默认可能无） | 在执行配置对话框勾选工位 | stations 拉取失败/无权限时，当前 UI 仅展示“暂无工位数据”，无法区分“真空态 vs 权限缺失/加载失败” | - | `GET /api/stations`（权限：`exec:read/track_in/track_out`） | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（allowedStationIds 列表） | 功能规划/P1：路由配置依赖 stations 列表，但 engineer 角色默认不具备 exec 权限；UI 不提示缺权限，容易误判为“系统无数据” | 产品/后端：允许 `route:configure` 读取 stations（只读）；或明确“路由配置只用站点组”；前端：区分 error/403 与空态并给出行动建议 |
| 采集项绑定（dataSpecIds） | UI 当前要求 `data_spec:read` + `data_spec:config`；步骤已选用于过滤 | 在执行配置对话框选择“采集项” | 无权限时显示“无权限查看采集项”；有权限时可按工序筛选/搜索并多选 | - | `GET /api/data-collection-specs`（按 operationCode/isActive 过滤） | `apps/web/src/routes/_authenticated/mes/-components/data-spec-selector.tsx` | 功能规划/P1：engineer 在 `permission_audit.md` 中仅有 `data_spec:config`，但 UI 需要 read+config 才能绑定采集项，导致“具备配置职责但无法完成绑定” | 产品/权限：对齐“config 是否隐含 read”；前端：将 enabled 条件调整为 `data_spec:read || data_spec:config`（或拆分只读展示 + 配置编辑权限） |
| 编译路由生成可执行版本 | `route:compile`；路由存在 | 在详情页点击“编译路由” | toast（READY/INVALID）；缺失约束时先 warning；但页面缺少“最新版本状态/历史”常驻区域 | 生成/复用 ExecutableRouteVersion；可能触发 PREP runs 的 precheck（best-effort） | `POST /api/routes/:routingCode/compile` | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx` + `apps/web/src/hooks/use-route-versions.ts` | UX/P1：编译结果只在 toast 中短暂呈现，缺少“查看版本/查看错误”的直达链路；且徽标与编译状态语义不同，心智易混淆 | 前端：在详情页加入“版本状态卡片”（最新版本 + 链接到版本页）；产品：明确“站点约束就绪≠编译 READY” |
| 查看版本列表（READY/INVALID 与错误摘要） | `route:read`；已选择 routingCode | 打开 `/mes/route-versions` 选择路由编码 | 表格展示版本号、状态、编译时间与错误摘要；提供“编译路由”按钮 | - | `GET /api/routes/:routingCode/versions`、`POST /api/routes/:routingCode/compile` | `apps/web/src/routes/_authenticated/mes/route-versions.tsx` | 功能规划/P1：缺少“版本详情页”查看 `snapshotJson`（已有 `GET /api/routes/:routingCode/versions/:versionNo` 但无 UI） | 产品/前端：补 version detail 页面（展示 snapshot、errors、复制）；并提供从路由详情/Run 详情一键跳转到对应版本 |
| 执行侧边界：Run 详情解释“冻结版本” | `run:read`；Run 已绑定 routeVersion | 在 `/mes/runs/$runNo` 查看“路由版本”卡片；尝试跳转定位配置/版本 | 当前仅能点击路由编码进入路由详情（需 `route:read`）；版本号/状态不可点击 | - | `GET /api/runs/:runNo`（返回 routeVersion 片段） | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`（路由版本卡片） | 功能规划/P1：Run 侧缺少“直达该版本”的入口，排障需要在版本页再次选择 routingCode 并人工对照版本号 | 前端：在卡片增加“查看版本详情/版本列表”链接（带 routingCode + versionNo）；产品：把“冻结版本”作为可追溯对象对外呈现 |
| **高风险**：AUTO/TEST ingest 授权门禁一致性 | 路由 step 为 AUTO/TEST；ingestMapping 存在；Run 可能仍为 PREP；集成侧有 `system:integration` | 集成侧持续上报 AUTO/TEST 事件 | 当前实现：AUTO/TEST ingest 不校验 `run.status ∈ {AUTHORIZED, IN_PROGRESS}`，也不检查 step.requiresAuthorization；会直接写入 Track 并推进 Unit（仅 BATCH 强制 RUN_NOT_AUTHORIZED） | 可能绕过“授权后才能执行”的主线门禁；导致 PREP 阶段也可推进生产/污染追溯 | `POST /api/ingest/events`（system:integration） | `apps/server/src/modules/mes/ingest/service.ts` | **业务逻辑/P0**：授权门禁在 MANUAL 与 BATCH 生效，但 AUTO/TEST 缺失，且 UI 暴露“需要授权”配置项，存在“以为生效但实际不生效”的误导与风险 | 后端/产品：为 AUTO/TEST 补齐 RunStatus 门禁（或按 requiresAuthorization 控制）；前端：将“需要授权”标注为“预留/未生效”或隐藏；文档：对齐 spec 与实现 |

---

## 5. 问题清单（按优先级排序）

### 5.1 业务逻辑通顺（P0/P1）

- [ ] **P0**：AUTO/TEST ingest 未强制 Run 授权（Run=PREP 也可写入 Track/推进 Unit）；执行配置项 `requiresAuthorization` 当前未生效，存在绕过门禁与误导风险。
  - 证据：`apps/server/src/modules/mes/ingest/service.ts`（非 BATCH 分支未做 RunStatus 门禁）；`domain_docs/mes/spec/routing/03_route_execution_config.md`（requiresAuthorization 预留）；`domain_docs/mes/spec/routing/01_routing_engine.md`（门禁预期）。
  - 建议：后端补齐 AUTO/TEST 的 run 状态门禁（至少与 BATCH 对齐）；或按 step.requiresAuthorization 决定是否要求授权；前端在配置项上明确“是否生效”。
- [ ] **P1**：路由详情页“执行语义 READY”仅检查站点约束缺失，未覆盖 ingestMapping、采集项绑定有效性等编译必要条件，容易造成误判（徽标 READY 但编译 INVALID）。
  - 证据：`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（executionSemanticsStatus 仅统计 stationGroup/allowedStations）；`apps/server/src/modules/mes/routing/service.ts`（编译校验 ingestMapping/dataSpec）。
- [ ] **P1**：允许站点（allowedStationIds）缺少“站点类型一致性/存在性”校验；编译阶段仅校验“非空”，运行时才暴露 `STATION_MISMATCH`，配置风险后置。
  - 证据：`apps/server/src/modules/mes/routing/service.ts`（仅检查 station constraint presence）；`apps/server/src/modules/mes/execution/service.ts`（运行时校验 stationType/group/allowedStationIds）。

### 5.2 功能规划合理（信息架构/入口/边界）

- [ ] **P1**：缺少“可执行版本详情”UI：已有 `GET /api/routes/:routingCode/versions/:versionNo`，但前端没有页面可查看 `snapshotJson` / errors / 与 Run 冻结版本的对照。
  - 证据：`domain_docs/mes/tech/api/01_api_overview.md`（versions endpoints）；`apps/web/src/routes/_authenticated/mes/route-versions.tsx`（仅列表，无详情）。
- [ ] **P2**：路由详情与版本页之间缺少带参导航（routingCode 预填），导致“编译→看结果/错误”需要多次跳转与手动选择。
  - 证据：`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（无跳转）；`apps/web/src/routes/_authenticated/mes/route-versions.tsx`（需手动选择路由）。
- [ ] **P2**：`route:create` 权限已定义但未发现创建入口；若当前以 ERP 同步为唯一来源，需要在路由页面/文档明确“创建路由不在 MES 内完成”，避免误解。
  - 证据：`packages/db/src/permissions/permissions.ts`（Permission.ROUTE_CREATE）；前端未发现 `POST /api/routes` 调用。

### 5.3 UX（反馈/空态/错误/效率）

- [ ] **P1**：路由配置页“允许站点”拉取依赖 exec 权限，但缺权限时 UI 显示“暂无工位数据”，无法区分“没数据 vs 没权限/加载失败”，导致排障成本高。
  - 证据：`apps/web/src/hooks/use-station-execution.ts`（useStations 错误未在 UI 层显式呈现）；`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（stations 为空直接显示空态文案）。
- [ ] **P1**：采集项绑定的权限判定使用 `DATA_SPEC_READ && DATA_SPEC_CONFIG`，与 engineer 角色权限矩阵（仅 config）不一致，导致实际无法完成绑定。
  - 证据：`domain_docs/mes/permission_audit.md`；`apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`（canViewDataSpecs）；`apps/web/src/routes/_authenticated/mes/-components/data-spec-selector.tsx`。
- [ ] **P2**：ExecutionConfigDialog 的“站点约束必填”反馈滞后；建议在表单层面提示并阻止提交（或引入草稿态）。
- [ ] **P2**：编译失败信息分散（toast + 版本表格），缺少“复制/展开/按步骤分组”的可操作呈现，排错效率不高。

### 5.4 UI（一致性/组件规范）

- [ ] 本轮未发现需要单独立项的 UI 一致性问题（优先级低于门禁与入口闭环）。

---

## 6. 建议与下一步（可执行但不实现）

- **优先修复门禁一致性（P0）**：补齐 AUTO/TEST ingest 的授权门禁（与 MANUAL/BATCH 对齐），并对 `requiresAuthorization` 的语义进行“实现/隐藏/标注预留”的决策收敛。
- **补齐排障与追溯链路（P1）**：增加“可执行版本详情”页面（snapshot + errors + copy），并从路由详情/Run 详情提供直达链接（带 routingCode + versionNo）。
- **提升配置完成度提示（P1/P2）**：把“站点约束就绪”与“编译 READY”拆开呈现；补齐 ingestMapping/dataSpec 等缺口提示；在表单内做强校验或引入草稿态。
- **对齐权限与配置职责（P1）**：明确 engineer 在路由配置时是否需要读 stations / data specs；若需要，调整权限或 API；若不需要，UI 应隐藏/降级相关能力并给出替代路径。

