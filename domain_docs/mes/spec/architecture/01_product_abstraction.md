# MES 产品化通用技术方案

> 更新时间：2026-01-20
> 状态：设计文档（现阶段仅文档探索，不改代码）
> 关联决策：[MES 产品化架构决策](../../../../conversation/2026-01-20_094100_MES产品化架构决策.md)

## 1. 目标

设计可复用的抽象模型，为将来产品化做准备。核心挑战：如何将 SMT 行业特定的表抽象为通用模型，使系统能够适配不同行业客户（DIP、组装、测试等）。

---

## 2. 现状分析

### 2.1 现有通用化机制 ✓

| 机制 | 用途 | 成熟度 |
|------|------|--------|
| `DataCollectionSpec` + `DataValue` | 通用数据采集（工艺参数、测量值） | ✅ 成熟 |
| `ReadinessCheck` + `ReadinessCheckItem` | 产线准备检查（阻断/放行） | ✅ 成熟 |
| `meta Json?` 字段 | 扩展预留 | ✅ 已预埋 |

### 2.2 SMT 特定表（需抽象）

| 表名 | 当前模式 | 抽象方向 |
|------|----------|----------|
| `StencilStatusRecord` | 资源生命周期事件 | → `ResourceStatusLog` |
| `SolderPasteStatusRecord` | 资源生命周期事件 | → `ResourceStatusLog` |
| `LineStencil` | 产线-资源绑定 | → `LineResourceBinding` |
| `LineSolderPaste` | 产线-资源绑定 | → `LineResourceBinding` |
| `BakeRecord` | 时段型工艺记录 | → `ProcessRecord` |

---

## 3. 通用抽象模型设计

### 3.1 ResourceStatusLog（资源生命周期事件）

**合并对象**：`StencilStatusRecord`, `SolderPasteStatusRecord`, 未来的刮刀/夹具状态等

**设计原理**：
- 不同类型的资源（钢网、锡膏、刮刀、夹具）都有生命周期事件
- 事件结构相似：时间戳 + 状态变更 + 操作人 + 来源
- 差异在于具体的状态值和扩展字段 → 用 `payload Json` 存储

```prisma
model ResourceStatusLog {
  id            String   @id @default(cuid())

  // ─── 资源标识 ───
  resourceType  ResourceType  // STENCIL, SOLDER_PASTE, SQUEEGEE, FIXTURE...
  resourceId    String        // 具体资源 ID（如钢网编号、锡膏批次号）

  // ─── 事件信息 ───
  eventId       String   @unique
  eventTime     DateTime
  eventType     String        // 状态变更类型（如 THAWED, STIRRED, MOUNTED, CLEANED）
  status        String        // 当前状态快照

  // ─── 来源与操作 ───
  source        IntegrationSource  // AUTO, MANUAL, ERP
  operatorId    String?

  // ─── 扩展数据（不同资源类型有不同字段）───
  payload       Json?   // { tensionValue, expiresAt, thawedAt, usageCount... }

  receivedAt    DateTime @default(now())

  @@index([resourceType, resourceId])
  @@index([eventTime])
}

enum ResourceType {
  STENCIL
  SOLDER_PASTE
  SQUEEGEE
  FIXTURE
  REFLOW_PROFILE
  // 可扩展...
}
```

**优势**：
- 统一的事件查询 API（按资源类型筛选）
- 新增资源类型只需扩展 enum + payload schema
- 保留完整的状态历史链

**映射关系**：

| 旧表字段 | ResourceStatusLog 字段 |
|----------|------------------------|
| `stencilId` / `lotId` | `resourceId` |
| `status` (enum) | `status` (string) |
| `tensionValue`, `lastCleanedAt` | `payload.tensionValue`, `payload.lastCleanedAt` |
| `expiresAt`, `thawedAt`, `stirredAt` | `payload.expiresAt`, `payload.thawedAt`, `payload.stirredAt` |

---

### 3.2 LineResourceBinding（产线-资源绑定）

**合并对象**：`LineStencil`, `LineSolderPaste`, 未来的产线-夹具绑定等

**设计原理**：
- 产线在任一时刻绑定特定资源（钢网、锡膏）
- 绑定/解绑有时间记录和操作人
- `isCurrent` 标记当前有效绑定

```prisma
model LineResourceBinding {
  id            String   @id @default(cuid())

  // ─── 绑定关系 ───
  lineId        String
  resourceType  ResourceType  // STENCIL, SOLDER_PASTE, SQUEEGEE...
  resourceId    String        // 具体资源 ID

  // ─── 生命周期 ───
  isCurrent     Boolean  @default(true)
  boundAt       DateTime @default(now())
  boundBy       String?
  unboundAt     DateTime?
  unboundBy     String?

  // ─── 扩展数据 ───
  meta          Json?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  line          Line @relation(fields: [lineId], references: [id])

  @@unique([lineId, resourceType, resourceId, boundAt])
  @@index([lineId, resourceType, isCurrent])
  @@index([resourceId])
}
```

**优势**：
- 统一的"当前产线资源"查询
- ReadinessCheck 可以通过 `resourceType` 动态检查
- 新增资源类型无需新建表

**映射关系**：

| 旧表 | LineResourceBinding 映射 |
|------|-------------------------|
| `LineStencil.stencilId` | `resourceId` (resourceType=STENCIL) |
| `LineSolderPaste.lotId` | `resourceId` (resourceType=SOLDER_PASTE) |

---

### 3.3 ProcessRecord（时段型工艺记录）

**合并对象**：`BakeRecord`, 未来的回流焊曲线记录、老化测试记录等

**设计原理**：
- 工艺记录有开始/结束时间窗口
- 关联到不同目标（Run、物料批次、单板）
- 不同工艺有不同参数 → 用 `params Json` 存储

```prisma
model ProcessRecord {
  id            String   @id @default(cuid())

  // ─── 工艺类型 ───
  processType   ProcessType  // BAKE, REFLOW, AGING, WAVE_SOLDER...

  // ─── 关联对象 ───
  targetType    TargetType   // RUN, MATERIAL_LOT, UNIT...
  targetId      String

  // ─── 时间窗口 ───
  startAt       DateTime
  endAt         DateTime?

  // ─── 工艺参数（不同类型有不同参数）───
  params        Json    // { temperature, duration, profile, qty... }

  // ─── 操作人员 ───
  startBy       String
  endBy         String?
  confirmedBy   String?

  // ─── 扩展 ───
  meta          Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([processType, targetType, targetId])
  @@index([startAt])
  @@index([endAt])
}

enum ProcessType {
  BAKE
  REFLOW
  AGING
  WAVE_SOLDER
  CLEANING
  // 可扩展...
}

enum TargetType {
  RUN
  MATERIAL_LOT
  UNIT
  CARRIER
  // 可扩展...
}
```

**优势**：
- 统一的工艺记录查询（按类型、目标筛选）
- `params` Json 存储不同工艺的特定参数
- 时间窗口规则可统一校验

**映射关系**：

| BakeRecord 字段 | ProcessRecord 映射 |
|-----------------|-------------------|
| `runId`, `materialLotId` | `targetType` + `targetId` |
| `inAt`, `outAt` | `startAt`, `endAt` |
| `inBy`, `outBy` | `startBy`, `endBy` |
| `itemCode`, `bakeProcess`, `bakeQty`, `bakeTemperature`, `durationHours` | `params` Json |

---

## 4. JSON Schema 规范（payload/params）

### 4.1 ResourceStatusLog.payload

```typescript
// ─── Stencil payload ───
interface StencilPayload {
  version?: string;
  tensionValue?: number;
  lastCleanedAt?: string; // ISO datetime
  usageCount?: number;
  maxUsageLimit?: number;
}

// ─── SolderPaste payload ───
interface SolderPastePayload {
  expiresAt?: string;      // 失效时间
  thawedAt?: string;       // 解冻时间
  warmedAt?: string;       // 回温时间
  stirredAt?: string;      // 搅拌时间
  openedAt?: string;       // 开封时间
  exposureMinutes?: number;
  maxExposureMinutes?: number;
}

// ─── Squeegee payload ───
interface SqueegePayload {
  usageCount: number;
  maxUsageLimit: number;
  lastInspectedAt?: string;
}

// ─── Fixture payload ───
interface FixturePayload {
  usageCount: number;
  maxUsageLimit: number;
  calibratedAt?: string;
  nextCalibrationAt?: string;
}
```

### 4.2 ProcessRecord.params

```typescript
// ─── Bake params ───
interface BakeParams {
  itemCode: string;         // 物料编码
  bakeProcess: string;      // 工艺名称
  bakeQty: string;          // 烘烤数量
  bakeTemperature?: number; // 温度 (°C)
  durationHours?: string;   // 时长
}

// ─── Reflow params ───
interface ReflowParams {
  profileId: string;
  profileName?: string;
  peakTemp: number;         // 峰值温度
  rampRate: number;         // 升温速率
  zones: {
    zoneId: number;
    temp: number;
    duration: number;
  }[];
}

// ─── Aging params ───
interface AgingParams {
  temperature: number;
  humidity?: number;
  durationHours: number;
}

// ─── Wave Solder params ───
interface WaveSolderParams {
  preHeatTemp: number;
  solderPotTemp: number;
  conveyorSpeed: number;
}
```

### 4.3 Zod Schema 示例（运行时校验）

```typescript
import { z } from 'zod';

// ResourceStatusLog payload schemas
export const stencilPayloadSchema = z.object({
  version: z.string().optional(),
  tensionValue: z.number().optional(),
  lastCleanedAt: z.string().datetime().optional(),
  usageCount: z.number().int().nonnegative().optional(),
  maxUsageLimit: z.number().int().positive().optional(),
});

export const solderPastePayloadSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  thawedAt: z.string().datetime().optional(),
  warmedAt: z.string().datetime().optional(),
  stirredAt: z.string().datetime().optional(),
  openedAt: z.string().datetime().optional(),
  exposureMinutes: z.number().nonnegative().optional(),
  maxExposureMinutes: z.number().positive().optional(),
});

// ProcessRecord params schemas
export const bakeParamsSchema = z.object({
  itemCode: z.string().min(1),
  bakeProcess: z.string().min(1),
  bakeQty: z.string().min(1),
  bakeTemperature: z.number().optional(),
  durationHours: z.string().optional(),
});

// 根据 resourceType / processType 选择 schema
export const payloadSchemaByResourceType = {
  STENCIL: stencilPayloadSchema,
  SOLDER_PASTE: solderPastePayloadSchema,
  // ...
} as const;

export const paramsSchemaByProcessType = {
  BAKE: bakeParamsSchema,
  // ...
} as const;
```

---

## 5. 迁移策略

### 5.1 Phase 1（现在）— 文档准备

- [x] 设计通用模型 schema
- [x] 定义 payload/params 的 JSON Schema 规范
- [ ] 在 domain_docs 中标记"SMT 行业模块"边界
- [ ] 在 schema.prisma 注释中标注模块归属

### 5.2 Phase 2（产品化时）— 渐进迁移

**步骤**：

1. **创建通用表**
   - 新建 `ResourceStatusLog`, `LineResourceBinding`, `ProcessRecord`
   - 添加对应的 enum 类型

2. **编写数据迁移脚本**
   ```typescript
   // 示例：StencilStatusRecord → ResourceStatusLog
   const records = await prisma.stencilStatusRecord.findMany();
   for (const r of records) {
     await prisma.resourceStatusLog.create({
       data: {
         resourceType: 'STENCIL',
         resourceId: r.stencilId,
         eventId: r.eventId,
         eventTime: r.eventTime,
         eventType: r.status, // 或根据业务逻辑映射
         status: r.status,
         source: r.source,
         operatorId: r.operatorId,
         payload: {
           version: r.version,
           tensionValue: r.tensionValue,
           lastCleanedAt: r.lastCleanedAt?.toISOString(),
         },
         receivedAt: r.receivedAt,
       },
     });
   }
   ```

3. **API 层提供 adapter**
   - 保持旧 API 路径可用（兼容现有前端）
   - 内部查询转发到新表
   ```typescript
   // GET /api/stencil-status-records (旧接口)
   // 内部调用 prisma.resourceStatusLog.findMany({ where: { resourceType: 'STENCIL' } })
   ```

4. **逐步切换前端调用**
   - 新功能使用通用 API
   - 旧功能在迭代中逐步迁移

### 5.3 Phase 3（可选）— 模块隔离

**目标**：按客户需求组合加载不同模块

**实现方式**：

1. **Schema 拆分**
   ```
   packages/db/prisma/schema/
   ├── core.prisma       # 核心表（WorkOrder, Run, Unit...）
   ├── smt.prisma        # SMT 行业特定扩展
   └── dip.prisma        # DIP 行业特定扩展
   ```

2. **条件加载**
   - 通过环境变量或配置决定加载哪些模块
   - 使用 Prisma 的 `multiSchema` 或合并工具

3. **行业模板**
   - SMT Template：预配置钢网/锡膏/回流焊相关
   - DIP Template：预配置波峰焊/手工焊相关

---

## 6. WP-3 ~ WP-10 任务验证

验证通用模型能否覆盖后续任务需求：

| 任务 | 用通用模型表达 | 可行性 |
|------|---------------|--------|
| WP-3 锡膏生命周期 | `ResourceStatusLog` (resourceType=SOLDER_PASTE) + payload | ✅ |
| WP-4 刮刀寿命 | `ResourceStatusLog` (resourceType=SQUEEGEE) + payload | ✅ |
| WP-5 转拉前检查 | 使用现有 `ReadinessCheck` + 模板化 | ✅ (已有机制) |
| WP-6 FAI 多签 | 扩展 Inspection 或新建 Approval 模型 | ⚠️ (需单独设计) |
| WP-7 设备点检 | `DataCollectionSpec` 或专用表 | ✅ |
| WP-8 炉温程式 | `ProcessRecord` (processType=REFLOW) + params | ✅ |
| WP-10 日常 QC | `DataCollectionSpec` 或扩展现有报表 | ✅ |

**结论**：通用模型可覆盖大部分需求，WP-6 可能需要单独的审批流模型设计。

---

## 7. 开放问题与建议

### 7.1 enum 扩展性

**问题**：`ResourceType` / `ProcessType` 使用 enum 还是 string？

| 方案 | 优势 | 劣势 |
|------|------|------|
| enum | 编译时检查、IDE 提示 | 新增类型需要 migration |
| string | 无需 migration、更灵活 | 缺少类型安全 |

**建议**：先用 enum，产品化时评估是否改为 string + 配置表。原因：
- 当前客户固定，类型变更不频繁
- enum 提供更好的开发体验
- 产品化时可统一评估所有行业类型

### 7.2 payload 类型安全

**问题**：如何在运行时校验 Json 字段？

**建议**：使用 Zod schema 在 API 层校验（见第 4.3 节）
- API 输入时根据 `resourceType` / `processType` 选择对应 schema
- 数据库读取后可选择性解析（按需校验）

### 7.3 查询性能

**问题**：通用表是否需要分区？

**建议**：先不分区，数据量大时按 `resourceType` / `processType` 分区
- 预估数据量：单产线 < 10K 条/年
- 当前复合索引 `[resourceType, resourceId]` 已足够
- 分区阈值：单表 > 1M 条时考虑

### 7.4 模块边界标记

**问题**：如何在代码中标记模块边界？

**建议**：在 schema.prisma 中使用注释块标记
```prisma
// ==========================================
// SMT 行业模块 (Industry: SMT)
// ==========================================

model StencilStatusRecord { ... }
model SolderPasteStatusRecord { ... }
```

---

## 8. 关键文件索引

| 文件 | 用途 |
|------|------|
| `packages/db/prisma/schema/schema.prisma` | 现有 schema |
| `domain_docs/mes/tech/db/01_prisma_schema.md` | Schema 文档 |
| `conversation/2026-01-20_094100_MES产品化架构决策.md` | 架构决策记录 |
| `domain_docs/mes/spec/architecture/01_product_abstraction.md` | 本技术方案 |

---

## 9. 总结

本技术方案设计了三个通用抽象模型：

1. **ResourceStatusLog**：统一资源生命周期事件（钢网、锡膏、刮刀等）
2. **LineResourceBinding**：统一产线-资源绑定关系
3. **ProcessRecord**：统一时段型工艺记录（烘烤、回流焊等）

配合现有的 `DataCollectionSpec` 和 `ReadinessCheck` 机制，可以覆盖大部分 MES 产品化需求。

**行动项**：
- [ ] 在 schema.prisma 添加模块边界注释
- [ ] Phase4 任务继续按需硬编码，保留 `meta` 扩展点
- [ ] 产品化时启动 Phase 2 迁移
