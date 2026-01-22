# MES 系统演示指南

---

## 技术参考

本指南为 UI 演示操作，面向演示人员、销售和客户。技术细节请参考：

- SMT 技术手册：`domain_docs/mes/smt_playbook/`
  - 术语与实体：`00_scope_and_terms.md`
  - 数据来源与权责：`01_data_sources_and_ownership.md`
  - API 索引：`99_appendix/02_api_and_ui_index.md`
  - 异常处理：`03_run_flow/07_exception_and_recovery.md`

---

## 0. 流程对照（必读）

本指南用于“按规范走完一次流程”，验证当前实现的交互链路是否闭环：

- 端到端闭环：`domain_docs/mes/spec/process/01_end_to_end_flows.md`
- SMT 流程：`domain_docs/mes/spec/process/03_smt_flows.md`
- DIP 流程：`domain_docs/mes/spec/process/04_dip_flows.md`

> 反馈里提到的“产前检查”对应系统中的 Readiness（就绪检查），入口在 Run 详情页 `/mes/runs/{runNo}`。

---

## 快速演示总览（一页清单）

用于现场快速跑通 SMT 闭环，详细步骤见对应章节。

| 步骤 | 操作 | 验证点 | 参考章节 |
|------|------|--------|----------|
| 1 | 准备数据并登录 | 路由版本为 READY | 3.0 |
| 2 | 下发工单并创建 Run | Run=PREP | 3.1 |
| 3 | Readiness 正式检查 | Readiness=PASSED | 3.2 |
| 4 | 加载站位表并上料验证 | 站位 LOADED | 3.3 |
| 5 | 创建/启动 FAI | FAI=INSPECTING | 3.4 |
| 6 | 首件试产 + 记录检验项 | FAI=PASS | 3.4 |
| 7 | 授权生产 | Run=AUTHORIZED | 3.5 |
| 8 | 批量执行 TrackIn/TrackOut | Unit DONE/OUT_FAILED | 3.6 |
| 9 | Run 收尾 + OQC/MRB | Run COMPLETED/ON_HOLD | 3.7 |
| 10 | 工单收尾 + 追溯 | Trace 数据完整 | 3.8 |

可选：演示失败分支与恢复路径（第 4 章）。

---

## 一、项目进度概览

### 已完成里程碑

| 里程碑 | 完成时间 | 核心能力 |
|--------|----------|----------|
| M1 | 2025-12-27 | 生产执行闭环：工单 → 批次 → 过站 → 追溯 |
| M1.5-M1.8 | 2025-12-27 | ERP 集成、RBAC 权限、演示就绪 |
| M2 | 2026-01-06 | 质量控制闭环：Readiness、上料防错、FAI、缺陷处置、OQC、MRB、返修 |

### 当前进度（M3 进行中）

- 上线准备：验收脚本、部署文档、数据采集配置、操作手册

### 核心能力一览

1. SMT + DIP 双产线支持：覆盖贴片与插件基本闭环
2. 质量门禁闭环：Readiness（产前检查）→ 上料防错 → FAI → OQC → MRB
3. 全流程可追溯：单件级追溯（路由版本快照 + 过站 + 检验 + 不良处置）
4. 角色权限隔离：6 种角色 + 细粒度权限点

---

## 二、核心概念速查（新增）

### 2.1 条码格式规范

| 场景 | 格式 | 示例 | 说明 |
|------|------|------|------|
| 上料扫码 | `物料编码|批次号` | `5212090001|LOT-20250526-001` | 竖线分隔 |
| 单件 SN | `SN-{runNo}-{序号}` | `SN-RUN-WO-001-0001` | 系统自动生成 |
| 站位码 | 机台站位 | `2F-46` | 对应 FeederSlot.code |

### 2.2 状态枚举速查（Unit / Run / FAI / OQC）

**Run 状态**

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| PREP | 准备中 | 创建 Run / 授权撤销后 |
| AUTHORIZED | 已授权 | Run 授权成功 |
| IN_PROGRESS | 执行中 | 首次 TrackIn 后 |
| ON_HOLD | 暂停 | OQC FAIL 后进入 MRB |
| COMPLETED | 完工 | OQC PASS 或无抽检规则 |
| CLOSED_REWORK | 已转返修 | MRB 选择返修 |
| SCRAPPED | 报废 | MRB 选择报废 |
| CANCELLED | 已取消 | PREP 状态取消 Run |

**Unit 状态**

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| QUEUED | 已生成 | 生成单件 SN |
| IN_STATION | 在站 | TrackIn |
| DONE | 完成 | TrackOut PASS |
| OUT_FAILED | 失败 | TrackOut FAIL |
| SCRAPPED | 报废 | 处置为报废 |

**FAI 状态**

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| PENDING | 待启动 | 创建 FAI |
| INSPECTING | 检验中 | 启动 FAI |
| PASS | 通过 | 完成判定 PASS |
| FAIL | 失败 | 完成判定 FAIL |

**OQC 状态**

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| PENDING | 待启动 | OQC 自动创建 |
| INSPECTING | 抽检中 | 启动 OQC |
| PASS | 通过 | 完成判定 PASS |
| FAIL | 失败 | 完成判定 FAIL |

**验证结果三态**

| 结果 | UI 显示 | 含义 | 后续操作 |
|------|---------|------|----------|
| PASS | 绿色对勾 | 扫码物料 = 期望物料 | 继续下一站位 |
| WARNING | 黄色警告 | 扫码物料 = 替代料 | 可接受，需关注 |
| FAIL | 红色叉号 | 物料不匹配 | 重新扫正确物料 |

> 站位锁定：同一站位连续 3 次 FAIL 会触发自动锁定，需班组长解锁。

### 2.3 错误码速查表（常用）

| 阶段 | 错误码 | 含义 | 快速恢复 |
|------|--------|------|----------|
| 上料 | SLOT_LOCKED | 站位已锁定 | 使用班组长账号解锁 |
| 上料 | MATERIAL_MISMATCH | 物料不匹配 | 扫正确物料条码 |
| 上料 | SLOT_ALREADY_LOADED | 站位已上料 | 使用“换料”功能 |
| 上料 | BARCODE_PARSE_ERROR | 条码格式错误 | 检查条码格式 |
| 就绪 | READINESS_NOT_PASSED | 就绪检查未通过 | 修复或豁免失败项 |
| FAI | FAI_ALREADY_EXISTS | 已存在未完成 FAI | 完成或取消现有 FAI |
| FAI | INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| 授权 | FAI_GATE_BLOCKED | FAI 未通过 | 完成 FAI 且 PASS |
| 执行 | UNIT_NOT_FOUND | 单件不存在 | 先生成 Unit |
| 执行 | UNIT_ALREADY_IN_STATION | Unit 已在站 | 先 TrackOut |
| 执行 | DISPOSITION_REQUIRED | 失败 Unit 未处置 | 处置后重试 |

完整表见附录 D。

---

## 三、SMT 全流程演示

目标：用同一个 SMT Run 跑通“准备 → 试产 → 授权 → 批量执行 → 收尾 → OQC/MRB → 完工 → 追溯”。

### 3.0 演示前检查清单（扩展）

**数据准备（选择其一）**

| 方式 | 命令 | 说明 |
|------|------|------|
| A. 快速演示 | `bun run db:seed` | 基础种子数据，覆盖 SMT + DIP |
| B. 完整 SMT 演示 | `bun scripts/smt-demo-dataset.ts` | 详细 SMT 演示数据集，含上料、FAI 等场景 |

数据集详情：`domain_docs/mes/smt_playbook/04_demo_data/`

**环境与账号**

- 启动服务：`bun run dev`
- 打开 http://localhost:3001
- 使用演示账号登录（附录 A）

**关键配置确认**

- `/mes/routes` 路由版本状态为 READY
- 产线与站位配置已存在（Line/FeederSlot）
- SlotMaterialMapping 已配置（缺失会导致加载站位表失败）
- OQC 抽检规则可按需准备（无规则则不会触发 OQC）

**建议提前打开页面**

- 工单管理：`/mes/work-orders`
- 批次管理：`/mes/runs`
- 上料防错：`/mes/loading`
- 工位执行：`/mes/execution`
- 首件检验：`/mes/fai`
- 缺陷管理：`/mes/defects`
- 追溯查询：`/mes/trace`
- OQC：`/mes/oqc`

---

### 3.1 工单下发与创建 Run（补充验证点）

**页面**：`/mes/work-orders`

**操作演示**
1. 选择一个 RECEIVED 的 SMT 工单（例如 `WO-MGMT-SMT-QUEUE`）
2. 点击“下发”选择 SMT 产线（如 `LINE-A`）→ 工单变为 RELEASED
3. 点击“创建批次”创建 Run（Run=PREP）并跳转到 `/mes/runs/{runNo}`

**期望结果**
- Run 绑定产线与路由版本
- Run 状态为 PREP
- Run 详情页可看到 Readiness/FAI/执行卡片

**验证检查点**
- Run.routeVersionId 已绑定 READY 版本
- Run.lineId 正确

技术细节：`smt_playbook/03_run_flow/01_work_order_to_run.md`

---

### 3.2 产前检查（Readiness）（大幅扩展）

**页面**：`/mes/runs/{runNo}`

#### 3.2.1 检查项 6 项详解

| 检查项 | 含义 | 数据来源 | 通过条件 | 可豁免 |
|--------|------|----------|----------|--------|
| ROUTE | 路由版本可用 | 路由编译状态 | 绑定版本 = READY | 否 |
| STENCIL | 钢网已绑定 | 线体钢网绑定 | 状态正常、在有效期内 | 是 |
| SOLDER_PASTE | 锡膏已扫码 | 锡膏状态记录 | 未过期、已回温 | 是 |
| EQUIPMENT | 设备状态正常 | TPM/设备状态 | 贴片机 = normal | 是 |
| MATERIAL | 物料齐套 | BOM + 物料主数据 | 关键物料已领料 | 是 |
| LOADING | 上料完成 | RunSlotExpectation | 全部站位 = LOADED | 否 |

#### 3.2.2 Precheck vs Formal 区别

- Precheck：用于快速预览当前 Readiness 状态（不产生新的检查记录）。
- Formal：点击“正式检查”会触发后端校验并写入检查记录，是 Run 授权的门禁依据。

#### 3.2.3 操作演示：正式检查

1. 在 Readiness 卡片点击“正式检查”
2. 查看每项检查结果与失败原因
3. 失败项修复或豁免后，再次点击“正式检查”

**期望结果**
- Readiness 状态变为 PASSED
- 检查结果写入审计记录

#### 3.2.4 操作演示：豁免（Waive）流程

**前置条件**：当前用户具有 READINESS_WAIVE 权限（leader / quality 角色）

1. 找到失败的检查项（如 STENCIL）
2. 点击该项右侧“豁免”按钮
3. 在弹窗中填写豁免原因（必填）
4. 点击“确认豁免”

**期望结果**
- 该检查项状态变为 WAIVED（黄色标记）
- Readiness 整体状态变为 PASSED
- 审计日志记录豁免操作

#### 3.2.5 失败分支演示

- 示例：LOADING 未完成 → Readiness FAIL
- 处理：完成上料验证后重新 Formal Check
- 若钢网/锡膏/设备状态未同步，可使用 `/mes/integration/manual-entry` 手动录入后再检查

技术细节：`smt_playbook/03_run_flow/02_readiness_and_prep.md`

---

### 3.3 上料防错（Loading Verify）（大幅扩展）

**页面**：`/mes/loading`

**前置条件**

- Run 状态为 PREP
- Run 已绑定产线（lineId）
- 产线已配置站位（FeederSlot）
- 站位已配置物料映射（SlotMaterialMapping）
- 操作人已登录（operatorId）

#### 3.3.1 加载站位表操作

1. 在搜索框输入 Run 号
2. 点击“确定”加载 Run 信息
3. 若提示“尚未加载站位期望”，点击“加载站位表”
4. 等待加载完成

**期望结果**
- 站位列表显示站位码、期望物料、替代料信息
- 所有站位状态为 PENDING

**可能的错误**

| 错误提示 | 原因 | 处理方式 |
|----------|------|----------|
| SLOT_MAPPING_MISSING | 站位缺少物料映射 | 去 `/mes/loading/slot-config` 补充映射 |
| LOADING_ALREADY_STARTED | 已有上料记录 | 不能重新加载，只能继续上料 |

#### 3.3.2 扫码验证（PASS）

条码格式：`物料编码|批次号`。

**示例数据**
- 站位码：`2F-34`
- 期望物料：`5212090007`
- 扫码条码：`5212090007|LOT-20250526-003`

**操作步骤**
1. 在站位列表中找到 `2F-34` 行
2. 点击“扫码”按钮或使用扫码枪
3. 输入/确认条码
4. 点击“验证”

**期望结果**
- 验证结果显示 PASS
- 站位状态变为 LOADED

#### 3.3.3 替代料验证（WARNING）

**示例数据**
- 站位码：`2F-46`
- 期望物料：`5212090001`
- 扫码条码：`5212090001B|LOT-20250526-002`

**期望结果**
- 验证结果显示 WARNING（替代料）
- 站位状态变为 LOADED

#### 3.3.4 错误物料（FAIL + 锁定）

**操作步骤（模拟连续 3 次失败）**
1. 点击“扫码”
2. 输入错误物料条码：`9999999999|LOT-FAIL-001`
3. 点击“验证” → 显示 FAIL
4. 重复步骤 1-3 共 3 次

**期望结果**
- 第 1-2 次：显示 FAIL，failedAttempts 递增
- 第 3 次：显示 SLOT_LOCKED 错误
- 站位显示“锁定”标记

#### 3.3.5 解锁站位

**前置条件**：站位锁定，用户具备解锁权限（leader/admin）

1. 在锁定站位行点击“解锁”
2. 在弹窗中填写解锁原因
3. 点击“确认解锁”

**期望结果**
- 站位锁定标记消失
- failedAttempts 归零

#### 3.3.6 换料操作

**场景**：站位已上料，需要更换为另一批次物料

1. 在已上料站位行点击“换料”
2. 输入新物料条码
3. 填写换料原因（必填）
4. 点击“确认换料”

**期望结果**
- 旧上料记录标记为 REPLACED
- 新上料记录写入
- 换料原因可追溯

#### 3.3.7 幂等扫码行为

**场景 1：已上料站位再次扫码同一物料**
- 期望：返回 isIdempotent=true，不新增记录

**场景 2：已上料站位扫码不同物料**
- 期望：返回 SLOT_ALREADY_LOADED，必须使用“换料”功能

#### 3.3.8 验证检查点汇总

- load-table 成功生成 RunSlotExpectation（status=PENDING）
- PASS/WARNING 写入 LoadingRecord，站位状态 LOADED
- 连续 FAIL 触发锁定与解锁流程
- replace 写入 REPLACED 记录并保留原因

技术细节：`smt_playbook/03_run_flow/03_loading_flow.md`

---

### 3.4 FAI（首件检验）+ 授权前试产（大幅扩展）

#### 3.4.1 FAI 状态流转图

```
[创建 FAI] → PENDING → [开始] → INSPECTING → [完成判定]
├─ PASS → Run 可授权
└─ FAIL → 需重新首件
```

#### 3.4.2 创建 FAI（sampleQty 要求）

**前置条件**
- Run 状态为 PREP
- 就绪检查（Formal）已通过
- 已生成足够 Unit（>= sampleQty）

**操作步骤**
1. 在 Run 详情页点击“创建 FAI”
2. 输入样本数量 sampleQty（建议 2）
3. 点击“创建”

**期望结果**
- FAI 状态为 PENDING

**常见创建失败**

| 错误码 | 原因 | 恢复方式 |
|--------|------|----------|
| READINESS_NOT_PASSED | 就绪检查未通过 | 通过 Readiness 后重试 |
| INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| FAI_ALREADY_EXISTS | 已存在未完成 FAI | 完成或取消现有 FAI |

#### 3.4.3 启动 FAI

1. 进入 `/mes/fai`
2. 找到该 Run 的 FAI，点击“开始”

**期望结果**
- FAI 状态变为 INSPECTING

#### 3.4.4 首件试产（授权前过站）

1. 在 Run 详情页“实际生产”卡片点击“生成单件”
2. 进入 `/mes/execution`，选择首工位
3. 对 sampleQty 个 SN 完成 TrackIn/TrackOut（PASS）

**注意**
- Run=PREP 时仅允许首工序试产，非首工序会阻断

#### 3.4.5 记录检验项（字段详解）

| 字段 | 必填 | 说明 | 示例值 |
|------|------|------|--------|
| unitSn | 否 | 样本 SN | `SN-RUN-001-0001` |
| itemName | 是 | 检验项名称 | 锡膏厚度 |
| itemSpec | 否 | 规范/标准 | 0.12±0.02mm |
| actualValue | 否 | 实测值 | 0.13mm |
| result | 是 | PASS / FAIL / NA | PASS |
| defectCode | 否 | 不良代码 | SOLDER_BRIDGE |
| remark | 否 | 备注 | 目视检查正常 |

#### 3.4.6 完成判定（PASS）

1. 在 `/mes/fai` 完成判定为 PASS
2. failedQty 必须为 0

#### 3.4.7 FAI Gate 阻断逻辑

- 路由要求 FAI 时，Run 授权前必须 FAI=PASS
- 若存在 SPI/AOI 检验 FAIL，系统阻断 FAI PASS

#### 3.4.8 失败分支：FAI FAIL → 恢复流程

```
FAI FAIL → [是否可修复?]
├─ 是 → 创建新 FAI → 重新试产 → 新 FAI 判定
└─ 否 → 取消 Run
```

技术细节：`smt_playbook/03_run_flow/04_fai_flow.md`

---

### 3.5 Run 授权（补充失败场景）

**页面**：`/mes/runs/{runNo}` 或 `/mes/runs`

**提示**
- 若未执行 Formal Readiness，授权时会自动触发一次检查，失败则阻止授权。

**操作演示：授权成功**
1. 点击“授权生产”
2. Run 状态变为 AUTHORIZED

**常见授权失败原因及恢复**

| 错误码 | 原因 | 恢复方式 |
|--------|------|----------|
| READINESS_NOT_PASSED | Readiness 未通过 | 通过 Readiness 后重试 |
| FAI_GATE_BLOCKED | FAI 未 PASS | 完成 FAI 且 PASS |
| INVALID_RUN_STATUS | Run 状态不允许授权 | 确认 Run 为 PREP |

---

### 3.6 批量执行（大幅扩展）

#### 3.6.1 Unit 状态流转图

```
[生成单件] → QUEUED → [TrackIn] → IN_STATION → [TrackOut]
├─ PASS → DONE (终态)
└─ FAIL → OUT_FAILED
├─ [返修] → IN_STATION
└─ [报废] → SCRAPPED (终态)
```

#### 3.6.2 生成单件（Unit）

1. Run 详情页点击“生成单件”
2. 输入数量，系统生成 SN

**期望结果**
- Unit 状态为 QUEUED
- SN 连续可追溯

**限制**
- 仅允许 Run 状态为 PREP 或 AUTHORIZED 时生成

#### 3.6.3 TrackIn/TrackOut 前置条件

**TrackIn 前置条件**

| 条件 | 说明 | 错误码 |
|------|------|--------|
| Run 已授权 | Run.status = AUTHORIZED 或 IN_PROGRESS | RUN_NOT_AUTHORIZED |
| Unit 存在 | 必须先生成 Unit | UNIT_NOT_FOUND |
| Unit 不在站 | Unit.status != IN_STATION | UNIT_ALREADY_IN_STATION |
| 上次失败已处置 | OUT_FAILED 的 Unit 需先处置 | DISPOSITION_REQUIRED |

**TrackOut 前置条件**

| 条件 | 说明 | 错误码 |
|------|------|--------|
| Unit 在站 | Unit.status = IN_STATION | UNIT_NOT_IN_STATION |
| 数据采集完成 | 必填项已填写 | REQUIRED_DATA_MISSING |

#### 3.6.4 TrackIn/TrackOut（PASS 主线）

1. 在 `/mes/execution` 选择工位
2. TrackIn → Unit 状态 IN_STATION
3. TrackOut 选择 PASS → Unit 状态 DONE

**SMT 示例工位**：`ST-SPI-01` → `ST-MOUNT-01` → `ST-REFLOW-01` → `ST-AOI-01`

**提示**
- 首次 TrackIn 后 Run 会进入 IN_PROGRESS

#### 3.6.5 数据采集项填写

- 若工位配置了数据采集项，TrackOut 前必须填写必填项
- 示例：炉温、时间、AOI 结果

#### 3.6.6 TrackOut FAIL + 缺陷处置

1. TrackOut 选择 FAIL
2. 进入 `/mes/defects` 处理缺陷
3. 选择处置：REWORK / SCRAP / HOLD

#### 3.6.7 Unit 失败处置决策树

```
Unit OUT_FAILED → [处置决策]
├─ 返修 → [创建返修工单] → 返修 TrackIn/Out
│                          ├─ PASS → DONE
│                          └─ FAIL → 再次处置
└─ 报废 → SCRAPPED (终态)
```

#### 3.6.8 验证检查点汇总

- TrackIn/Out 产生正确状态变化
- FAIL 生成缺陷并要求处置
- Trace 中可见 tracks/dataValues/inspections/loadingRecords

技术细节：`smt_playbook/03_run_flow/05_execution_and_trace.md`

---

### 3.7 Run 收尾 + OQC/MRB 闭环（大幅扩展）

#### 3.7.1 OQC 触发条件与抽检规则

| 类型 | 说明 | 示例 | 计算方式 |
|------|------|------|----------|
| PERCENTAGE | 按百分比抽检 | 10% | 100 PCS 完成 → 抽 10 个 |
| FIXED | 固定数量抽检 | 5 | 无论多少，固定抽 5 个 |

**触发条件**
- 所有 Unit 已进入终态（DONE/SCRAPPED）
- 存在匹配抽检规则且样本数 > 0
- 若无匹配规则或样本数为 0，Run 直接 COMPLETED（不创建 OQC）

#### 3.7.2 OQC 状态流转图

```
PENDING → INSPECTING → PASS/FAIL
PASS → Run COMPLETED
FAIL → Run ON_HOLD → MRB 决策
```

#### 3.7.3 操作演示：OQC PASS → Run 完工

1. Run 详情页点击“收尾”
2. 若触发 OQC：进入 `/mes/oqc` 完成检验并判定 PASS
3. Run 状态变为 COMPLETED

#### 3.7.4 操作演示：OQC FAIL → MRB 决策

1. OQC 判定 FAIL → Run 进入 ON_HOLD
2. 在 Run 详情页点击“MRB 决策”

**MRB 三选项详解**
- RELEASE：放行，Run → COMPLETED
- REWORK：创建返修 Run，Run → CLOSED_REWORK
- SCRAP：全批报废，Run → SCRAPPED

#### 3.7.5 操作演示：创建返修 Run

1. MRB 选择 REWORK
2. 系统自动创建返修 Run
3. 在 `/mes/runs` 中查看返修 Run 并继续执行

技术细节：`smt_playbook/03_run_flow/06_oqc_closeout.md`

---

### 3.8 工单收尾 + 追溯验证（补充验证点）

**页面**：`/mes/work-orders` + `/mes/trace`

**操作演示**
1. 回到 `/mes/work-orders` 对工单执行“收尾” → WO 进入 COMPLETED
2. 进入 `/mes/trace` 输入 SN，确认可看到：
   - 路由版本快照
   - 过站记录（TrackIn/Out）
   - FAI / OQC 摘要
   - 上料记录与缺陷处置

**验证检查点**
- Trace 中 routeVersion 与 Run 绑定版本一致
- loadingRecords、tracks、inspections 同步可见

---

## 四、失败分支示例（扩展为独立章节）

### 4.1 上料异常场景演示

- 站位映射缺失：load-table 返回 SLOT_MAPPING_MISSING
- 已开始上料：load-table 返回 LOADING_ALREADY_STARTED
- 站位锁定：连续 3 次扫码错误触发 SLOT_LOCKED
- 已上料再扫不同物料：返回 SLOT_ALREADY_LOADED，需换料
- 条码格式错误或批次不存在：BARCODE_PARSE_ERROR / MATERIAL_LOT_NOT_FOUND

### 4.2 就绪检查失败场景演示

- LOADING 未完成 → Readiness FAIL → 完成上料后重新检查
- STENCIL/SOLDER_PASTE 异常 → 手动录入或豁免

### 4.3 FAI 失败场景演示

1. 创建 FAI
2. 录入检验项 FAIL 或 failedQty > 0
3. FAI FAIL → Run 无法授权
4. 创建新 FAI 并重新试产 → PASS

### 4.4 执行异常场景演示

- Run 未授权 → TrackIn 返回 RUN_NOT_AUTHORIZED
- Unit 未生成 → TrackIn 返回 UNIT_NOT_FOUND
- 必填数据缺失 → TrackOut 返回 REQUIRED_DATA_MISSING
- 站点不在路由中 → TrackIn 返回 STATION_NOT_IN_ROUTE

### 4.5 OQC 失败场景演示

1. OQC 判定 FAIL
2. Run 进入 ON_HOLD
3. MRB 决策：RELEASE / REWORK / SCRAP

---

## 五、DIP 流程演示（保持现有结构，补充同样细节）

目标：按 `domain_docs/mes/spec/process/04_dip_flows.md` 的闭环顺序走完 DIP。

### 5.0 前置说明

#### 工序粒度

- 执行侧是通用流程：ERP 路由里存在的工序都可 TrackIn/TrackOut。
- 演示数据的 DIP 路由（`PCBA-DIP-V1`）为简化版本（4 工序）。

#### IPQC 实现状态

| 规范节点 | 当前实现 | 演示方式 |
|----------|----------|----------|
| IPQC（后焊段首件检查） | 未实现独立模块 | 可用 FAI 或执行记录替代验证 |
| IPQC（测试段首件检查） | 未实现独立模块 | 可用 FAI 或执行记录替代验证 |

### 5.1 创建 DIP 工单与 Run

**页面**：`/mes/work-orders`

1. 点击“接收外部工单”
2. 填写示例：
   - 工单号：`WO-DEMO-DIP-{时间戳}`
   - 产品编码：`P-2001`
   - 计划数量：`5`
   - 路由编码：`PCBA-DIP-V1`
3. 下发到 DIP 产线并创建 Run（状态 PREP）

**期望结果**
- Run 绑定路由版本与产线
- Readiness 卡片可见

### 5.2 Readiness（产前检查）

1. 在 Run 详情页点击“正式检查”
2. 失败项可豁免或手动录入

**期望结果**
- Readiness 状态 PASSED
- 检查项规则与 SMT 一致（LOADING 必须完成）

### 5.3 FAI（可选）+ 授权前试产过站

1. 若提示需要 FAI：创建并启动 FAI
2. 在 `/mes/execution` 完成首工位 TrackIn/Out
3. 在 `/mes/fai` 记录检验项并判定 PASS

**期望结果**
- FAI 状态 PASS（如路由要求）
- Run 保持 PREP，等待授权

### 5.4 Run 授权

1. 点击“授权生产”
2. Run 状态变为 AUTHORIZED

**期望结果**
- 授权成功后可开始批量执行

### 5.5 执行（Run=IN_PROGRESS）

1. 依次选择工位完成 TrackIn/TrackOut
2. 推荐工位示例：
   - `ST-DIP-INS-01` → `ST-DIP-WAVE-01` → `ST-DIP-POST-01` → `ST-DIP-TEST-01`

**期望结果**
- Unit 状态 DONE
- Trace 可见 tracks/dataValues/inspections

### 5.6 Run 收尾 + OQC/MRB

1. Run 详情页点击“收尾”
2. 若触发 OQC：完成检验
3. OQC FAIL 时执行 MRB 决策

**期望结果**
- OQC PASS → Run COMPLETED
- OQC FAIL → Run ON_HOLD → MRB 决策

### 5.7 工单收尾 + 追溯验证

1. `/mes/work-orders` 收尾工单
2. `/mes/trace` 输入 DIP SN 验证追溯数据

### 5.8 验证检查点汇总

- Readiness Formal Check 写入记录且为 PASSED
- FAI（如要求）通过后可授权
- TrackIn/TrackOut 状态流转正确
- OQC/MRB 决策影响 Run 终态
- Trace 可见 tracks/dataValues/inspections/loadingRecords

### 5.9 DIP 失败分支演示

- Readiness 未通过：LOADING 未完成或外部状态缺失 → 修复或豁免后再检查
- 上料异常：SLOT_MAPPING_MISSING / SLOT_LOCKED → 补充映射或解锁后重试
- FAI 失败（如路由要求）：检验 FAIL 或样本不足 → 重新创建 FAI
- 执行异常：RUN_NOT_AUTHORIZED / REQUIRED_DATA_MISSING → 授权或补全采集项
- OQC 失败：Run 进入 ON_HOLD → MRB 选择 RELEASE/REWORK/SCRAP

---

## 六、系统亮点总结

### 业务价值

| 价值维度 | 说明 |
|----------|------|
| 生产可控 | 全流程状态可视，异常可追踪 |
| 质量可追 | 单件级追溯，问题快速定位 |
| 风险可降 | 多级门禁（Readiness/上料/FAI/OQC/MRB），防呆防错 |
| 集成可靠 | 支持降级模式，不依赖外部系统 100% 在线 |

### 技术亮点

1. 现代化技术栈：React + TypeScript + Bun
2. 单机可部署：SQLite + 单可执行文件
3. RBAC 权限：细粒度权限控制 + 角色预设
4. 完整审计日志：关键操作可追溯
5. 双产线支持：SMT / DIP 路线可配置

---

## 附录

### A. 演示账号

| 角色 | 账号 | 密码 | 主要功能 |
|------|------|------|----------|
| 管理员 | admin@example.com | ChangeMe123! | 系统配置、用户管理 |
| 计划员 | planner@example.com | Test123! | 工单管理、批次派发 |
| 工艺工程师 | engineer@example.com | Test123! | 路由配置、数据采集规格 |
| 质量员 | quality@example.com | Test123! | FAI/OQC/MRB、缺陷管理 |
| 组长 | leader@example.com | Test123! | 批次管理、就绪检查、授权、收尾 |
| 操作员 | operator@example.com | Test123! | 工位执行、进站/出站 |

### B. 推荐演示数据（扩展）

| 用途 | 工单号 | 批次号 | SN | 路由编码 |
|------|--------|--------|-----|----------|
| SMT 全流程起点 | WO-MGMT-SMT-QUEUE | （新建） | （新扫/新生成） | PCBA-SMT-V1 |
| DIP 全流程起点 | WO-DEMO-DIP-{时间戳} | （新建） | （新扫/新生成） | PCBA-DIP-V1 |
| 准备中批次 | WO-MGMT-SMT-PREP | RUN-MGMT-SMT-PREP | - | PCBA-SMT-V1 |
| 执行中批次 | WO-MGMT-SMT-EXEC | RUN-MGMT-SMT-EXEC | SN-MGMT-EXEC-0001 | PCBA-SMT-V1 |
| 质量锁定批次 | WO-MGMT-SMT-HOLD | RUN-MGMT-SMT-HOLD | SN-MGMT-HOLD-0001 | PCBA-SMT-V1 |
| 已完成追溯 | WO-MGMT-SMT-DONE | RUN-MGMT-SMT-DONE | SN-MGMT-DONE-0001 | PCBA-SMT-V1 |
| DIP 执行中 | WO-MGMT-DIP-EXEC | RUN-MGMT-DIP-EXEC | SN-MGMT-DIP-EXEC-0001 | PCBA-DIP-V1 |
| DIP 已完成追溯 | WO-MGMT-DIP-DONE | RUN-MGMT-DIP-DONE | SN-MGMT-DIP-DONE-0001 | PCBA-DIP-V1 |

**建议覆盖场景**

- 上料 PASS / WARNING / FAIL + 锁定
- 换料记录（带原因）
- FAI PASS 与 FAIL
- 批量执行 PASS/FAIL
- OQC 触发（PASS/FAIL）与不触发
- Trace 查询包含 loadingRecords + inspections + tracks

**命名建议**

- 产线：`SMT-A`, `SMT-B`
- 站位码：`2F-46`, `1R-14`
- 工单：`WO-YYYYMMDD-XXX`
- 批次：`RUN-WO-YYYYMMDD-XXX-01`
- 物料批次：`LOT-YYYYMMDD-XXX`
- Unit SN：`SN-${runNo}-0001`

### C. 常见问题应对

**Q: 系统能支持多大的生产规模？**
> 单机版可支持日产万件级别。如需更大规模，架构可平滑升级到分布式部署。

**Q: 和现有 ERP 如何对接？**
> 系统已实现与金蝶云星空的对接接口，支持工单、物料、BOM、路由的自动同步。其他 ERP 可通过标准接口适配。

**Q: 如果网络断了怎么办？**
> 系统支持降级模式：外部集成检查可手动录入或豁免，确保生产不中断；事后可补录数据并保留审计记录。

### D. 错误码速查表（扩展）

| 阶段 | 错误码 | 含义 | 快速恢复 |
|------|--------|------|----------|
| 上料 | RUN_NOT_FOUND | Run 不存在 | 确认 runNo 正确 |
| 上料 | RUN_NOT_IN_PREP | Run 非 PREP | 需新建 Run |
| 上料 | SLOT_MAPPING_MISSING | 站位缺少映射 | 补充映射后重试 |
| 上料 | LOADING_ALREADY_STARTED | 已开始上料 | 继续上料或走清理流程 |
| 上料 | SLOT_LOCKED | 站位已锁定 | 解锁后重试 |
| 上料 | MATERIAL_MISMATCH | 物料不匹配 | 扫正确物料 |
| 上料 | MATERIAL_LOT_NOT_FOUND | 物料批次不存在 | 检查条码或预注册批次 |
| 上料 | MATERIAL_LOT_AMBIGUOUS | 条码不唯一 | 修正批次或清理数据 |
| 上料 | SLOT_ALREADY_LOADED | 站位已上料 | 使用换料流程 |
| 上料 | BARCODE_PARSE_ERROR | 条码格式错误 | 检查格式 |
| 就绪 | READINESS_NOT_PASSED | 就绪未通过 | 修复或豁免失败项 |
| FAI | FAI_ALREADY_EXISTS | 已有未完成 FAI | 完成或取消现有 FAI |
| FAI | INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| 授权 | FAI_GATE_BLOCKED | FAI 未 PASS | 完成 FAI 且 PASS |
| 授权 | INVALID_RUN_STATUS | Run 状态不允许授权 | 确认 Run 为 PREP |
| 执行 | RUN_NOT_AUTHORIZED | Run 未授权 | 先授权 |
| 执行 | UNIT_NOT_FOUND | Unit 不存在 | 先生成 Unit |
| 执行 | UNIT_ALREADY_IN_STATION | Unit 已在站 | 先 TrackOut |
| 执行 | UNIT_NOT_IN_STATION | Unit 不在站 | 先 TrackIn |
| 执行 | STATION_NOT_IN_ROUTE | 站点不在路由中 | 检查路由配置 |
| 执行 | REQUIRED_DATA_MISSING | 必填数据缺失 | 补全采集项 |
| 执行 | DATA_VALIDATION_FAILED | 数据校验失败 | 修正数据值 |
| 执行 | DISPOSITION_REQUIRED | 失败 Unit 未处置 | 先处置 |

### E. 验证检查点清单（新增）

**Readiness**
- 6 项检查状态与数据来源一致
- Formal Check 写入记录与审计
- Waive 需要权限并记录原因

**Loading**
- load-table 生成站位期望
- PASS/WARNING/FAIL 结果一致
- 站位锁定/解锁生效
- replace 记录 REPLACED + 原因

**FAI**
- sampleQty 满足才能创建
- 试产 TrackIn/Out 完成
- PASS/FAIL 与 failedQty 规则一致
- SPI/AOI FAIL 阻断 PASS

**Execution**
- Unit 状态流转正确
- 必填数据采集阻断 TrackOut
- FAIL 触发缺陷处置

**OQC**
- 抽检规则匹配与样本数计算
- OQC PASS/FAIL 对 Run 状态影响
- MRB 决策与返修 Run 创建

**Trace**
- routeVersion 冻结一致
- tracks/dataValues/inspections/loadingRecords 可见
- 物料批次反查返回正确 SN 列表

### F. 演示脚本（主持人用）

**目标**：30-35 分钟内完整演示 SMT 闭环，必要时插入 1-2 个失败分支。

| 时间 | 演示段 | 操作要点 | 讲解要点 |
|------|--------|----------|----------|
| 0-3 min | 启动与准备 | 登录，确认 READY 路由 | 说明流程范围与角色权限 |
| 3-6 min | 工单与 Run | 下发工单、创建 Run | 解释 PREP 状态与 Readiness |
| 6-10 min | Readiness | Formal Check + 可选 Waive | 说明 6 项检查与门禁逻辑 |
| 10-15 min | 上料防错 | load-table + PASS/WARNING/FAIL | 展示锁定/解锁/换料 |
| 15-20 min | FAI | 创建/启动/试产/判定 | 强调 FAI gate 阻断 |
| 20-23 min | 授权 | 授权成功 | 说明授权前自动 Readiness |
| 23-28 min | 执行 | TrackIn/TrackOut + FAIL | 展示缺陷处置与返修 |
| 28-32 min | 收尾与 OQC | OQC PASS/FAIL + MRB | 展示三种 MRB 决策 |
| 32-35 min | 追溯 | Trace 查询 SN | 展示路由版本与记录 |

**可插入失败分支**
- 上料 FAIL → SLOT_LOCKED → 解锁后重试
- FAI FAIL → 新建 FAI 再判定
- OQC FAIL → MRB 返修 Run
