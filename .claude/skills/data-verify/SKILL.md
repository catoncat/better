---
name: data-verify
description: '快速校验用户提供的数据，在数据库和业务逻辑中寻找答案。用于回答关于站位状态、物料期望、批次信息、工单状态等 MES 数据问题。只读操作，不修改数据。'
context: fork
trigger_examples:
  positive:
    - "这个批次需要几个物料"
    - "站位状态对不对"
    - "上料表有问题吗"
    - "这个 runNo 的期望物料"
    - "物料数量对不对"
    - "为什么显示待上料"
    - "槽位期望是什么"
    - "工单状态是什么"
    - "帮我验证一下数据"
    - "这个数据正确吗"
    - "loading expectations"
    - "slot expectations"
  negative:
    - "帮我实现 XXX" # → dev
    - "修改代码" # → dev
    - "下一步做什么" # → next
    - "做到哪了" # → worktree-status
    - "演示怎么做" # → demo-qa
---

# Data Verify - 数据快速校验助手

## Goal

快速校验用户提供的 MES 数据，**用业务语言解释数据背后的逻辑**。这个 skill 的核心价值是：
1. 理解用户的业务问题
2. 查询数据库验证数据
3. **用业务逻辑解释"为什么"**
4. 给出清晰的业务结论

## 回答风格

回答应该像一个懂业务的同事在解释问题，而不是机械地输出查询结果。

### ✅ 好的回答示例

```markdown
站位表是按"产品 + 产线"过滤的

不是整条产线所有站位，而是根据以下条件筛选：

SlotMaterialMapping 筛选条件:
├── 站位属于当前产线 (lineId)
├── 匹配当前产品 (productCode) 或 通用映射
└── 匹配当前路由 (routeVersionId) 或 通用映射

你看到的 5 个站位
┌─────────┬────────────────────────┬────────────────────────────┐
│  站位   │        期望物料        │            来源            │
├─────────┼────────────────────────┼────────────────────────────┤
│ SLOT-01 │ MAT-001                │ 演示数据                   │
├─────────┼────────────────────────┼────────────────────────────┤
│ 2F-46   │ 5212090001 (+1 替代料) │ 该产品在此站位需要这个物料 │
├─────────┼────────────────────────┼────────────────────────────┤
│ 2F-34   │ 5212090007             │ 该产品在此站位需要这个物料 │
├─────────┼────────────────────────┼────────────────────────────┤
│ 1R-14   │ 5212098001             │ 该产品在此站位需要这个物料 │
├─────────┼────────────────────────┼────────────────────────────┤
│ 1F-46   │ 5212098004             │ 该产品在此站位需要这个物料 │
└─────────┴────────────────────────┴────────────────────────────┘

这 5 个站位是当前产品（工单）在这条产线上需要使用的站位，不是产线的全部站位。

逻辑解释

产线 SMT-1 (假设有 100 个站位)
    │
    ├── 产品 A (工单 WO-A) → 只用 5 个站位 → 加载后显示 5 个
    ├── 产品 B (工单 WO-B) → 用 20 个站位 → 加载后显示 20 个
    └── 产品 C (工单 WO-C) → 用 8 个站位 → 加载后显示 8 个

所以：你只需要为这 5 个站位上料（或部分/跳过），因为这是这个产品在这条线上的 BOM 需求。

---
★ Insight ─────────────────────────────────────
SlotMaterialMapping 的设计意图：
1. 同一条产线可以生产不同产品，每个产品只用到部分站位
2. 站位表加载时按 productCode + routeVersionId 筛选，只显示当前批次需要的站位
3. 这样操作员不会被无关站位干扰，防错效率更高
─────────────────────────────────────────────────
```

### ❌ 避免的回答

```markdown
数据库查询结果：
SELECT * FROM RunSlotExpectation WHERE runId = 'xxx'
...
共 5 条记录
```
这种回答没有解释业务逻辑，用户还是不明白"为什么"。

## Workflow

### 1. 理解用户的业务问题
从用户提供的数据和问题中提取：
- **核心疑问**: 用户真正想知道什么？
- **关键数据**: runNo、产品、产线、槽位列表等
- **上下文**: URL、页面截图、错误信息等

### 2. 查询数据库验证

使用 `scripts/db-query.ts` 查询数据：

```bash
# 快捷查询批次及其站位期望
bun scripts/db-query.ts --run <runNo>

# 查询产线槽位
bun scripts/db-query.ts --slot <lineId>

# 原始 SQL
bun scripts/db-query.ts "SELECT ..."
```

### 3. 用业务逻辑解释

将查询结果转化为业务解释：
- **不是**列出数据库字段
- **而是**解释这些数据代表什么业务含义
- 使用树形图、表格、流程图让解释更清晰

### 4. 给出结论和 Insight

- 直接回答用户的问题
- 解释系统设计的意图
- 如果有潜在问题，指出来

## 业务知识库

### 站位表加载逻辑

```
站位表是按"产品 + 产线"过滤的

SlotMaterialMapping 筛选条件:
├── 站位属于当前产线 (lineId)
├── 匹配当前产品 (productCode) 或 通用映射 (isCommonMaterial)
└── 匹配当前路由 (routingId) 或 通用映射 (routingId = null)

结果: RunSlotExpectation 记录
├── 每条记录 = 一个需要上料的站位
├── expectedMaterialCode = 期望物料
├── alternates = 替代料列表 (JSON 数组)
└── status = PENDING → LOADED → MISMATCH
```

**设计意图**: 同一条产线可以生产不同产品，每个产品只用到部分站位。这样操作员不会被无关站位干扰。

### 上料验证流程

```
操作员扫描物料条码
    │
    ├── 解析条码 → 提取物料代码
    │
    ├── 匹配检查
    │   ├── 匹配 expectedMaterialCode → PASS
    │   ├── 匹配 alternates 中的替代料 → PASS (WARNING 提示)
    │   └── 都不匹配 → FAIL
    │
    └── 记录结果
        ├── LoadingRecord (详细记录)
        └── 更新 RunSlotExpectation.status
```

### "+1 alt" 的含义

```
2F-46 (10)    5212090001(+1 alt)    -    待上料

表示:
├── 主物料: 5212090001
├── 替代料数量: 1 个
└── 存储位置: RunSlotExpectation.alternates (JSON 数组)

查询替代料:
SELECT alternates FROM RunSlotExpectation
WHERE slotId = '2F-46' AND runId = '<runId>'
```

### 状态含义

| 状态 | 含义 | 下一步 |
|-----|------|--------|
| PENDING | 待上料 | 需要扫描物料上料 |
| LOADED | 已上料 | 完成 |
| MISMATCH | 物料不匹配 | 需要更换正确物料 |

### Run 状态流转

```
PREP → AUTHORIZED → IN_PROGRESS → COMPLETED
 │         │             │            │
 │         │             │            └── 批次完成
 │         │             └── 正在生产
 │         └── FAI 通过，授权开始
 └── 准备阶段（上料、检查等）
```

## 常见问题模板

### Q: 为什么只显示 N 个站位？

```markdown
站位表是按"产品 + 产线"过滤的

你看到的 {N} 个站位是当前产品在这条产线上需要使用的站位，不是产线的全部站位。

筛选逻辑:
├── 产线: {lineCode}
├── 产品: {productCode}
└── 路由: {routingCode}

如果需要查看产线的全部站位:
→ 系统管理 > 产线配置 > 槽位管理
```

### Q: 为什么显示"待上料"？

```markdown
状态 "待上料" 对应数据库中的 PENDING

表示这个站位:
├── 期望物料已配置 ✓
├── 站位表已加载 ✓
└── 实际物料未上料 ←

下一步: 扫描物料条码上料
```

### Q: 替代料是什么？从哪来的？

```markdown
替代料配置来源:

SlotMaterialMapping 表
├── 主物料: isAlternate = false, priority = 1
└── 替代料: isAlternate = true, priority > 1

配置位置:
→ 系统管理 > 槽位物料映射 > 添加替代料

使用规则:
├── 主物料优先
├── 替代料可用，但会显示 WARNING 提示
└── 两者都可正常生产
```

## 数据查询参考

```bash
# 查询批次及其站位期望、上料记录
bun scripts/db-query.ts --run <runNo>

# 查询产线槽位及其物料映射
bun scripts/db-query.ts --slot <lineId>

# 查询产品的槽位映射
bun scripts/db-query.ts "
  SELECT fs.slotCode, smm.materialCode, smm.isAlternate
  FROM SlotMaterialMapping smm
  JOIN FeederSlot fs ON smm.slotId = fs.id
  WHERE smm.productCode = '<productCode>'
"

# 查询替代料
bun scripts/db-query.ts "
  SELECT alternates
  FROM RunSlotExpectation rse
  JOIN Run r ON rse.runId = r.id
  WHERE r.runNo = '<runNo>'
"
```

## Guardrails

- **只读**: 不执行任何写操作
- **业务优先**: 用业务语言解释，不是数据库术语
- **快速**: 目标是 1 分钟内给出答案
- **准确**: 基于数据库结果 + 业务逻辑回答
- **清晰**: 使用表格、树形图、流程图让解释更直观
