 # MES 前端业务可用性审查报告 (AI Agent 版)
 
 ## 1. 数据/环境依赖检查结果
 
 | 依赖项 | 状态 | 备注 |
 |-------|------|------|
 | 种子数据 | ❓ | 无法直接检查数据库内容，但 `packages/db` 结构完整 |
 | 角色权限 | ✅ | `packages/db/src/permissions/preset-roles.ts` 包含所有 5 个核心角色定义 |
 | 路由注册 | ✅ | `apps/web/src/routes/_authenticated/mes/` 目录结构覆盖所有模块 |
 | 导航入口 | ✅ | `apps/web/src/config/navigation.ts` 包含 MES 所有子模块入口 |
 | API实现 | ✅ | `apps/server/src/modules/mes` 包含对应后端模块 |
 
 ---
 
 ## 2. 角色场景审查结果
 
 ### 2.1 生产计划员 (planner)
 
 | 场景 | 结果 | 问题 | 代码位置 | 严重性 |
 |-----|------|------|---------|--------|
 | P1: 接收新工单 | ✅ | - | `work-orders.tsx` | - |
 | P2: 发布工单 | ✅ | 支持发布操作 | `work-order-release-dialog.tsx` | - |
 | P3: 创建批次 | ✅ | 行操作包含创建批次 | `run-create-dialog.tsx` | - |
 | P4: 工单状态维护 | ✅ | 支持取消和齐料状态修改 | `work-order-columns.tsx` | - |
 
 ### 2.2 产线组长 (leader)
 
 | 场景 | 结果 | 问题 | 代码位置 | 严重性 |
 |-----|------|------|---------|--------|
 | L1: 查看待授权批次 | ✅ | 支持状态筛选(PREP)和产线筛选 | `runs/index.tsx` | - |
 | L2: 授权批次 | ✅ | 支持单条和批量授权 | `runs/index.tsx` | - |
 | L3: 查看批次进度 | ✅ | 详情页包含统计卡片 | `runs/$runNo.tsx` | - |
 | L4: 撤销授权 | ✅ | 列操作包含撤销 | `run-columns.tsx` | - |
 | L5: 定位问题批次 | ✅ | 独立异常看板页 | `readiness-exceptions.tsx` | - |
 
 ### 2.3 操作员 (operator)
 
 | 场景 | 结果 | 问题 | 代码位置 | 严重性 |
 |-----|------|------|---------|--------|
 | O1: 选择工位 | ✅ | 支持选择并本地持久化 | `execution.tsx` | - |
 | O2: 进站 (TrackIn) | ✅ | 支持扫码解析 (SN/WO/RUN) | `execution.tsx:106` | - |
 | O3: 出站 (TrackOut) | ⚠️ | 队列"一键出站"仅支持 PASS，FAIL 需切换 Tab 手动录入 | `execution.tsx:198` | 🟡 |
 
 ### 2.4 工艺工程师 (engineer)
 
 | 场景 | 结果 | 问题 | 代码位置 | 严重性 |
 |-----|------|------|---------|--------|
 | E1: 查看/配置路由 | ✅ | 详情页支持配置站点/采集项 | `routes/$routingCode.tsx` | - |
 | E2: 编译路由版本 | ✅ | 支持手动触发编译 | `route-versions.tsx` | - |
 | E3: 触发ERP同步 | ❓ | 前端未发现手动触发同步入口 | - | 🟡 |
 | E4: 查看版本历史 | ✅ | 支持版本列表和错误展示 | `route-versions.tsx` | - |
 
 ### 2.5 质量工程师 (quality)
 
 | 场景 | 结果 | 问题 | 代码位置 | 严重性 |
 |-----|------|------|---------|--------|
 | Q1: 查看准备异常 | ✅ | 异常看板功能完整 | `readiness-exceptions.tsx` | - |
 | Q2: 豁免检查项 | ✅ | 详情页支持豁免操作 | `runs/$runNo.tsx` | - |
 | Q3: 追溯查询 | ✅ | 支持 SN 查询和完整链路展示 | `trace.tsx` | - |
 
 ---
 
 ## 3. 问题汇总
 
 #### 🟡 效率问题
 
 | # | 角色 | 场景 | 问题 | 代码位置 | 建议方案 |
 |---|-----|------|-----|---------|---------|
 | 1 | operator | O3 | 不良品出站操作繁琐 | `execution.tsx` | 在队列行操作中增加"报不良"快捷按钮，点击弹出简易 Dialog 选原因 |
 | 2 | engineer | E3 | 缺少 ERP 同步手动触发入口 | `integrations` | 在集成管理或路由列表页增加"同步路由"按钮 |
 
 ---
 
 ## 4. 跨角色协作检查
 
 | # | 检查点 | 结果 | 验证备注 |
 |---|-------|------|---------|
 | X1 | 计划员创建批次后组长可见 | ✅ | `useCreateRun` 成功后 invalidates `['mes', 'runs']` |
 | X2 | 准备检查状态可见性 | ✅ | `runColumns` 中包含 `readinessStatus` Badge |
 | X3 | 状态流转连续性 | ✅ | WO Release -> Run Create -> Run Authorize 链路完整 |
 | X4 | 列表自动刷新 | ✅ | 核心 Mutation 均配置了 query invalidation |
 
 ---
 
 ## 5. 需真实环境验证项
 
 | 场景 | 验证点 | 原因 |
 |-----|-------|------|
 | O2 | 扫码枪兼容性 | `execution.tsx` 使用了 regex 解析，需验证实际扫码枪的回车/输入事件序列是否符合预期 |
 | - | 打印机集成 | 代码中暂未发现打印相关实现 (Label Printing)，需确认是否为 Scope 外 |
 
 ## 6. 下一步建议
 
 1. **[P1] 优化操作员不良品录入体验**
    - 在执行页面的队列列表中，为每行增加"不合格"按钮，避免切换 Tab 手动输入 SN。
 
 2. **[P2] 增加手动同步 ERP 路由入口**
    - 方便工程师在 ERP 变更后立即在 MES 获取最新路由。
 
 3. **[P2] 完善打印功能**
    - 当前未发现流转卡/标签打印功能，建议在"发布工单"和"创建批次"后增加打印入口。

## 7. 修复计划 (Action Plan)

- [x] **[P1] 优化操作员不良品录入体验 (Fix O3)**
    - 目标: 在工位执行页面的队列列表中，增加"报不良"快捷操作。
    - 文件: `apps/web/src/routes/_authenticated/mes/execution.tsx`
    - 方案: 增加报不良确认对话框，并在列表行增加"报不良"按钮。

- [x] **[P2] 增加手动同步 ERP 路由入口 (Fix E3)**
    - 目标: 允许工程师手动触发 ERP 路由同步。
    - 文件: `packages/db/src/permissions/preset-roles.ts`
    - 方案: 为 engineer 角色增加 `SYSTEM_INTEGRATION` 权限，以访问集成同步入口。

