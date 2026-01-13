# DIP 流程整合总结

> **日期**: 2026-01-06
> **状态**: 架构对齐完成
> **关键决策人**: 技术团队

---

## 同事反馈的核心问题

你的同事提出了两个关键的架构对齐问题：

### 1. 多次"首件/授权"是否要做成"卡控 gate"？

**问题描述**：
- 现有 FAI 是 Run 级别的一次性 gate（`activeKey = ${runId}:FAI`）
- DIP 流程图有多个段首件：插件段、后焊段、测试段
- 如果都要卡控，需要扩展为工序段级别的 FAI

**最终决策**：
- ✅ **Run 级 FAI** = **仅一次**（强卡控，发生在路由第一段首件）
- ✅ **DIP 段首件** = **IPQC**（规划：用于记录/提示，不作为 Run 授权 gate）

**决策理由**：
1. 系统架构约束：现有 FAI 机制无法支持多段卡控
2. 业务合理性：DIP 插件段首件属于“开工前检查”，但在 SMT+DIP 同 Run 场景下更适合作为 IPQC 记录/提示；强卡控仍由路由第一段的 FAI 承担
3. 语义准确性：IPQC（In-Process Quality Control）本就是"过程质量控制"

### 2. SMT 和 DIP 要不要同一个 SN 串在同一个 Run 里？

**问题描述**：
- 现有 `Unit.sn` 唯一约束 + `Unit.runId` 单值
- 同一个 SN 不能同时属于两个 Run（会报 `UNIT_RUN_MISMATCH`）

**最终决策**：
- ✅ **SMT + DIP 作为同一 Run 的不同工序段**（Option A）

**决策理由**：
1. 避免数据结构改造（无需 Unit-Run 多对多关系）
2. 符合 MES 标准实践（同一路由包含多个工序段）
3. 简化追溯逻辑（同一个 Run 从头到尾完整追溯）

---

## 修改后的 DIP 流程设计

### 工序段划分

| 工序段 | stepNo 范围 | 关键工序 | 检查类型 | 实现方式 |
|--------|-----------|---------|---------|---------|
| SMT | 10-50 | 钢网准备、锡膏印刷、贴片、回流焊 | FAI | `Inspection.type = FAI` |
| DIP-1 | 110-130 | AI辅助插件、手工插件、炉前AOI | IPQC（规划） | `Inspection.type = IPQC, activeKey = run-xxx:IPQC:120` |
| DIP-2 | 140-150 | 助焊剂涂覆、波峰焊接、炉后AOI | - | - |
| DIP-3 | 160-170 | 手工焊接、剪脚、三防漆喷涂、外观检查 | IPQC | `Inspection.type = IPQC, activeKey = run-xxx:IPQC:160` |
| DIP-4 | 180-190 | ICT测试、FCT测试 | IPQC | `Inspection.type = IPQC, activeKey = run-xxx:IPQC:180` |

### FAI vs IPQC 对比

| 维度 | FAI（Run 级首件） | IPQC（段首件） |
|------|----------------|---------------------|
| 语义 | First Article Inspection（批次首件） | In-Process Quality Control（过程质量控制） |
| 卡控力度 | **强卡控**：不通过则 Run 无法授权 | **软卡控**：不通过记录不良，可选择暂停或继续 |
| Run 状态影响 | PREP → AUTHORIZED | 不影响 Run 状态 |
| 数据库实现 | `Inspection.type = FAI` | `Inspection.type = IPQC` |
| activeKey | `${runId}:FAI` | `${runId}:IPQC:${stepNo}` |
| 创建时机 | Run 创建后，PREP 状态 | 执行到特定 stepNo 时 |
| 多次检验 | 同一 Run 只有 1 次 FAI | 同一 Run 可以有多个 IPQC（按 stepNo 区分） |

---

## 执行时序示例

```
1. 创建 Run（包含 SMT + DIP 完整路由）
   Run.status = PREP
   Unit.sn = "SN001", Unit.runId = "run-xxx"

2. SMT 首件检查（stepNo=30）
   POST /api/fai/run/:runNo
   → FAI 通过 → Run.status = AUTHORIZED

3. SMT 批量生产（stepNo=30-50）
   TrackIn/Out → 所有 UNIT 完成 stepNo=50

4. DIP 插件首件检查（stepNo=110）
   如果需要独立验证（规划）：
   POST /api/ipqc/run/:runNo
   { "stepNo": 120, "stepGroup": "DIP-1", "checkType": "DIP_INSERTION_FIRST_PIECE", "unitSn": "SN001" }
   → IPQC 通过 → 允许批量插件

5. DIP 批量生产（stepNo=110-190）
   - stepNo=160（后焊）：创建 IPQC，通过后继续
   - stepNo=180（测试）：创建 IPQC，通过后继续

6. Run 完成
   Run.status = IN_PROGRESS → COMPLETED（或触发 OQC）
```

---

## 需要实现的工作

### 1. 后端 API（新增 IPQC 服务）

```typescript
// apps/server/src/modules/mes/ipqc/service.ts
export async function createIpqc(...)
export async function recordIpqcItem(...)
export async function completeIpqc(...)
export async function listIpqc(...)
```

**端点**：
- `POST /api/ipqc/run/:runNo` - 创建 IPQC 任务（规划）
- `POST /api/ipqc/:inspectionId/start` - 开始检验（规划）
- `POST /api/ipqc/:inspectionId/items` - 记录检验项（规划）
- `POST /api/ipqc/:inspectionId/complete` - 完成检验（规划）
- `GET /api/ipqc/run/:runNo` - 查询 IPQC（规划）

### 2. 前端界面

- DIP 后焊首件检验页面（stepNo=160）
- DIP 测试首件检验页面（stepNo=180）
- IPQC 检验记录列表
- IPQC 检验项详情展示

### 3. 路由配置

- 创建 SMT_DIP_V1 路由模板
- 仅在路由第一段设置 `requiresFAI`；工序段首件用 `RoutingStep.meta.requiresIPQC`（规划字段）

### 4. 数据库（无需改动）

- 现有 `Inspection` 表已支持 IPQC 类型
- `activeKey` 字段已存在，只需调整生成逻辑

---

## 文档更新状态

| 文档 | 状态 | 说明 |
|------|------|------|
| `conversation/new_flow_waiting_review.md` | ✅ 已修复 | 补全流程闭环，统一分支标注 |
| `domain_docs/mes/spec/process/04_dip_flows.md` | ✅ 已对齐 | Run 级 FAI + 段首件 IPQC（规划）+ OQC/MRB 对齐实现 |
| `domain_docs/mes/spec/process/01_end_to_end_flows.md` | ✅ 已更新 | 添加 DIP 引用 |
| `domain_docs/mes/spec/process/02_state_machines.md` | ⚠️ 需更新 | 移除"多段 FAI"章节，添加 IPQC 说明 |
| `conversation/dip_architecture_alignment.md` | ✅ 已创建 | 完整的架构对齐说明文档 |

---

## 总结

通过以下两个关键决策，成功将 DIP 流程融入现有 MES 架构：

1. **Run 级 FAI（一次）+ DIP 段首件 IPQC（规划）** → 避免了多段 FAI 卡控的复杂改造
2. **SMT + DIP 作为同一 Run 的不同工序段** → 避免了 Unit-Run 多对多关系的数据结构改造

这个方案既满足了 DIP 流程的质量管理需求，又最大程度复用了现有系统架构，是一个务实的工程决策。

---

## 下一步行动

1. **更新 02_state_machines.md**：补充“段首件 IPQC（规划）”说明，避免误解为多段 FAI
2. **实现 IPQC 服务**：按照 `conversation/dip_architecture_alignment.md` 中的 API 设计实现
3. **实现前端界面**：DIP 段首件检验页面（插件/后焊/测试）
4. **创建路由模板**：SMT_DIP_V1 完整路由配置（含 `RoutingStep.meta.stepGroup` 与 `meta.requiresIPQC`）
5. **配置 OQC 抽样规则**：为 DIP routing 创建 `OqcSamplingRule`（与 SMT 一致）
