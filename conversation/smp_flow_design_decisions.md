# SMP 流程设计决策记录

> **日期**: 2025-01-03
> **状态**: 已决策
> **相关文档**: `domain_docs/mes/spec/process/03_smp_flows_v2.md`

---

## 决策 1：OQC 不合格 → 原 Run 状态

### 问题描述

**流程图 (v2.3:163)**：
```
OQC不合格 → MRB返修 → 原RUN=COMPLETED
```

**状态表 (v2.3:459)**：
```
| 完工 | COMPLETED | 批次完成 + OQC 通过 |
```

**冲突**：OQC 失败的批次标记为 COMPLETED，但 COMPLETED 的定义要求 OQC 通过。

### 选项对比

| 维度 | A: CLOSED_REWORK | B: COMPLETED + reason | C: ON_HOLD 直到返修完成 |
|------|------------------|----------------------|----------------------|
| **状态语义清晰度** | ✅ 高 | ⚠️ 中 | ✅ 高 |
| **状态机复杂度** | +1 状态 | 无变化 | +关联逻辑 |
| **查询简单性** | ✅ 直接按状态 | ⚠️ 需组合条件 | ⚠️ 需考虑关联 |
| **报表影响** | ✅ 分类清晰 | ⚠️ 需解释 reason | ✅ 分类清晰 |
| **实现难度** | 中 | 低 | 高 |
| **闭环性** | 原 Run 终结 | 原 Run 终结 | 原 Run 等待 |
| **适用场景** | 返修是独立批次 | 返修是补充动作 | 返修是原批次延续 |

### 决策

**选择：选项 A - 引入新终态 `CLOSED_REWORK`**

**状态图变化：**
```
                                    ┌→ COMPLETED (OQC 通过/放行)
IN_PROGRESS → ON_HOLD (OQC失败) → MRB决策 → CLOSED_REWORK (返修)
                                    └→ SCRAPPED (报废)
```

**数据模型变化：**
```prisma
enum RunStatus {
  PREP
  AUTHORIZED
  RUNNING           // 现有
  FINISHING         // 现有
  ON_HOLD           // 新增 M2
  COMPLETED         // 语义：生产成功完成
  CLOSED_REWORK     // 新增 M2：生产完成但有返修
  SCRAPPED          // 新增 M2
  CANCELLED
}
```

**理由：**
- 状态语义清晰：COMPLETED = 成功，CLOSED_REWORK = 有返修
- 便于统计报表：直接按状态筛选"成功率"
- 不会误导用户认为"返修批次=正常完成"
- 审计追溯明确

---

## 决策 2：返修 Run FAI 规则

### 问题描述

**API 合同 (02_api_contracts_execution.md:175-176)**：
```
Routing Engine guard:
* If a step requires FAI, Track/ingest must reject until the latest FAI for the run is PASS.
* Run authorization uses the same rule and returns FAI_NOT_PASSED when blocked.
```

**SMP 流程 v2.3:165**：
```
RW_GATE -- "复用就绪" --> RW_AUTH["返修Run=AUTHORIZED (MRB授权)"]
```

**冲突**：复用就绪的返修 Run 直接 AUTHORIZED，绕过了 FAI 检查。

### 选项对比

| 维度 | A: MRB 豁免 | B: 继承 FAI | C: 严格模式 | D: 按工序配置 |
|------|------------|------------|------------|--------------|
| **灵活性** | ✅ 高 | ⚠️ 中 | ❌ 低 | ⚠️ 中 |
| **审计性** | ✅ 记录原因 | ✅ 有 FAI 记录 | ✅ 强制执行 | ⚠️ 配置驱动 |
| **实现复杂度** | 中 | 中 | 低 | 高 |
| **符合工厂实际** | ✅ 是 | ⚠️ 部分 | ❌ 否 | ✅ 是 |
| **MRB 权限** | ✅ 保留 | ❌ 无需 | ❌ 无权 | ❌ 预配置 |
| **质量风险** | ⚠️ 依赖 MRB 判断 | ⚠️ 继承可能过期 | ✅ 无 | ⚠️ 配置可能不当 |

### 决策

**选择：选项 A - MRB 可豁免 FAI（需记录原因）**

**数据模型变化：**
```prisma
model Run {
  // 现有字段
  status           RunStatus

  // 新增字段 (M2)
  parentRunId      String?       // 返修 Run 指向原 Run
  reworkType       ReworkType?   // REUSE_PREP | FULL_PREP
  authorizationType AuthorizationType? // NORMAL | MRB_OVERRIDE
  mrbDecisionId    String?       // 关联 MRB 决策记录
  mrbFaiWaiver     Boolean?      // MRB 是否豁免 FAI
  mrbWaiverReason  String?       // 豁免原因
}

enum ReworkType {
  REUSE_PREP    // 复用就绪
  FULL_PREP     // 重新检查
}

enum AuthorizationType {
  NORMAL        // 常规授权（需 FAI）
  MRB_OVERRIDE  // MRB 授权（可豁免）
}
```

**授权逻辑变化：**
```typescript
async function authorizeRun(db, runNo, options?: { mrbOverride?: MrbOverrideOptions }) {
  // 常规授权：必须 FAI
  if (!options?.mrbOverride) {
    const faiResult = await checkFaiGate(db, runNo);
    if (faiResult.data.requiresFai && !faiResult.data.faiPassed) {
      return { code: "FAI_NOT_PASSED" };
    }
  }
  // MRB 授权：可豁免 FAI
  else {
    if (!options.mrbOverride.faiWaiver) {
      // MRB 未豁免 FAI，仍需检查
      const faiResult = await checkFaiGate(db, runNo);
      if (faiResult.data.requiresFai && !faiResult.data.faiPassed) {
        return { code: "FAI_NOT_PASSED" };
      }
    }
    // 记录豁免信息
    await db.run.update({
      where: { runNo },
      data: {
        authorizationType: "MRB_OVERRIDE",
        mrbFaiWaiver: options.mrbOverride.faiWaiver,
        mrbWaiverReason: options.mrbOverride.waiverReason,
      }
    });
  }
}
```

**API 变化：**
```typescript
// 返修 Run 创建 API
POST /api/runs/{runNo}/rework
{
  reworkType: "REUSE_PREP" | "FULL_PREP",
  mrbDecisionId: "MRB-001",
  faiWaiver: true,              // MRB 是否豁免 FAI
  waiverReason: "工艺参数微调，物料设备无变更"
}

// 返回
{
  ok: true,
  data: {
    runNo: "RUN-001-RW1",
    status: "AUTHORIZED",       // 复用就绪直接授权
    authorizationType: "MRB_OVERRIDE",
    mrbFaiWaiver: true
  }
}
```

**理由：**
- 符合工厂实际操作
- 保留 MRB 决策权
- 通过记录原因保证可追溯性
- 建议增加权限控制：只有 MRB 角色可使用豁免功能

---

## 附带修复

### 幂等性规范不一致

**问题**：原则写"Idempotency-Key 或 eventId"，但接口都标 required。

**修复**：统一为只用 `eventId` 作为业务幂等键，删除 `Idempotency-Key: required` 注释。

### 就绪检查 M1 vs 集成接口 M2

**问题**：就绪检查模块标 M1 但钢网/锡膏接口标 M2，容易混淆。

**修复**：拆分表述
```
| 就绪检查框架 | MES 核心 | 检查项配置、卡控逻辑 | M1 ✅ |
| 就绪检查-手动录入 | MES 核心 | 手动确认界面 | M1 ✅ |
| 就绪检查-TPM/WMS集成 | 🔌 集成 | 钢网/锡膏自动推送 | M2 ⬜ |
```
