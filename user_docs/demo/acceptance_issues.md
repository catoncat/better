# MES 验收问题记录

> 创建时间: 2026-01-14
> 验收计划:
> - `user_docs/demo/acceptance_plan.md`（SMT）
> - `user_docs/demo/acceptance_plan_dip.md`（DIP）

---

## 问题汇总

| # | 阶段 | 严重程度 | 标题 | 状态 |
|---|------|----------|------|------|
| 1 | 1.1 | Minor | 登录页手动输入账号登录后页面卡住（输入框 disabled，无错误提示） | Open |
| 2 | 1.3 | Major | 「接收外部工单」弹窗疑似无法滚动到底部，导致「接收工单」按钮无法点击/提交 | Open |
| 3 | 4.3 | Minor | 指南修正：TrackIn 不自动创建 Unit（需预生成） | Fixed |
| 4 | 7.1 | Major | Run 收尾确认后无响应 / 未创建 OQC 任务 | Open |
| 5 | 1.2 | Major | 工单发布缺少产线-工艺类型校验（DIP 工单可发布到 SMT 产线） | Resolved |
| 6 | 5.3 | Major | 前端按钮显示未基于权限控制 + 403 错误提示不准确 | Partial |
| 7 | 5.1 | Minor | LOADING 检查失败时应显示"前往配置站位表"快捷按钮 | Open |
| 8 | 5.2 | Major | FAI 创建未校验就绪检查状态（预检未通过也能创建 FAI） | Fixed |

---

## 问题详情

<!--
验收过程中发现的问题记录格式：

## 问题 #N: [简短标题]
- **阶段**: [验收阶段编号，如 1.3]
- **页面**: [页面 URL]
- **严重程度**: Critical / Major / Minor
- **描述**: [问题详细描述]
- **截图**: [如果有截图，记录文件名]
- **复现步骤**:
  1. [步骤1]
  2. [步骤2]
- **状态**: Open / Fixed / Won't Fix
-->

（验收过程中发现问题时在此记录）



## 问题 #3: 指南修正：TrackIn 不自动创建 Unit（需预生成）
- **阶段**: 4.3（FAI 试产过站）
- **页面**: `/mes/execution?runNo=...`
- **严重程度**: Minor（文档说明不一致，功能行为符合预期）
- **描述**:
  - 实际行为：TrackIn 不会自动创建 Unit；使用未生成的 SN 会返回 `UNIT_NOT_FOUND`。
  - 修正：已在 `user_docs/demo/guide.md` 2.4 将说明改为“先在 Run 详情页生成单件，再 TrackIn”。
- **截图**: （未截图）
- **复现步骤**:
  1. 在 Run 详情页先点击「生成单件」生成 SN
  2. 使用该 SN 完成 TrackIn/TrackOut
  3. 若输入未生成 SN，验证会返回 `UNIT_NOT_FOUND`（符合预期）
- **状态**: Fixed

## 问题 #4: Run 收尾确认后无响应 / 未创建 OQC 任务
- **阶段**: 7.1（Run 收尾）
- **页面**: `/mes/runs/RUN-WO-DEMO-SMT-001-1768367438506` + `/mes/oqc`
- **严重程度**: Major（阻断按指南完成 Run 终态闭环）
- **描述**:
  - 在 Run 详情页点击「收尾」弹出「批次收尾确认」，点击「确认收尾」后弹窗未关闭，页面无明显状态变化/无提示。
  - 随后进入 `/mes/oqc`：
    - `leader@example.com` 显示 `Missing required permission: quality:oqc`（权限不足，可能符合角色预期）。
    - `quality@example.com` 搜索该 Run（自动映射为 `MO-SMT-001-1768367438506`）显示「暂无数据」，未看到为该 Run 创建的 OQC 任务/记录。
  - **待确认**：是否因为该 Run 仍有 `进行中=9` 的 Unit 未完成，导致后端拒绝收尾，但 UI 未给出阻断原因/提示。
- **截图**:
  - `user_docs/demo/screenshots/phase7_run_close_confirm.png`
  - `user_docs/demo/screenshots/phase7_run_close_after_confirm.png`
  - `user_docs/demo/screenshots/phase7_oqc_search_run.png`
  - `user_docs/demo/screenshots/phase7_oqc_quality_search_run.png`
  - `user_docs/demo/screenshots/phase7_run_after_all_units_done_attempt.png`
- **复现步骤**:
  1. 登录 `leader@example.com`
  2. 打开 `/mes/runs/RUN-WO-DEMO-SMT-001-1768367438506`
  3. 点击「收尾」→ 点击「确认收尾」
  4. 观察：弹窗未关闭、Run 状态无变化、无提示
  5. 登录 `quality@example.com` 打开 `/mes/oqc` 搜索该 Run/MO，观察无任务/记录
- **状态**: Open

### 补充观察（2026-01-14）
- 将该 Run 的所有 Unit 补齐到终态后（完成率 100%），Run 最终进入 `COMPLETED/已完成`，且 `/mes/oqc` 仍无任务。
- 查看后端实现：`apps/server/src/modules/mes/oqc/trigger-service.ts` 在无抽检规则时会直接将 Run 置为 `COMPLETED`（reason=`No sampling rule applicable`），因此"无 OQC 任务"可能符合当前配置；但此前收尾弹窗无响应仍需解释（可能是后端返回 `OQC_REQUIRED`/`RUN_UNITS_NOT_TERMINAL`/其它错误但 UI 未展示）。

## 问题 #5: 工单发布缺少产线-工艺类型校验
- **阶段**: 1.2（工单发布）
- **页面**: `/mes/work-orders`
- **严重程度**: Major（可能导致后续流程混乱）
- **描述**:
  - 现象：DIP 工艺的工单（如 `WO-DEMO-DIP-001`，关联路由 `PCBA-DIP-V1`）可以发布到 SMT 产线（`LINE-A`），系统无校验阻止。
  - 原因：`Line` 和 `Routing` 模型都没有 `processType` 字段，`releaseWorkOrder` 函数未校验产线与路由的工艺类型匹配。
  - 影响：
    1. 就绪检查会要求 SMT 特有项（LOADING/STENCIL/SOLDER_PASTE），DIP 工艺无法满足
    2. 上料防错的站位物料映射无法匹配
    3. 执行时工位组不匹配
- **建议修复**:
  1. 给 `Line` 和 `Routing` 添加 `processType` 字段（SMT/DIP/MIXED）
  2. 在 `releaseWorkOrder` 函数中添加校验逻辑
  3. 位置：`apps/server/src/modules/mes/work-order/service.ts:174-260`
- **修复**:
  1. `Line`/`Routing` 已新增 `processType` 字段，且可通过 UI 调整（准备检查配置 / 路由详情）。
  2. `releaseWorkOrder` 增加产线与路由工艺匹配校验，并给出配置指引。
- **复现步骤**:
  1. 登录 `planner@example.com`
  2. 打开 `/mes/work-orders`
  3. 选择 `WO-DEMO-DIP-001`（或其他 DIP 工单）
  4. 点击「发布」，选择 SMT 产线 `LINE-A`
  5. 观察：发布成功，无错误提示
- **状态**: Resolved (2026-01-20)

## 问题 #6: 前端按钮显示未基于权限控制 + 403 错误提示不准确
- **阶段**: 5.3（API 错误处理）
- **页面**: `/mes/runs/:runNo`（批次详情页）
- **严重程度**: Major（用户看到不该看到的操作，且无法理解错误原因）
- **描述**:
  - 问题1：`planner` 账号没有 `readiness:check` 权限，但批次详情页仍显示"执行预检"/"正式检查"按钮
  - 问题2：点击后后端返回 403，前端显示"预检失败 检查网络"而非"权限不足"
  - 原因：前端按钮显示未使用 `useAbility().hasPermission()` 进行权限控制
- **建议修复**:
  1. 批次详情页使用 `hasPermission(Permission.READINESS_CHECK)` 控制按钮显示
  2. 前端错误处理区分 403 状态码，显示具体权限不足信息
  3. 位置：`apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx:830-860`
  4. 基础设施已存在：`apps/web/src/hooks/use-ability.ts` 提供 `hasPermission()` 方法
- **复现步骤**:
  1. 登录 `planner@example.com`
  2. 打开批次详情页
  3. 观察：显示"执行预检"/"正式检查"按钮（不应显示）
  4. 点击按钮，观察：前端显示"预检失败 检查网络"
- **状态**: Open

## 问题 #8: FAI 创建未校验就绪检查状态
- **阶段**: 5.2（FAI 首件检验）
- **页面**: `/mes/runs/:runNo`（批次详情页）
- **严重程度**: Major（违反 SMT 流程设计，应按就绪检查 → 上料 → FAI 顺序）
- **描述**:
  - 问题：就绪检查未通过（FAILED 或无记录）时，仍可点击「创建 FAI」
  - 流程设计参考：`domain_docs/mes/spec/process/03_smt_flows.md` 第 41 行
    - `B4 --> C["创建 FAI (FAI=PENDING)"]`
    - 即：就绪检查通过 → 上料确认(B4) → 创建 FAI(C)
  - 原因：`createFai` 函数只检查 Run 状态为 PREP，未校验 readiness check 状态
- **修复**:
  1. 在 `apps/server/src/modules/mes/fai/service.ts` 的 `createFai` 函数中添加校验
  2. 调用 `getLatestCheck(db, runNo, "FORMAL")` 获取最新正式检查
  3. 检查状态必须为 `PASSED`，否则返回 `READINESS_CHECK_NOT_PASSED` 错误
- **复现步骤**:
  1. 登录 `leader@example.com`
  2. 打开一个就绪检查未通过的批次详情页
  3. 尝试点击「创建 FAI」
  4. 修复后应返回："就绪检查未通过，无法创建 FAI"
- **状态**: Fixed (2026-01-20)
