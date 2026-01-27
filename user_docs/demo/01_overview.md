# MES 系统概览

> 演示前必读，帮助理解系统核心概念和状态流转。

## 1. 系统能力概览

### 1.1 核心能力

| 能力 | 说明 |
|------|------|
| SMT + DIP 双产线 | 覆盖贴片与插件基本闭环 |
| 质量门禁闭环 | Readiness → 上料防错 → FAI → OQC → MRB |
| 全流程可追溯 | 单件级追溯（路由版本快照 + 过站 + 检验 + 不良处置） |
| 角色权限隔离 | 6 种角色 + 细粒度权限点 |

### 1.2 已完成里程碑

| 里程碑 | 完成时间 | 核心能力 |
|--------|----------|----------|
| M1 | 2025-12-27 | 生产执行闭环：工单 → 批次 → 过站 → 追溯 |
| M1.5-M1.8 | 2025-12-27 | ERP 集成、RBAC 权限、演示就绪 |
| M2 | 2026-01-06 | 质量控制闭环：Readiness、上料防错、FAI、缺陷处置、OQC、MRB、返修 |
| M3 | 进行中 | 准备项扩展、豁免机制、时间规则、维修管理 |

---

## 2. 核心概念速查

### 2.1 条码格式规范

| 场景 | 格式 | 示例 | 说明 |
|------|------|------|------|
| 上料扫码 | `物料编码\|批次号` | `5212090001\|LOT-20250526-001` | 竖线分隔 |
| 单件 SN | `SN-{runNo}-{序号}` | `SN-RUN-WO-001-0001` | 系统自动生成 |
| 站位码 | 机台站位 | `2F-46` | 对应 FeederSlot.code |

### 2.2 状态枚举速查

#### Run 状态

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

#### Unit 状态

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| QUEUED | 已生成 | 生成单件 SN |
| IN_STATION | 在站 | TrackIn |
| DONE | 完成 | TrackOut PASS |
| OUT_FAILED | 失败 | TrackOut FAIL |
| SCRAPPED | 报废 | 处置为报废 |

#### FAI 状态

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| PENDING | 待启动 | 创建 FAI |
| INSPECTING | 检验中 | 启动 FAI |
| PASS | 通过 | 完成判定 PASS |
| FAIL | 失败 | 完成判定 FAIL |

#### OQC 状态

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| PENDING | 待启动 | OQC 自动创建 |
| INSPECTING | 抽检中 | 启动 OQC |
| PASS | 通过 | 完成判定 PASS |
| FAIL | 失败 | 完成判定 FAIL |

### 2.3 上料验证结果

| 结果 | UI 显示 | 含义 | 后续操作 |
|------|---------|------|----------|
| PASS | 绿色对勾 | 扫码物料 = 期望物料 | 继续下一站位 |
| WARNING | 黄色警告 | 扫码物料 = 替代料 | 可接受，需关注 |
| FAIL | 红色叉号 | 物料不匹配 | 重新扫正确物料 |

> **站位锁定**：同一站位连续 3 次 FAIL 会触发自动锁定，需班组长解锁。

---

## 3. 流程对照

本指南用于"按规范走完一次流程"，验证当前实现的交互链路是否闭环：

- 端到端闭环：`domain_docs/mes/spec/process/01_end_to_end_flows.md`
- SMT 流程：`domain_docs/mes/spec/process/03_smt_flows.md`
- DIP 流程：`domain_docs/mes/spec/process/04_dip_flows.md`

> **提示**：文档里提到的"产前检查"对应系统中的 Readiness（就绪检查），入口在 Run 详情页 `/mes/runs/{runNo}`。

---

## 4. 新增功能说明（M3）

### 4.1 准备检查项扩展

| 检查项 | 说明 | 数据来源 |
|--------|------|----------|
| PREP_BAKE | PCB 烘烤确认 | BakeRecord |
| PREP_PASTE | 锡膏准备 | 锡膏批次状态 |
| PREP_STENCIL_CLEAN | 钢网清洗准备 | StencilCleaningRecord |
| PREP_SCRAPER | 刮刀点检准备 | SqueegeeUsageRecord |
| PREP_FIXTURE | 夹具寿命准备 | FixtureUsageRecord |
| PREP_PROGRAM | 炉温程式一致性 | ReflowProfile |
| TIME_RULE | 时间规则状态 | TimeRuleInstance |

### 4.2 豁免机制

当准备检查项失败但生产需要继续时，可进行豁免：
- 需要 `prep:waive` 或 `time_rule:override` 权限
- 必须填写豁免原因
- 豁免记录保留完整审计追踪

### 4.3 FAI 签字

FAI 判定 PASS 后需要签字确认：
- 需要 `fai:sign` 权限
- 未签字无法授权 Run
- 签字记录包含签字人、时间、备注

### 4.4 时间规则

监控时效性要求：
- 锡膏暴露时间：24 小时限制
- 水洗时间：4 小时限制（如路由配置）

### 4.5 维修管理

记录和跟踪设备/夹具/钢网维修：
- 维修状态流转：PENDING → IN_PROGRESS → COMPLETED → VERIFIED
- 维修中的实体会导致 Readiness 检查失败
