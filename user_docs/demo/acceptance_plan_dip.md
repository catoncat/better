# MES 系统 AI 浏览器验收计划（DIP 专用）

> 创建时间: 2026-01-14
> 状态: 已完成（脚本验收）

## 目标

使用 `agent-browser` skill 按照 `user_docs/demo/guide.md` 的 DIP 演示章节（`4.1~4.7`）自动化验收 MES 的 DIP UI 流程，并记录发现的问题。

## 执行记录（小步同步）

> 约定：每完成/尝试一小步操作，就在此追加一条记录（即使没发现问题也要写）。

### 当前进度（快速概览）

- [x] 环境检查 - 确认服务可用
- [x] 阶段 1: DIP 工单与批次创建
- [x] 阶段 2: Readiness（产前检查）
- [x] 阶段 3: FAI（可选）+ 授权前试产
- [x] 阶段 4: Run 授权
- [x] 阶段 5: DIP 执行过站
- [x] 阶段 6: 收尾与 OQC/MRB
- [x] 阶段 7: 工单收尾 + 追溯验证
- [x] 输出验收报告

### 日志

- 2026-01-27: `bun scripts/mes-acceptance.ts --track dip --scenario happy --json` 执行通过；Run=RUN-WO-acceptance-dip-happy-1769493460623，WO=WO-acceptance-dip-happy，SN=SN-RUN-WO-acceptance-dip-happy-1769493460623-0001。

---

## 数据策略

| 数据类型 | 来源 | 说明 |
|----------|------|------|
| 用户/权限 | `db:seed` | 6 种角色用户已预置 |
| 产线/工位 | `db:seed` | `LINE-DIP-A`（DIP） |
| 路由 | `db:seed` | `PCBA-DIP-V1`（DIP，默认 4 工序） |
| **工单** | **新建** | 推荐通过 UI “接收外部工单”新建（覆盖 RECEIVED→RELEASED） |
| **批次** | **新建** | 通过 UI 创建 Run（覆盖 Run=PREP） |
| **单件** | **新建** | TrackIn 时自动创建或手动生成 |
| **FAI/OQC** | **新建** | 通过 UI 创建和完成检验 |

> **关键点**：DIP 验收应包含新建操作（接收外部工单/下发/创建 Run/执行/追溯），而非只验证已有数据。

---

## 前置准备

### 1. 环境准备

```bash
# 重置数据库并创建基础数据
bun run db:seed

# （可选）添加演示数据以展示多状态场景
bun apps/server/scripts/seed-demo.ts

# 启动开发服务器
bun run dev
```

### 2. 验证服务可用

- 访问 http://localhost:3001 确认前端可访问
- 访问 http://localhost:3000/api/health 确认后端健康

---

## 验收流程（按演示指南 DIP 4.1-4.7）

### 阶段 1：DIP 工单与批次创建（4.1）
**页面**: `/mes/work-orders`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 1.1 | 登录 planner@example.com (Test123!) | 成功进入系统 | [ ] |
| 1.2 | 点击「接收外部工单」创建 DIP 工单（routingCode=`PCBA-DIP-V1`，plannedQty≥1） | 工单创建成功，状态为 RECEIVED | [ ] |
| 1.3 | 在工单列表找到该工单，点击「下发」选择 `LINE-DIP-A` | 工单状态变为 RELEASED | [ ] |
| 1.4 | 点击「创建批次」 | **新建 Run**，跳转到 Run 详情页（Run=PREP） | [ ] |
| 1.5 | 在 Run 详情页点击「生成单件」数量=1（或等于计划数量） | Run 单件数 > 0（后续 FAI/执行会用到） | [ ] |

### 阶段 2：Readiness（产前检查）（4.2）
**页面**: `/mes/runs/{runNo}`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 2.1 | 在 Readiness 卡片点击「正式检查」 | 显示检查结果 | [ ] |
| 2.2 | 若失败，按需走「豁免」或 `/mes/integration/manual-entry` 手动录入/绑定 | 可将失败项变为 WAIVED 或恢复为 PASSED | [ ] |
| 2.3 | 确认 Readiness 状态为 PASSED | 绿色通过标识 | [ ] |

### 阶段 3：FAI（可选）+ 授权前试产（4.3）
**页面**: `/mes/runs/{runNo}` + `/mes/fai` + `/mes/execution`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 3.1 | 若 Run 详情页提示需要 FAI：点击「创建 FAI」，并在 `/mes/fai` 点击「开始」 | FAI 状态变为 INSPECTING | [ ] |
| 3.2 | 在 `/mes/execution` 选择 DIP 首工位 `ST-DIP-INS-01` 完成一次 TrackIn/TrackOut(PASS) | 试产过站成功 | [ ] |
| 3.3 | 回到 `/mes/fai` 记录检验项并「完成」为 PASS | FAI 状态变为 PASS | [ ] |

> 注意：
> - FAI 开始前需要先生成单件（阶段 1.5）。若当前账号无权限生成单件，请切回 `planner@example.com` 操作。
> - 授权前试产只允许首工序；Run=PREP 时操作非首工位可能返回 `FAI_TRIAL_STEP_NOT_ALLOWED`。

### 阶段 4：Run 授权（4.4）
**页面**: `/mes/runs/{runNo}`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 4.1 | 点击「授权生产」 | Run 状态变为 AUTHORIZED | [ ] |

### 阶段 5：DIP 执行过站（4.5）
**页面**: `/mes/execution`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 5.1 | 依次完成 `ST-DIP-INS-01` → `ST-DIP-WAVE-01` → `ST-DIP-POST-01` → `ST-DIP-TEST-01` 的 TrackIn/TrackOut(PASS) | Unit 最终变为 DONE | [ ] |
| 5.2 | （可选）在某一步 TrackOut 选择 FAIL，观察缺陷/处置入口是否可定位 | FAIL 分支可追溯/可处置（如已实现） | [ ] |

### 阶段 6：收尾与 OQC/MRB（4.6）
**页面**: `/mes/runs/{runNo}` + `/mes/oqc`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 6.1 | Run 详情页点击「收尾」 | 提示需要 OQC 或直接完成 | [ ] |
| 6.2 | 若需要 OQC：进入 `/mes/oqc` 完成任务（PASS/FAIL） | OQC 状态更新；若 FAIL 则 Run=ON_HOLD | [ ] |
| 6.3 | 若 Run=ON_HOLD：Run 详情页执行「MRB 决策」放行/返修/报废 | Run 进入 COMPLETED / CLOSED_REWORK / SCRAPPED | [ ] |

### 阶段 7：工单收尾 + 追溯验证（4.7）
**页面**: `/mes/work-orders` + `/mes/trace`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 7.1 | 回到 `/mes/work-orders` 对该工单执行「收尾」 | WO 进入 COMPLETED（或符合当前实现的终态） | [ ] |
| 7.2 | 在 `/mes/trace` 输入刚生产的 SN | 显示追溯信息 | [ ] |
| 7.3 | 检查路由版本快照、过站记录、FAI/OQC（如有） | 信息完整且可定位 | [ ] |

---

## 验收账号

| 阶段 | 推荐账号 | 密码 |
|------|----------|------|
| 工单接收/下发 | planner@example.com | Test123! |
| Readiness/执行 | quality@example.com / operator@example.com | Test123! |
| FAI/OQC/MRB | quality@example.com | Test123! |
| 追溯 | trace@example.com | Test123! |

---

## 验证成功标准

- [ ] DIP 全流程闭环完成（工单→批次→过站→收尾→追溯）
- [ ] 关键页面可正常访问和操作（work orders / runs / execution / oqc / trace）
- [ ] 状态转换符合预期（Run 授权、Unit DONE、Run 终态、WO 收尾）
- [ ] 追溯信息完整准确（routeVersion snapshot + tracks + 质量记录）
- [ ] 无阻断性 Bug（或已在问题记录中登记）

---

## 文件引用

- 演示指南: `user_docs/demo/guide.md`
- 问题记录: `user_docs/demo/acceptance_issues.md`
