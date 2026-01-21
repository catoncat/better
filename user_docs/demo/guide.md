# MES 系统演示指南

---

## 技术参考

本指南为 **UI 演示操作**，面向演示人员、销售和客户。技术细节请参考：

- **SMT 技术手册**：`domain_docs/mes/smt_playbook/`
  - 术语与实体：`00_scope_and_terms.md`
  - 数据来源与权责：`01_data_sources_and_ownership.md`
  - API 索引：`99_appendix/02_api_and_ui_index.md`
  - 异常处理：`03_run_flow/07_exception_and_recovery.md`

---

## 0. 流程对照（必读）

本指南用于"按规范走完一次流程"，验证当前实现的交互链路是否闭环：

- 端到端闭环：`domain_docs/mes/spec/process/01_end_to_end_flows.md`
- SMT 流程：`domain_docs/mes/spec/process/03_smt_flows.md`
- DIP 流程：`domain_docs/mes/spec/process/04_dip_flows.md`

> 反馈里提到的"产前检查"对应系统中的 **Readiness（就绪检查）**，入口在 Run 详情页 `/mes/runs/{runNo}`。

---

## 一、项目进度概览

### 已完成里程碑

| 里程碑 | 完成时间 | 核心能力 |
|--------|----------|----------|
| **M1** | 2025-12-27 | 生产执行闭环：工单 → 批次 → 过站 → 追溯 |
| **M1.5-M1.8** | 2025-12-27 | ERP 集成、RBAC 权限、演示就绪 |
| **M2** | 2026-01-06 | 质量控制闭环：Readiness、上料防错、FAI、缺陷处置、OQC、MRB、返修 |

### 当前进度（M3 进行中）

- 上线准备：验收脚本、部署文档、数据采集配置、操作手册

### 核心能力一览

1. **SMT + DIP 双产线支持**：覆盖贴片与插件基本闭环
2. **质量门禁闭环**：Readiness（产前检查）→ 上料防错 → FAI → OQC → MRB
3. **全流程可追溯**：单件级追溯（路由版本快照 + 过站 + 检验 + 不良处置）
4. **角色权限隔离**：6 种角色 + 细粒度权限点

---

## 二、SMT 全流程演示（推荐：跑完一次闭环）

> 目标：用同一个 SMT Run 跑通 "准备 → 试产 → 授权 → 批量执行 → 收尾 → OQC/MRB → 完工 → 追溯"。

### 2.0 演示前检查清单

**数据准备**（选择其一）：

| 方式 | 命令 | 说明 |
|------|------|------|
| **A. 快速演示** | `bun run db:seed` | 基础种子数据，覆盖 SMT + DIP |
| **B. 完整 SMT 演示** | `bun scripts/smt-demo-dataset.ts` | 详细 SMT 演示数据集，含上料、FAI 等场景 |

> 📚 数据集详情：`domain_docs/mes/smt_playbook/04_demo_data/`

**启动与验证**：

- [ ] 启动服务 `bun run dev`
- [ ] 打开浏览器访问 http://localhost:3001
- [ ] 确认路由版本状态为 READY（可在 `/mes/routes` 查看）

建议提前打开页面标签：

- 工单管理：`/mes/work-orders`
- 批次管理：`/mes/runs`
- 上料防错：`/mes/loading`
- 工位执行：`/mes/execution`
- 首件检验：`/mes/fai`
- 缺陷管理：`/mes/defects`
- 追溯查询：`/mes/trace`
- OQC：`/mes/oqc`

---

### 2.1 工单下发与创建 Run（WO=RECEIVED → RELEASED → Run=PREP）

#### 页面：工单管理 `/mes/work-orders`

**操作演示：**
1. 选择一个 `RECEIVED` 的 SMT 工单（例如 `WO-MGMT-SMT-QUEUE`）
2. 点击「下发」选择 SMT 产线（例如 `LINE-A`）→ 工单变为 `RELEASED`
3. 点击「创建批次」创建 Run（Run= `PREP`）并跳转到 `/mes/runs/{runNo}`

> 📚 技术细节：`smt_playbook/03_run_flow/01_work_order_to_run.md`

---

### 2.2 产前检查（Readiness / 就绪检查）

#### 页面：批次详情 `/mes/runs/{runNo}`

**操作演示：**
1. 在 Readiness 卡片点击「正式检查」
2. 若失败：
   - 直接对失败项点击「豁免」并填写原因（演示降级路径），或
   - 使用 `/mes/integration/manual-entry` 完成钢网/锡膏绑定与手动状态录入（演示"外部系统不可用时"路径）
3. 最终目标：Readiness 状态为 `PASSED`

> 📚 技术细节：`smt_playbook/03_run_flow/02_readiness_and_prep.md`

---

### 2.3 上料防错（Loading Verify）

#### 页面：上料防错 `/mes/loading`

**操作演示：**
1. 输入 Run 号 → 点击确定
2. 若提示"尚未加载站位期望"，点击「加载站位表」
3. 使用扫码面板按站位完成上料验证（出现 `PASS`）
4. 回到 Run 详情页再次点击「正式检查」，确认 LOADING 项通过

> 📚 技术细节：
> - 扫码验证逻辑：`smt_playbook/03_run_flow/03_loading_flow.md`
> - 异常处理：`smt_playbook/03_run_flow/07_exception_and_recovery.md#2-上料阶段异常`

---

### 2.4 FAI（首件检验）+ 授权前试产过站（关键补齐点）

> 规范要求顺序：创建 FAI → 首件生产(试产) → 判定 → Run 授权（见 `03_smt_flows.md`）。

#### 页面：Run 详情 `/mes/runs/{runNo}` + FAI `/mes/fai` + 执行 `/mes/execution`

**操作演示：**
1. 在 Run 详情页点击「创建 FAI」
2. 进入 `/mes/fai`，找到该 Run 的 FAI，点击「开始」（进入 `INSPECTING`）
3. 回到 Run 详情页，点击「试产执行」按钮跳转到执行页面（Run=PREP 时显示为"试产执行"）
4. 在 Run 详情页「实际生产」卡片点击「生成单件」，生成 1 个 SN（例如 `SN-{runNo}-0001`）
5. 在 `/mes/execution` 选择首工位（SMT 示例：`ST-PRINT-01`），对同一 SN 执行一次：
   - Track In（进站）— 使用 Run 详情页「生成单件」预生成的 SN（未生成会返回 `UNIT_NOT_FOUND`）
   - Track Out（出站，PASS）
6. 回到 `/mes/fai` 记录检验项（建议填写 `unitSn`）并「完成」为 `PASS`

**Unit 生成路径说明：**

系统仅支持在 Run 内批量预生成 Unit（产品单件），TrackIn 不会自动创建 Unit。

| 方式 | 触发时机 | 适用场景 |
|------|----------|----------|
| **批量预生成** | Run 详情页点击「生成单件」按钮 | 生产前批量准备、打印标签 |

- 批量预生成：在 Run 详情页「实际生产」卡片点击「生成单件」，可一次性生成指定数量的 SN（格式：`SN-{runNo}-0001`）
- TrackIn 仅允许使用已生成的 SN；未生成会返回 `UNIT_NOT_FOUND`。

**注意：**
- 当前实现里，**授权前试产只允许首工序**；若在 Run=PREP 时操作非首工位会返回 `FAI_TRIAL_STEP_NOT_ALLOWED`。

> 📚 技术细节：`smt_playbook/03_run_flow/04_fai_flow.md`

---

### 2.5 Run 授权（Run=AUTHORIZED）

#### 页面：Run 详情 `/mes/runs/{runNo}`（或 Run 列表 `/mes/runs`）

**操作演示：**
1. 点击「授权生产」
2. 若失败：按错误码回到 Readiness / FAI 修复后重试（常见：`READINESS_CHECK_FAILED`、`FAI_NOT_PASSED`）

---

### 2.6 批量执行（Run=IN_PROGRESS）+ 不良处置（可选）

#### 页面：工位执行 `/mes/execution`

**操作演示（PASS 主线）：**
1. 依次选择工位并完成 TrackIn/TrackOut（PASS）直到末工序，Unit 进入 `DONE`
   - SMT 示例：`ST-SPI-01` → `ST-MOUNT-01` → `ST-REFLOW-01` → `ST-AOI-01`

**操作演示（FAIL 分支，可选）：**
1. 在某一步 TrackOut 选择 `FAIL`（会自动创建缺陷）
2. 进入 `/mes/defects` 对缺陷处置：`REWORK` / `SCRAP` / `HOLD`
3. 若 `REWORK`：在 `/mes/rework-tasks` 查看返修任务并继续执行

**补充说明：**

> **数据采集**：若工位配置了数据采集项（如温度、时间等），TrackOut 前需填写采集数据。当前演示数据已配置可选采集项，可跳过。

> **站点类型**：当前演示以人工站点（MANUAL）为主。规范中定义的 AUTO（设备事件）、BATCH（载具/批次）、TEST（测试结果接入）等站点类型的设备集成/自动化场景可参考 API 文档。

> 📚 技术细节：`smt_playbook/03_run_flow/05_execution_and_trace.md`

---

### 2.7 Run 收尾 + OQC/MRB 闭环（Run 进入终态）

#### 页面：Run 详情 `/mes/runs/{runNo}` + OQC `/mes/oqc`

**操作演示：**
1. 在 Run 详情页点击「收尾」
2. 若提示需要 OQC：进入 `/mes/oqc` 找到该 Run 的任务并完成（PASS/FAIL）
3. 若 OQC 失败：Run 进入 `ON_HOLD`，在 Run 详情页点击「MRB 决策」选择：
   - 放行 → `COMPLETED`
   - 返修 → `CLOSED_REWORK`（创建返修 Run）
   - 报废 → `SCRAPPED`

**返修 Run 后续操作（若选择返修）：**
1. 系统自动创建新的返修 Run（进入 `PREP` 或 `AUTHORIZED`，取决于配置）
2. 在 `/mes/runs` 找到返修 Run（标记为返修来源）
3. 返修 Run 可豁免 FAI（需权限 + 填写原因）
4. 继续执行返修 Run 直到完成

> 📚 技术细节：`smt_playbook/03_run_flow/06_oqc_closeout.md`

---

### 2.8 工单收尾 + 追溯验证

#### 页面：工单管理 `/mes/work-orders` + 追溯 `/mes/trace`

**操作演示：**
1. 回到 `/mes/work-orders` 对该工单执行「收尾」→ WO 进入 `COMPLETED`
2. 进入 `/mes/trace` 输入刚生产的 SN，确认可看到：
   - 路由版本快照
   - 过站记录（每步 TrackIn/Out）
   - FAI / OQC
   - 缺陷处置（如有）

---

## 三、失败分支示例（建议演示 1~2 个）

### 3.1 Readiness 不通过 → 豁免/修复 → 再授权

1. Run 详情页点击「正式检查」出现失败项（例如钢网/锡膏/上料）
2. `/mes/integration/manual-entry` 做绑定与状态录入，或直接「豁免」
3. Readiness 通过后再次「授权生产」

### 3.2 执行报不良 → 缺陷处置 → 返修回流

1. `/mes/execution` TrackOut 选择 `FAIL`
2. `/mes/defects` 处置为 `REWORK` 并选择回流工序
3. `/mes/rework-tasks` 查看返修任务并继续生产

### 3.3 OQC FAIL → Run ON_HOLD → MRB 决策

1. Run 收尾触发 OQC → `/mes/oqc` 完成 `FAIL`
2. Run 进入 `ON_HOLD` → Run 详情页「MRB 决策」选择放行/返修/报废

### 3.4 FAI 不通过 → 重新试产 → 再判定

1. 在 `/mes/fai` 完成检验时选择 `FAIL`
2. FAI 状态变为 `FAILED`，Run 无法授权
3. 重新创建 FAI 或重新试产首件
4. 再次在 `/mes/fai` 记录检验项并判定为 `PASS`
5. 回到 Run 详情页点击「授权生产」

> 📚 异常处理详情：`smt_playbook/03_run_flow/07_exception_and_recovery.md`

---

## 四、DIP 流程演示（可选）

> 目标：按 `domain_docs/mes/spec/process/04_dip_flows.md` 的闭环顺序，走完 DIP 的 "准备→（可选 FAI）→授权→执行→收尾→OQC/MRB→追溯"。

### 4.0 前置说明

#### 工序粒度

- 系统执行侧是通用的：只要 ERP 路由里存在对应工序（Operation）且产线有对应工位（Station），执行页面就能按步骤 TrackIn/TrackOut。
- 演示数据的 DIP 路由（`PCBA-DIP-V1`）为简化版本（4 工序）；若需完整演示规范中的细分工序（AI 插件/手工插件/异形件/手工焊接/剪脚/三防漆/固化/外观检验等），可在 ERP 或 `/mes/sync` 中导入更详细的路由配置。

#### IPQC 实现状态

| 规范节点 | 当前实现 | 演示方式 |
|----------|----------|----------|
| IPQC（后焊段首件检查） | 未实现独立模块 | 可用 FAI 或执行记录替代验证 |
| IPQC（测试段首件检查） | 未实现独立模块 | 可用 FAI 或执行记录替代验证 |

> 注：IPQC 不作为 Run 授权门禁，规范备注也写明当前未实现 IPQC。

### 4.1 创建 DIP 工单与 Run（推荐：完整闭环）

#### 页面：工单管理 `/mes/work-orders`

**操作演示：**
1. 点击「接收外部工单」
2. 填入以下示例（可按需调整）：
   - 工单号：`WO-DEMO-DIP-{时间戳}`
   - 产品编码：`P-2001`
   - 计划数量：`5`
   - 路由编码：`PCBA-DIP-V1`
   - 物料状态：建议选「全部领料」
3. 接收后，选择该工单点击「下发」→ 选择 DIP 产线（示例：`LINE-DIP-A`）
4. 点击「创建批次」创建 Run（Run= `PREP`）并进入 `/mes/runs/{runNo}`

### 4.2 Readiness（产前检查）

#### 页面：批次详情 `/mes/runs/{runNo}`

**操作演示：**
1. 在 Readiness 卡片点击「正式检查」直到通过（`PASSED`）
2. 若失败：按需走「豁免」或通过 `/mes/integration/manual-entry` 做外部状态的手动录入/绑定

### 4.3 FAI（可选）+ 授权前试产过站

#### 页面：Run 详情 `/mes/runs/{runNo}` + `/mes/fai` + `/mes/execution`

**操作演示：**
1. 若 Run 详情页显示需要 FAI：
   - 点击「创建 FAI」
   - 在 `/mes/fai` 对该 FAI 点击「开始」（进入 `INSPECTING`）
2. 授权前试产（Run=PREP）：进入 `/mes/execution` 选择 DIP 首工位并完成一次 PASS：
   - 推荐示例首工位：`ST-DIP-INS-01`
3. 回到 `/mes/fai` 记录检验项并「完成」为 `PASS`

**注意：**
- 授权前试产只允许首工序；若在 Run=PREP 时操作非首工位会返回 `FAI_TRIAL_STEP_NOT_ALLOWED`。

### 4.4 Run 授权（Run=AUTHORIZED）

#### 页面：Run 详情 `/mes/runs/{runNo}`（或 Run 列表 `/mes/runs`）

**操作演示：**
1. 点击「授权生产」
2. 若失败：按错误码回到 Readiness / FAI 修复后重试（常见：`READINESS_CHECK_FAILED`、`FAI_NOT_PASSED`）

### 4.5 执行（Run=IN_PROGRESS）

#### 页面：工位执行 `/mes/execution`

**操作演示：**
1. 依次选择工位并完成 TrackIn/TrackOut（PASS）直到末工序，Unit 进入 `DONE`
2. 推荐工位示例（种子数据默认 4 站）：
   - `ST-DIP-INS-01` → `ST-DIP-WAVE-01` → `ST-DIP-POST-01` → `ST-DIP-TEST-01`
3. 若你的 ERP 路由拆得更细（例如插件/后焊/外观/测试分段多工序），按路由步骤顺序继续 TrackIn/TrackOut 即可

**补充说明：**

> **数据采集**：若工位配置了数据采集项，TrackOut 前需填写采集数据。

### 4.6 Run 收尾 + OQC/MRB 闭环

#### 页面：Run 详情 `/mes/runs/{runNo}` + OQC `/mes/oqc`

**操作演示：**
1. 在 Run 详情页点击「收尾」
2. 若需要 OQC：进入 `/mes/oqc` 完成任务（PASS/FAIL）
3. 若 OQC 失败：Run 进入 `ON_HOLD`，在 Run 详情页点击「MRB 决策」选择放行/返修/报废

**返修 Run 后续操作（若选择返修）：**
1. 系统自动创建新的返修 Run
2. 在 `/mes/runs` 找到返修 Run 并继续执行
3. 返修 Run 可豁免 FAI（需权限 + 填写原因）

### 4.7 工单收尾 + 追溯验证

#### 页面：`/mes/work-orders` + `/mes/trace`

**操作演示：**
1. 工单收尾：在 `/mes/work-orders` 对工单执行「收尾」→ WO 进入 `COMPLETED`
2. 追溯验证：在 `/mes/trace` 输入 DIP 的 SN，确认可看到路由版本快照、过站、FAI/OQC（如有）

---

## 五、系统亮点总结

### 业务价值

| 价值维度 | 说明 |
|----------|------|
| **生产可控** | 全流程状态可视，异常可追踪 |
| **质量可追** | 单件级追溯，问题快速定位 |
| **风险可降** | 多级门禁（Readiness/上料/FAI/OQC/MRB），防呆防错 |
| **集成可靠** | 支持降级模式，不依赖外部系统 100% 在线 |

### 技术亮点

1. **现代化技术栈**：React + TypeScript + Bun
2. **单机可部署**：SQLite + 单可执行文件
3. **RBAC 权限**：细粒度权限控制 + 角色预设
4. **完整审计日志**：关键操作可追溯
5. **双产线支持**：SMT / DIP 路线可配置

---

## 附录

### 演示账号

| 角色 | 账号 | 密码 | 主要功能 |
|------|------|------|----------|
| 管理员 | admin@example.com | ChangeMe123! | 系统配置、用户管理 |
| 计划员 | planner@example.com | Test123! | 工单管理、批次派发 |
| 工艺工程师 | engineer@example.com | Test123! | 路由配置、数据采集规格 |
| 质量员 | quality@example.com | Test123! | FAI/OQC/MRB、缺陷管理 |
| 组长 | leader@example.com | Test123! | 批次管理、就绪检查、授权、收尾 |
| 操作员 | operator@example.com | Test123! | 工位执行、进站/出站 |

### 推荐演示数据（可跳转用）

| 用途 | 工单号 | 批次号 | SN | 路由编码 |
|------|--------|--------|-----|----------|
| SMT 全流程起点（推荐） | WO-MGMT-SMT-QUEUE | （新建） | （新扫/新生成） | PCBA-SMT-V1 |
| DIP 全流程起点（推荐） | WO-DEMO-DIP-{时间戳} | （新建） | （新扫/新生成） | PCBA-DIP-V1 |
| 准备中批次（可跳转） | WO-MGMT-SMT-PREP | RUN-MGMT-SMT-PREP | - | PCBA-SMT-V1 |
| 执行中批次 | WO-MGMT-SMT-EXEC | RUN-MGMT-SMT-EXEC | SN-MGMT-EXEC-0001 | PCBA-SMT-V1 |
| 质量锁定批次 | WO-MGMT-SMT-HOLD | RUN-MGMT-SMT-HOLD | SN-MGMT-HOLD-0001 | PCBA-SMT-V1 |
| 已完成追溯 | WO-MGMT-SMT-DONE | RUN-MGMT-SMT-DONE | SN-MGMT-DONE-0001 | PCBA-SMT-V1 |
| DIP 执行中 | WO-MGMT-DIP-EXEC | RUN-MGMT-DIP-EXEC | SN-MGMT-DIP-EXEC-0001 | PCBA-DIP-V1 |
| DIP 已完成追溯 | WO-MGMT-DIP-DONE | RUN-MGMT-DIP-DONE | SN-MGMT-DIP-DONE-0001 | PCBA-DIP-V1 |

### 常见问题应对

**Q: 系统能支持多大的生产规模？**
> 单机版可支持日产万件级别。如需更大规模，架构可平滑升级到分布式部署。

**Q: 和现有 ERP 如何对接？**
> 系统已实现与金蝶云星空的对接接口，支持工单、物料、BOM、路由的自动同步。其他 ERP 可通过标准接口适配。

**Q: 如果网络断了怎么办？**
> 系统支持降级模式：外部集成检查可手动录入或豁免，确保生产不中断；事后可补录数据并保留审计记录。
