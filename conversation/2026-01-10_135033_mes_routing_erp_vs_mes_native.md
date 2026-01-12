# MES 工艺路线讨论：ERP路由 vs MES原生路由

> **时间**: 2026-01-10
> **主题**: 金蝶ERP工艺路线粒度不足，MES如何支持细化工序

---

## Context（背景）

用户反馈：
> 考虑到金蝶ERP的工艺路线目前只有"大工序"而无法达到更细节的工艺路线，将来我们的工艺路线可以直接在我们现在开发的MES里面建立和调用吗？

核心问题：ERP只有粗粒度工序（如"SMT"），无法满足车间执行需要的细粒度（如：印刷→SPI→贴片→回流焊→AOI）。

---

## Decisions（结论）

### 1. 当前设计支持两种路由来源

| 模式 | 工序来源 | 与ERP关系 |
|------|----------|-----------|
| ERP导入 | 金蝶的大工序（只读） | 保持关联 |
| MES原生 | MES自己定义细工序 | 独立管理 |

数据都存在**同一套表**（`Routing` + `RoutingStep`），通过 `sourceSystem` 字段区分来源。

### 2. ERP路由无法满足的原因

数据库实际数据对比：

**ERP路由（如1007924）**：
```
步骤10: SMT        ← 只有1个步骤
步骤20: 后加料
步骤30: 测试
...共9个步骤
```

**MES自建路由（如PCBA-STD-V1）**：
```
步骤1: 印刷 (PRINTING)
步骤2: SPI检测
步骤3: 贴片 (MOUNTING)
步骤4: 回流焊 (REFLOW)
步骤5: AOI检测
...共5个细步骤，只覆盖SMT
```

ERP的"SMT"是1个工序，而流程图（`03_smt_flows.md`）需要细化到5+个步骤。**金蝶做不到这个粒度**。

### 3. MES原生路由的隐患

| 隐患 | 说明 |
|------|------|
| 主数据分裂 | ERP和MES各自维护，可能不同步 |
| 成本核算偏差 | ERP按大工序算成本，MES按细工序记录 |
| 维护负担 | 两处维护，变更容易遗漏 |
| 报工回传 | MES细工序需要映射回ERP大工序 |

### 4. 解决方案：MES细工序映射回ERP大工序

在 `RoutingStep` 上增加字段，标记它对应ERP的哪个工序：

```
RoutingStep:
  stepNo: 1
  operation: 印刷
  erpStepKey: "ERP:1007924:10"   ← 对应ERP的SMT工序
```

报工回传时，将多个细工序的执行数据汇总到ERP的大工序。

---

## 执行配置（RouteExecutionConfig）的本质

### 误解澄清

执行配置**不能**把1个工序拆成多个细工序。它的作用是：**定义一个工序怎么执行**，而不是拆分工序。

### 执行配置的作用

| 配置项 | 说明 |
|--------|------|
| `stationType` | 执行方式（MANUAL/AUTO/BATCH/TEST） |
| `stationGroupId` | 允许的工位组 |
| `allowedStationIds` | 允许的具体工位 |
| `requiresFAI` | 是否需要首件 |
| `requiresAuthorization` | 是否需要授权 |
| `dataSpecIds` | 数据采集项 |
| `ingestMapping` | 自动上报映射 |

### 不配置执行配置会怎样？

**可以正常运行**。因为 `RoutingStep` 本身有默认值：
- `stationType` → 默认值
- `stationGroupId` → 可在步骤上直接设置
- `requiresFAI` → 默认 false

编译时取值优先级：`执行配置 > 步骤默认值`

执行配置是**可选的覆盖层**，用于：
1. 覆盖默认值
2. 添加额外约束（数据采集、授权、ingest映射）
3. 支持不同粒度配置（路由级 vs 步骤级）

---

## Open Questions（待定）

1. 是否需要实现 `erpStepKey` 字段来建立MES细工序与ERP大工序的映射？
2. 前端"自建路由"功能的具体交互设计？
3. 报工回传的汇总逻辑如何实现？

---

## References（参考）

- `domain_docs/mes/spec/routing/01_routing_engine.md` — 路由引擎设计
- `domain_docs/mes/tech/db/01_prisma_schema.md` — 数据模型
- `domain_docs/mes/spec/process/03_smt_flows.md` — SMT流程图
- `domain_docs/mes/spec/process/04_dip_flows.md` — DIP流程图
- `apps/server/src/modules/mes/routing/service.ts` — 路由服务实现
