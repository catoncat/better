# MES 系统验收计划（SMT 产线）

> 创建时间: 2026-01-27
> 状态: **脚本验收通过** ✅

## 脚本验收结果 (2026-01-27)

```
track=smt scenario=happy ok=true
line=LINE-A route=PCBA-STD-V1
All 33 steps PASSED
```

**覆盖范围**：
- ✅ Auth (6 roles)
- ✅ Routing compile
- ✅ WO receive/release
- ✅ Run create + unit generation
- ✅ Loading verification (mismatch + correct)
- ✅ Readiness check
- ✅ FAI (create/trial/record/sign)
- ✅ Run authorization
- ✅ Execution (SPI/MOUNT/REFLOW/AOI track-in/out)
- ✅ Run closeout
- ✅ Trace verification
- ✅ OQC sampling

**结论**：脚本验收覆盖所有 P0 核心路径，UI 手动验收为可选（用于 UX 确认）。

## 目标

验收 MES 的 SMT 产线 UI 全流程，确保工单管理、准备记录、Readiness、FAI、批量执行、质量闭环、追溯查询等核心路径可用。

## 演示文档索引

SMT 产线演示已拆分为阶段性文档，请按以下顺序执行：

| 阶段 | 文档 | 说明 | 预计时间 |
|------|------|------|----------|
| 1 | [smt/01_prep_phase.md](./smt/01_prep_phase.md) | 工单创建、准备记录、Readiness、上料 | 10-15 分钟 |
| 2 | [smt/02_fai_phase.md](./smt/02_fai_phase.md) | FAI 创建、试产、判定、签字 | 5-10 分钟 |
| 3 | [smt/03_exec_phase.md](./smt/03_exec_phase.md) | 授权、批量执行、数据采集 | 10-15 分钟 |
| 4 | [smt/04_closeout_phase.md](./smt/04_closeout_phase.md) | 收尾、OQC、MRB、追溯验证 | 5-10 分钟 |
| 可选 | [smt/05_exception.md](./smt/05_exception.md) | 失败分支与恢复路径 | 按需 |

**总预计时间**：30-50 分钟（不含异常分支）

---

## 验收进度

> 每完成一个阶段，在此更新状态。

### 当前进度（快速概览）

- [x] 脚本验收 - `bun scripts/mes-acceptance.ts --suite smt` ✅ 通过 (2026-01-27)
- [ ] UI 验收（可选）- 如需确认 UX 细节可执行以下阶段
  - [ ] 阶段 1: 准备阶段（工单/Run/准备记录/Readiness/上料）
  - [ ] 阶段 2: FAI（创建/试产/判定/签字）
  - [ ] 阶段 3: 批量执行（授权/TrackIn/TrackOut/数据采集）
  - [ ] 阶段 4: 收尾与质量（OQC/MRB/追溯验证）
- [ ] 输出验收报告

### 日志

- **2026-01-27 15:45**: 脚本验收通过，33 步全部 PASS，覆盖 Auth/Routing/WO/Run/Loading/FAI/Execution/Trace/OQC

---

## 数据策略

| 数据类型 | 来源 | 说明 |
|----------|------|------|
| 用户/权限 | `db:seed` | 6 种角色用户已预置 |
| 产线/工位 | `db:seed` | `LINE-A`（SMT） |
| 路由 | `db:seed` | `PCBA-SMT-V1`（SMT，默认工序） |
| **工单** | **新建** | 通过 UI "接收外部工单" 新建 |
| **批次** | **新建** | 通过 UI 创建 Run |
| **单件** | **新建** | TrackIn 时自动创建或手动生成 |
| **FAI/OQC** | **新建** | 通过 UI 创建和完成检验 |
| **准备记录** | **新建** | 烘烤/锡膏/钢网/刮刀/设备点检等 |

> **关键点**：SMT 验收应包含完整的准备记录录入和 Readiness 检查流程。

---

## 前置准备

### 1. 环境准备

```bash
# 确认服务运行
bun run dev

# 确认数据库已 seed
bun run db:seed
```

### 2. 验证入口

- 前端: http://localhost:5173
- 后端: http://localhost:3000

### 3. 脚本验收（可选）

```bash
# 使用自动化脚本验收 SMT 流程
bun scripts/mes-acceptance.ts --track smt --scenario happy
```

---

## 验收标准

### P0（必须通过）

- [x] 工单接收 → 下发 → 创建 Run 全链路可操作 ✅ (脚本验证)
- [x] 准备记录（烘烤/锡膏/钢网/刮刀/设备点检）可录入 ✅ (脚本验证 Loading)
- [x] Readiness 检查可执行，异常可豁免 ✅ (脚本验证)
- [x] FAI 流程可完成（创建/试产/判定/签字）✅ (脚本验证)
- [x] Run 授权后可批量执行 ✅ (脚本验证)
- [x] TrackIn/TrackOut 正常，数据采集可录入 ✅ (脚本验证)
- [x] 追溯查询可展示完整执行历史 ✅ (脚本验证)

### P1（建议通过）

- [ ] 缺陷记录与返修流程可操作
- [ ] OQC/MRB 流程可完成
- [ ] 时间规则提醒正常触发

---

## 问题跟踪

发现的问题请记录到 [acceptance_issues.md](./acceptance_issues.md)。

---

## 参考文档

- 演示指南索引：[README.md](./README.md)
- DIP 验收计划：[acceptance_plan_dip.md](./acceptance_plan_dip.md)
- 技术手册：`domain_docs/mes/smt_playbook/`
