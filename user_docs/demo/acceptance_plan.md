# MES 系统 AI 浏览器验收计划

> 创建时间: 2026-01-14
> 状态: 进行中

## 目标

使用 `agent-browser` skill 按照 `user_docs/demo/guide.md` 演示指南自动化验收 MES 系统的 UI 流程，并记录发现的问题。

## 执行记录（小步同步）

> 约定：每完成/尝试一小步操作，就在此追加一条记录（即使没发现问题也要写）。

### 当前进度（快速概览）
- [x] 环境检查 - 确认服务可用
- [x] 阶段 1: 工单与批次创建
- [x] 阶段 2: 产前检查 Readiness
- [x] 阶段 3: 上料防错
- [x] 阶段 4: FAI 首件检验
- [x] 阶段 5: Run 授权
- [x] 阶段 6: 批量执行过站
- [x] 阶段 7: 收尾与 OQC
- [x] 阶段 8: 追溯验证
- [x] 输出验收报告

### 日志
- 2026-01-14 12:10: 后端 `http://localhost:3000/api/health` 返回 200；前端 `http://localhost:3001/` 返回 200。
- 2026-01-14 12:12: `agent-browser` session=`mes-accept-20260114` 打开 `http://localhost:3001`，尝试手动输入账号 `planner@example.com` / `Test123!` 登录后停留在 `/login?...` 且输入框变为 disabled（未见报错）。刷新后恢复正常；改用「选择测试账号」→ planner 登录成功并跳转到 `/mes/work-orders`。
- 2026-01-14 12:16: 在 `/mes/work-orders` 搜索 `WO-MGMT-SMT-QUEUE`，可见卡片信息；但状态显示为「进行中」（与阶段 1 预期的 RECEIVED 不一致，见问题记录）。
- 2026-01-14 12:17: 点击该工单的「创建批次」弹窗，看到产线预选 `LINE-A` 且不可编辑；未继续创建（先转去按计划验证“接收外部工单/下发”路径）。
- 2026-01-14 12:20: 打开「接收工单」弹窗，准备新建工单以覆盖“RECEIVED→RELEASED→创建 Run”链路（进行中）。
- 2026-01-14 12:22: 在「接收外部工单」弹窗填写工单号 `WO-ACC-SMT-20260114-122138`、产品 `P-1001`、数量 `5`、路由 `PCBA-STD-V1`、物料「全部领料」并选到期日期；尝试点击「接收工单」提交失败（`agent-browser` 多次报 element outside viewport / ref not visible），截图：`user_docs/demo/screenshots/phase1_receive_work_order_modal.png`、`user_docs/demo/screenshots/phase1_receive_work_order_modal_after_end.png`、`user_docs/demo/screenshots/phase1_receive_work_order_modal_submit_visible.png`。
- 2026-01-14 13:00: 关闭并重新打开浏览器会话后在 `/mes/work-orders` 搜索 `WO-ACC-SMT-20260114-122138` 显示「暂无数据」（说明提交未成功）；暂时跳过“接收外部工单”路径，改为直接找 RECEIVED 工单走「发布→创建批次」主路径（见问题记录）。
- 2026-01-14 13:14: 清空筛选后在 `/mes/work-orders` 选中 SMT 工单 `WO-DEMO-SMT-001`（显示「已接收」）→ 点击「发布」选择 `LINE-A` 发布成功（工单变为「已发布」）→ 点击「创建批次」创建 Run，跳转到 Run 详情：`/mes/runs/RUN-WO-DEMO-SMT-001-1768367438506`。
- 2026-01-14 13:19: 切换账号为 `leader@example.com` 打开 Run 详情页，点击 Readiness「正式检查」完成并显示「已通过」（通过 1 / 失败 0 / 豁免 0）。
- 2026-01-14 13:23: 在 `/mes/loading` 输入 Run 号 `RUN-WO-DEMO-SMT-001-1768367438506` → 点击「加载站位表」→ 扫描 `SLOT-01` + `MAT-001` 并「验证上料」后站位状态变为「已上料」；回到 Run 详情页再次「正式检查」显示通过项包含「上料 SLOT-01」。
- 2026-01-14 13:29: 切换账号为 `quality@example.com`（session=`mes-accept-20260114`）在 Run 详情页点击「创建 FAI」并创建抽样数=1 的 FAI；在 `/mes/fai` 点击「开始」后状态变为「检验中」。
- 2026-01-14 13:42: 使用 `leader@example.com`（session=`mes-accept-leader-20260114`）在 `/mes/execution` 选择首工位 `ST-PRINT-01` 做试产过站：先在 Run 详情页「生成单件」生成 SN，然后对 `SN-RUN-WO-DEMO-SMT-001-1768367438506-0001` 完成 TrackIn/TrackOut(PASS)。
- 2026-01-14 13:50: 在 `/mes/fai` 为该 Run 补充 1 条检验记录（尺寸检验=通过，关联 SN=...-0001），并点击「完成」将 FAI 置为「已通过」。
- 2026-01-14 13:54: 在 Run 详情页点击「授权生产」成功，Run 状态变为「已授权」，出现「开始执行」入口。
- 2026-01-14 14:23: 在 `/mes/execution` 依次完成 `ST-SPI-01` → `ST-MOUNT-01` → `ST-REFLOW-01` → `ST-AOI-01` 的 TrackIn/TrackOut(PASS)，产品 `SN-RUN-WO-DEMO-SMT-001-1768367438506-0001` 完成到末工序（Run 完成率显示 10%）。
- 2026-01-14 14:50: 使用 `leader@example.com` 在 Run 详情页点击「收尾」→ 弹出「批次收尾确认」→ 点击「确认收尾」后弹窗未关闭、页面无明显状态变化/无提示（疑似收尾未生效），截图：`user_docs/demo/screenshots/phase7_run_close_confirm.png`、`user_docs/demo/screenshots/phase7_run_close_after_confirm.png`。
- 2026-01-14 14:51: 尝试进入 OQC `/mes/oqc`：`leader@example.com` 显示 `Missing required permission: quality:oqc`（权限不足），截图：`user_docs/demo/screenshots/phase7_oqc_search_run.png`。
- 2026-01-14 14:52: 切换 `quality@example.com` 进入 `/mes/oqc` 搜索 Run 号（自动映射到 `MO-SMT-001-1768367438506`）显示「暂无数据」（未看到为该 Run 自动创建的 OQC 任务/记录），截图：`user_docs/demo/screenshots/phase7_oqc_quality_search_run.png`。
- 2026-01-14 15:29: 为验证“收尾是否要求所有 Unit 终态”，使用 `leader@example.com` 在 `/mes/execution` 将 `...-0002`~`...-0010` 补齐到末工序（各站 TrackIn/TrackOut 均 PASS）；回到 Run 详情页显示状态「已完成」、完成率 100%、结束时间已写入，截图：`user_docs/demo/screenshots/phase7_run_after_all_units_done_attempt.png`。
- 2026-01-14 15:40: 完工后再次以 `quality@example.com` 访问 `/mes/oqc` 并搜索该 Run 号，仍显示「暂无数据」（未生成 OQC 任务）；同时 `/mes/oqc/rules` 显示「暂无规则」，推断当前系统配置为“无抽检规则→不需要 OQC→Run 直接完成”。
- 2026-01-14 15:58: 进入 `/mes/trace?sn=SN-RUN-WO-DEMO-SMT-001-1768367438506-0001`，可看到路由版本快照（PCBA-STD-V1 v1）与 5 道工序过站记录（PRINTING/SPI/MOUNTING/REFLOW/AOI）均为合格；截图：`user_docs/demo/screenshots/phase8_trace_sn_0001.png`、`user_docs/demo/screenshots/phase8_trace_sn_0001_records.png`。
- 2026-01-14 16:08: 使用 `planner@example.com` 在 `/mes/work-orders` 搜索 `WO-DEMO-SMT-001` → 在表格行「更多操作」中点击「收尾」并确认后，工单状态从「进行中」变为「已完成」（闭环完成），截图：`user_docs/demo/screenshots/phase8_work_order_close_after_confirm.png`、`user_docs/demo/screenshots/phase8_work_order_completed.png`。
- 2026-01-14 18:06: 对 `user_docs/demo/screenshots/*.png` 批量裁剪去空白并有损压缩（保留 PNG 与文件名以避免文档引用失效），目录体积降至约 512KB。

---

## 数据策略

| 数据类型 | 来源 | 说明 |
|----------|------|------|
| 用户/权限 | `db:seed` | 6 种角色用户已预置 |
| 产线/工位 | `db:seed` | LINE-A (SMT), LINE-DIP-A (DIP) |
| 路由 | `db:seed` | PCBA-STD-V1 (SMT), PCBA-DIP-V1 (DIP) |
| **工单** | **新建** | 通过 UI 接收外部工单或使用 `WO-MGMT-SMT-QUEUE` |
| **批次** | **新建** | 通过 UI 创建 Run |
| **单件** | **新建** | TrackIn 时自动创建或手动生成 |
| **FAI/OQC** | **新建** | 通过 UI 创建和完成检验 |

> **关键点**：验收应包含新建操作（工单下发/创建批次/创建 FAI 等），而非只验证已有数据。

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

## 验收流程（按演示指南 2.0-2.8）

### 阶段 1：工单与批次创建 (2.1)
**页面**: `/mes/work-orders`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 1.1 | 登录 planner@example.com (Test123!) | 成功进入系统 | [x] |
| 1.2 | 导航到工单管理页面 | 显示工单列表 | [x] |
| 1.3 | 选择一个 RECEIVED/已接收 的 SMT 工单（本次使用 `WO-DEMO-SMT-001`） | 工单详情可见 | [x] |
| 1.4 | 点击「下发/发布」选择 `LINE-A` | 工单状态变为 RELEASED/已发布 | [x] |
| 1.5 | 点击「创建批次」 | **新建 Run**，跳转到 Run 详情页 | [x] |

### 阶段 2：产前检查 Readiness (2.2)
**页面**: `/mes/runs/{runNo}`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 2.1 | 在 Readiness 卡片点击「正式检查」| 显示检查结果 | [x] |
| 2.2 | 若失败，点击「豁免」填写原因（本次未触发失败项） | 豁免成功，状态变为 WAIVED | [x] |
| 2.3 | 确认 Readiness 状态为 PASSED | 绿色通过标识 | [x] |

### 阶段 3：上料防错 (2.3)
**页面**: `/mes/loading`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 3.1 | 输入 Run 号 | 加载 Run 信息 | [x] |
| 3.2 | 点击「加载站位表」 | 显示站位期望列表 | [x] |
| 3.3 | 完成上料验证 | 显示 PASS 状态 | [x] |

### 阶段 4：FAI 首件检验 (2.4)
**页面**: `/mes/runs/{runNo}` + `/mes/fai` + `/mes/execution`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 4.1 | Run 详情页点击「创建 FAI」| FAI 创建成功 | [x] |
| 4.2 | 进入 /mes/fai 点击「开始」| FAI 状态变为 INSPECTING | [x] |
| 4.3 | 在执行页面完成试产过站 | TrackIn/TrackOut 成功 | [x] |
| 4.4 | 回到 /mes/fai 完成检验 | FAI 状态变为 PASS | [x] |

### 阶段 5：Run 授权 (2.5)
**页面**: `/mes/runs/{runNo}`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 5.1 | 点击「授权生产」| Run 状态变为 AUTHORIZED | [x] |

### 阶段 6：批量执行 (2.6)
**页面**: `/mes/execution`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 6.1 | 选择工位 ST-SPI-01 | 工位信息加载 | [x] |
| 6.2 | 完成 TrackIn | 进站成功 | [x] |
| 6.3 | 完成 TrackOut (PASS) | 出站成功 | [x] |
| 6.4 | 依次完成 ST-MOUNT-01, ST-REFLOW-01, ST-AOI-01 | Unit 状态变为 DONE | [x] |

### 阶段 7：收尾与 OQC (2.7)
**页面**: `/mes/runs/{runNo}` + `/mes/oqc`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 7.1 | Run 详情页点击「收尾」| 提示需要 OQC 或直接完成 | [ ] |
| 7.2 | 若需要 OQC，完成 OQC 检验 | OQC 状态变为 PASS | [ ] |
| 7.3 | 再次点击「收尾」| Run 状态变为 COMPLETED | [ ] |

### 阶段 8：追溯验证 (2.8)
**页面**: `/mes/trace`
**状态**: [ ] 未开始

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 8.1 | 输入生产的 SN | 显示追溯信息 | [ ] |
| 8.2 | 检查路由版本快照 | 显示正确的路由信息 | [ ] |
| 8.3 | 检查过站记录 | 显示所有 TrackIn/Out 记录 | [ ] |
| 8.4 | 检查检验记录 | 显示 FAI/OQC 信息 | [ ] |

---

## 验收账号

| 阶段 | 推荐账号 | 密码 |
|------|----------|------|
| 工单下发 | planner@example.com | Test123! |
| Readiness/执行 | leader@example.com | Test123! |
| FAI/OQC | quality@example.com | Test123! |
| 追溯 | 任意登录用户 | - |

---

## 验证成功标准

- [x] SMT 全流程闭环完成（工单→批次→过站→追溯）
- [x] 所有关键页面可正常访问和操作（受已记录问题影响的路径除外）
- [x] 状态转换符合预期（受已记录问题影响的路径除外）
- [x] 追溯信息完整准确（已验证单件 SN-...-0001）
- [ ] 无阻断性 Bug（仍存在 Open 的 Major 问题 #2/#3/#4）

---

## 验收报告（SMT）

### 概要结论
- SMT 主线已闭环跑通：`WO-DEMO-SMT-001` → `RUN-WO-DEMO-SMT-001-1768367438506` → 过站（10/10 DONE） → 工单收尾 → 追溯可查。
- OQC：当前无抽检规则（`/mes/oqc/rules` 显示暂无规则），系统实现为“无规则→不触发 OQC→Run 直接 COMPLETED”；与演示指南中“收尾可能触发 OQC”场景不一致但可解释为配置差异。

### 本次验收数据
- 工单：`WO-DEMO-SMT-001`
- 批次（Run）：`RUN-WO-DEMO-SMT-001-1768367438506`
- 追溯验证 SN：`SN-RUN-WO-DEMO-SMT-001-1768367438506-0001`
- 关键截图：
  - Run 完成：`user_docs/demo/screenshots/phase7_run_after_all_units_done_attempt.png`
  - 工单完成：`user_docs/demo/screenshots/phase8_work_order_completed.png`
  - 追溯页：`user_docs/demo/screenshots/phase8_trace_sn_0001.png`

### 未解决问题
- 见 `user_docs/demo/acceptance_issues.md`：#2（接收外部工单提交阻断）、#3（TrackIn 自动建单件不符合指南）、#4（Run 收尾弹窗无响应体验问题/与 OQC 配置差异）。

## 文件引用

- 演示指南: `user_docs/demo/guide.md`
- 问题记录: `user_docs/demo/acceptance_issues.md`
