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
| 3 | 4.3 | Major | 试产 TrackIn 扫入新 SN 报 `UNIT_NOT_FOUND`，与演示指南“自动创建 Unit”不一致 | Open |
| 4 | 7.1 | Major | Run 收尾确认后无响应 / 未创建 OQC 任务 | Open |

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

## 问题 #2: 「接收外部工单」弹窗疑似无法滚动到底部，导致「接收工单」按钮无法点击/提交
- **阶段**: 1.3（用于覆盖“新建工单”路径）
- **页面**: `/mes/work-orders` → 「接收工单」弹窗
- **严重程度**: Major（阻断通过 UI 新建工单 → 下发 → 创建 Run 的验收路径）
- **描述**:
  - 通过「接收工单」打开「接收外部工单」弹窗后，表单底部提交按钮在可视区域外。
  - 使用 `agent-browser` 尝试 `click` / `find role button click --name 接收工单` 多次失败，Playwright 日志提示 element outside viewport；多次 scroll/End 无法把按钮滚到可视区域。
  - 最终关闭弹窗并回到列表搜索该工单号显示「暂无数据」，说明提交未成功。
  - **待确认**：这是否为 UI 实际不可滚动/不可提交的问题，还是仅 `agent-browser` 的滚动/点击限制。
- **截图**:
  - `user_docs/demo/screenshots/phase1_receive_work_order_modal.png`
  - `user_docs/demo/screenshots/phase1_receive_work_order_modal_after_end.png`
  - `user_docs/demo/screenshots/phase1_receive_work_order_modal_submit_visible.png`
- **复现步骤**:
  1. 登录 `planner@example.com`
  2. 打开 `/mes/work-orders` 点击「接收工单」
  3. 填写工单号/产品/数量/路由/物料状态/到期日期
  4. 尝试滚动到底部点击「接收工单」提交
  5. 观察：无法把提交按钮滚到可视区域并点击成功（或点击无效），关闭后工单未创建
- **状态**: Open

## 问题 #3: 试产 TrackIn 扫入新 SN 报 `UNIT_NOT_FOUND`，与演示指南“自动创建 Unit”不一致
- **阶段**: 4.3（FAI 试产过站）
- **页面**: `/mes/execution?runNo=...`
- **严重程度**: Major（阻断按指南“首次扫入新 SN 自动创建 Unit”的主路径）
- **描述**:
  - 按 `user_docs/demo/guide.md` 的说明，首次 TrackIn 扫入一个不存在的 SN 时应自动在该 Run 下创建 Unit。
  - 实际在 `ST-PRINT-01` 执行 TrackIn 时返回错误：`UNIT_NOT_FOUND`，提示需要先在 Run 详情页「生成单件」。
  - 通过 Run 详情页「生成单件」批量生成 SN 后，使用生成的 SN 可正常 TrackIn/TrackOut。
- **截图**: （未截图；错误从 `agent-browser errors` 读取）
- **复现步骤**:
  1. 确保 Run 处于 `PREP` 且 FAI 已开始（检验中）
  2. 进入 `/mes/execution` 选择 `ST-PRINT-01`
  3. 在 TrackIn 输入一个从未生成过的 SN（例如 `SN-RUN-WO-DEMO-SMT-001-0001`）并点击「确认进站」
  4. 观察：返回 `UNIT_NOT_FOUND`，提示需要先生成 Unit
- **状态**: Open

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
- 查看后端实现：`apps/server/src/modules/mes/oqc/trigger-service.ts` 在无抽检规则时会直接将 Run 置为 `COMPLETED`（reason=`No sampling rule applicable`），因此“无 OQC 任务”可能符合当前配置；但此前收尾弹窗无响应仍需解释（可能是后端返回 `OQC_REQUIRED`/`RUN_UNITS_NOT_TERMINAL`/其它错误但 UI 未展示）。
