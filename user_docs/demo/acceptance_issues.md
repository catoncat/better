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
- 查看后端实现：`apps/server/src/modules/mes/oqc/trigger-service.ts` 在无抽检规则时会直接将 Run 置为 `COMPLETED`（reason=`No sampling rule applicable`），因此“无 OQC 任务”可能符合当前配置；但此前收尾弹窗无响应仍需解释（可能是后端返回 `OQC_REQUIRED`/`RUN_UNITS_NOT_TERMINAL`/其它错误但 UI 未展示）。
