# ERP 同步服务重构计划

## 目标

重构 ERP 集成同步服务，实现：
1. 明确命名与分层
2. 统一同步管线接口
3. 消除代码重复
4. 修复潜在问题

---

## 当前问题分析

### 架构问题

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | `erp-master-sync-service.ts` 混合了 pull + sync + apply | 架构 |
| 2 | `sync-service.ts` 只处理 Routing，有独立的分页 cursor 逻辑 | 架构 |
| 3 | `erp-service.ts` 仅 re-export，无实际作用 | 架构 |
| 4 | 两个文件都有重复的工具函数 | 架构 |

### Bug 发现 (Code Review)

| # | 问题 | 严重度 | 位置 |
|---|------|--------|------|
| **B1** | **syncErpRoutes 可能永久停止轮询**: 当 `since` 不前进时，基于 `businessKey` 的缓存 early return 会短路 pull，`nextSyncAt` 在无数据时保持等于 `since`，后续 cron 永不拉取新数据 | 🔴 High | sync-service.ts:323-347, erp-master-sync-service.ts:1008-1016 |
| **B2** | **applyErpRouteRows 将 steps 挂到错误的 header**: 使用 `lastHeader` 状态而非当前行的 `routeNo/headId`。如果行未严格排序或分页切割了路线，steps 会被分配到错误的 header，导致工艺路线数据损坏 | 🔴 High | erp-master-sync-service.ts:594-647 |
| **B3** | **syncEnvelope 无数据时 lastSyncAt 跳跃到 new Date()**: 当没有有效 `updatedAt` 值时，cursor 前进到当前时间，可能跳过延迟到达的旧时间戳记录 | 🟡 Medium | erp-master-sync-service.ts:862-874 |
| **B4** | **syncErpWorkCenters 只取第一个有数据的 formId**: 如果配置了多个 work center form IDs，只返回第一个有数据的结果，丢弃其余 | 🟡 Medium | erp-master-sync-service.ts:1330-1341 |
| **B5** | **plannedQty 被 round 截断小数**: `Math.round(item.plannedQty)` 丢失 ERP 发送的小数数量 | 🟡 Medium | erp-master-sync-service.ts:1089-1102 |
| **B6** | **BOM qty 只用 FNumerator，忽略 FDENOMINATOR**: 如果下游需要比例计算，当 denominator ≠ 1 时消耗量会错误 | 🟢 Low | erp-master-sync-service.ts:781-805 |

### 待确认假设

| 问题 | 影响 |
|------|------|
| ERP route 行是否保证按 `routeNo/headId` 排序，且每行都有 header 字段？ | 若否，当前解析不安全 (B2) |
| Work Order 小数数量是否有效？ | 若是，需移除 rounding (B5) |
| 是否接受跳过延迟到达的变更？ | 若否，cursor 应更保守前进 (B3) |

---

## 重构方案

### Phase 1: 抽取公共工具

**新建文件**: `apps/server/src/modules/mes/integration/utils.ts`

```typescript
// 提取公共函数
export const safeJsonStringify = ...
export const hashPayload = ...
export const toJsonValue = ...
export const parseDate = ...
export const toIso = ...
export const getLatestTimestamp = ...
export const serializeError = ...
```

### Phase 2: 统一同步管线接口

**重构 syncEnvelope → createSyncPipeline**

```typescript
// apps/server/src/modules/mes/integration/sync-pipeline.ts

type SyncPipelineOptions<TRaw, TItem> = {
  sourceSystem: string;
  entityType: string;
  db: PrismaClient;

  // 数据拉取
  pull: (cursor: SyncCursor) => Promise<PullResult<TRaw>>;

  // 数据转换
  normalize: (raw: TRaw[]) => TItem[];

  // 数据应用
  apply: (tx: TransactionClient, items: TItem[]) => Promise<void>;

  // 去重策略
  dedupeStrategy: 'skip' | 'reapply' | 'reapply-mark';
};

type SyncCursor = {
  since?: string | null;
  startRow?: number;
  limit?: number;
  meta?: Record<string, unknown>;
};

type PullResult<T> = {
  items: T[];
  cursor: {
    nextSyncAt?: string;
    hasMore: boolean;
    nextStartRow?: number;
  };
};

export const createSyncPipeline = <TRaw, TItem>(
  options: SyncPipelineOptions<TRaw, TItem>
) => {
  return async (syncOptions: SyncOptions): Promise<ServiceResult<SyncResult<TItem>>> => {
    // 1. 读取 cursor (支持 meta.nextStartRow)
    // 2. 循环 pull 直到 hasMore = false (或单页模式)
    // 3. 检查 dedupeKey
    // 4. 根据 dedupeStrategy 决定是否 apply
    // 5. 更新 cursor (支持 meta)
    // 6. 记录 IntegrationMessage
  };
};
```

**去重策略说明**:
| 策略 | 行为 |
|------|------|
| `skip` | 命中重复时跳过 apply，直接返回缓存 |
| `reapply` | 命中重复时仍执行 apply（当前行为） |
| `reapply-mark` | 执行 apply 但在消息中标记 `reapplied: true` |

### Phase 3: 重构文件结构

```
apps/server/src/modules/mes/integration/
├── utils.ts                    # 公共工具函数
├── sync-pipeline.ts            # 统一同步管线
├── kingdee.ts                  # Kingdee API 客户端 (保持不变)
├── mock-data.ts                # Mock 数据 (保持不变)
│
├── erp/                        # ERP 同步模块
│   ├── index.ts                # 导出所有 sync 函数
│   ├── pull-work-orders.ts     # 拉取 + 标准化
│   ├── pull-materials.ts
│   ├── pull-boms.ts
│   ├── pull-work-centers.ts
│   ├── pull-routes.ts
│   ├── apply-work-orders.ts    # 应用到本地数据库
│   ├── apply-materials.ts
│   ├── apply-boms.ts
│   ├── apply-work-centers.ts
│   └── apply-routes.ts
│
├── tpm/                        # TPM 同步模块 (类似结构)
│   └── ...
│
├── routes.ts                   # HTTP 路由 (保持不变)
├── schema.ts                   # Zod schemas (保持不变)
└── service.ts                  # 高层 API (可选保留)
```

**删除文件**:
- `erp-service.ts` (仅 re-export)
- `erp-master-sync-service.ts` (拆分)
- `sync-service.ts` (合并)

### Phase 4: 修复路由解析排序问题 (B2)

**问题**: `applyErpRouteRows` 假设数据按 routeNo 排序

**修复方案**: 在 `pull-routes.ts` 中：

```typescript
const applyErpRouteRows = (rows: unknown[], state: ErpRouteParseState) => {
  // 方案 A: 预处理按 headId 分组（推荐）
  const groupedByHeadId = new Map<string, unknown[]>();

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const headId = getCell(row, 0).trim(); // FID 每行都有
    if (!headId) continue;

    const group = groupedByHeadId.get(headId) || [];
    group.push(row);
    groupedByHeadId.set(headId, group);
  }

  for (const [headId, routeRows] of groupedByHeadId) {
    // 第一行提取 header
    const firstRow = routeRows[0];
    const header = extractHeader(firstRow);

    // 所有行提取 steps
    for (const row of routeRows) {
      const step = extractStep(row);
      if (step) state.routeMap.get(header.routeNo)?.steps.push(step);
    }
  }
};
```

**推荐方案 A**: 按 `headId` (FID) 分组，消除对行顺序的依赖。

---

### Phase 5: 修复 Routing 轮询永久停止问题 (B1)

**问题**: 缓存 early return + `since` 不前进 = 永久缓存命中

**修复方案**:

```typescript
// sync-pipeline.ts 中的统一逻辑

// 选项 1: 移除 businessKey 缓存 early return（推荐）
// 只使用 dedupeKey（基于 payload hash）来判断是否需要 apply
// 始终执行 pull，让 cursor 有机会前进

// 选项 2: 即使无数据也前进 cursor
const nextSyncAt = getLatestTimestamp(items) ?? new Date();
// 但这会导致 B3 问题加剧

// 选项 3: 基于时间的缓存过期
const existing = await db.integrationMessage.findFirst({
  where: {
    ...conditions,
    createdAt: { gt: new Date(Date.now() - CACHE_TTL_MS) } // 1小时过期
  }
});
```

**推荐选项 1**: 在 `sync-pipeline.ts` 中移除 businessKey 缓存 early return。

---

### Phase 6: 修复 Cursor 过度前进问题 (B3)

**问题**: 无数据时 `lastSyncAt` 跳到 `new Date()`

**修复方案**:

```typescript
// sync-pipeline.ts

const computeNextSyncAt = (
  items: Array<{ updatedAt?: string }>,
  currentSince: string | null
): Date | null => {
  const latest = getLatestTimestamp(items.map(i => i.updatedAt));

  if (latest) {
    // 有数据时，使用最新的 updatedAt
    return latest;
  }

  if (currentSince) {
    // 无数据时，保持原来的 since（不前进）
    return new Date(currentSince);
  }

  // 首次同步且无数据，不更新 cursor
  return null;
};
```

---

### Phase 7: 修复 Work Centers 多 FormId 问题 (B4)

**问题**: 只取第一个有数据的 formId

**修复方案**:

```typescript
// pull-work-centers.ts

const pullWorkCenters = async (cursor: SyncCursor) => {
  const allRows: unknown[] = [];

  for (const formId of config.formIds.workCenter) {
    const rowsResult = await fetchKingdeeRows(...);
    if (!rowsResult.success) throw rowsResult;
    allRows.push(...rowsResult.data); // 累积所有 formId 的数据
  }

  return normalizeWorkCenters(allRows);
};
```

---

### Phase 8: 修复数量精度问题 (B5, B6)

**B5: plannedQty 小数截断**

```typescript
// apply-work-orders.ts

// 之前
plannedQty: Math.round(item.plannedQty)

// 修复: 保留原始精度（假设 DB schema 支持 Decimal/Float）
plannedQty: item.plannedQty

// 或者如果必须是整数，使用 ceil 更安全
plannedQty: Math.ceil(item.plannedQty)
```

**B6: BOM 比例计算**

```typescript
// apply-boms.ts

// 之前
qty: item.qty  // 只用 FNumerator

// 修复: 存储实际比例
qty: item.denominator !== 0 ? item.qty / item.denominator : item.qty

// 或者同时存储 numerator 和 denominator
qtyNumerator: item.qty,
qtyDenominator: item.denominator,
```

### Phase 5: 统一使用 syncPipeline

**示例: Work Orders**

```typescript
// apps/server/src/modules/mes/integration/erp/index.ts

import { createSyncPipeline } from '../sync-pipeline';
import { pullWorkOrders, normalizeWorkOrders } from './pull-work-orders';
import { applyWorkOrders } from './apply-work-orders';

export const syncErpWorkOrders = createSyncPipeline({
  sourceSystem: 'ERP',
  entityType: 'WORK_ORDER',
  pull: pullWorkOrders,
  normalize: normalizeWorkOrders,
  apply: applyWorkOrders,
  dedupeStrategy: 'reapply', // 保持现有行为
});

// Routing 使用分页
export const syncErpRoutes = createSyncPipeline({
  sourceSystem: 'ERP',
  entityType: 'ROUTING',
  pull: pullRoutesPaginated,
  normalize: normalizeRoutes,
  apply: applyRoutes,
  dedupeStrategy: 'skip', // Routing 复杂，跳过重复
});
```

---

## 文件修改清单

| 操作 | 文件 |
|------|------|
| 新建 | `integration/utils.ts` |
| 新建 | `integration/sync-pipeline.ts` |
| 新建 | `integration/erp/index.ts` |
| 新建 | `integration/erp/pull-work-orders.ts` |
| 新建 | `integration/erp/pull-materials.ts` |
| 新建 | `integration/erp/pull-boms.ts` |
| 新建 | `integration/erp/pull-work-centers.ts` |
| 新建 | `integration/erp/pull-routes.ts` |
| 新建 | `integration/erp/apply-work-orders.ts` |
| 新建 | `integration/erp/apply-materials.ts` |
| 新建 | `integration/erp/apply-boms.ts` |
| 新建 | `integration/erp/apply-work-centers.ts` |
| 新建 | `integration/erp/apply-routes.ts` |
| 删除 | `integration/erp-service.ts` |
| 删除 | `integration/erp-master-sync-service.ts` |
| 删除 | `integration/sync-service.ts` |
| 修改 | `plugins/erp-sync-cron.ts` (更新 import) |
| 修改 | `integration/routes.ts` (如有直接引用) |

---

## 实施顺序

1. **Phase 1**: 新建 `utils.ts`，提取公共函数
2. **Phase 2**: 新建 `sync-pipeline.ts`，实现统一管线
3. **Phase 3**: 逐个实体迁移：
   - 3.1 Work Orders (最简单，先验证模式)
   - 3.2 Materials
   - 3.3 BOMs
   - 3.4 Work Centers
   - 3.5 Routing (最复杂，最后处理)
4. **Phase 4**: 更新 cron 和 routes
5. **Phase 5**: 删除旧文件，运行测试

---

## 风险与回滚

- **渐进式迁移**: 每个实体单独迁移，可随时停止
- **保持接口兼容**: 导出的函数签名保持不变
- **DB 变更安全**: 仅新增表，不修改现有表，向后兼容
- **回滚策略**: 若出问题，可保留新表但切回旧代码

---

## 确认的决策

1. **去重策略**: ✅ 已确认
   - Work Orders: `reapply`（确保状态同步）
   - Materials/BOMs/Work Centers: `skip`（主数据变化少）
   - Routing: `skip`（复杂度高）

2. **Raw 数据存储**: ✅ 全部添加
   - 需要为所有实体创建 Raw 数据表用于审计
   - 新增 DB Schema:
     - `ErpWorkOrderRaw`
     - `ErpMaterialRaw`
     - `ErpBomRaw`
     - `ErpWorkCenterRaw`

---

## 补充: DB Schema 变更

### 新增模型 (Prisma)

```prisma
model ErpWorkOrderRaw {
  id           String   @id @default(cuid())
  sourceSystem String
  sourceKey    String   // woNo
  payload      Json
  dedupeKey    String
  createdAt    DateTime @default(now())

  @@index([sourceSystem, sourceKey])
  @@index([dedupeKey])
}

model ErpMaterialRaw {
  id           String   @id @default(cuid())
  sourceSystem String
  sourceKey    String   // materialCode
  payload      Json
  dedupeKey    String
  createdAt    DateTime @default(now())

  @@index([sourceSystem, sourceKey])
  @@index([dedupeKey])
}

model ErpBomRaw {
  id           String   @id @default(cuid())
  sourceSystem String
  sourceKey    String   // parentCode_childCode
  payload      Json
  dedupeKey    String
  createdAt    DateTime @default(now())

  @@index([sourceSystem, sourceKey])
  @@index([dedupeKey])
}

model ErpWorkCenterRaw {
  id           String   @id @default(cuid())
  sourceSystem String
  sourceKey    String   // workCenterCode
  payload      Json
  dedupeKey    String
  createdAt    DateTime @default(now())

  @@index([sourceSystem, sourceKey])
  @@index([dedupeKey])
}
```

---

## 更新后的实施顺序

### 第一阶段: 基础设施

1. **Phase 0**: DB Schema 变更
   - 添加 4 个新的 Raw 模型
   - 运行 `bun prisma migrate dev`

2. **Phase 1**: 新建 `utils.ts`，提取公共函数

3. **Phase 2**: 新建 `sync-pipeline.ts`，实现统一管线
   - 支持分页 cursor
   - 支持去重策略配置
   - 支持 Raw 数据存储
   - **修复 B1**: 移除 businessKey 缓存 early return
   - **修复 B3**: cursor 不前进当无数据时

### 第二阶段: 实体迁移 (含 Bug 修复)

4. **Phase 3.1**: 迁移 Work Orders 同步
   - **修复 B5**: 移除 `Math.round()`，保留精度

5. **Phase 3.2**: 迁移 Materials 同步

6. **Phase 3.3**: 迁移 BOMs 同步
   - **修复 B6**: 正确处理 qty/denominator 比例

7. **Phase 3.4**: 迁移 Work Centers 同步
   - **修复 B4**: 累积所有 formId 数据

8. **Phase 3.5**: 迁移 Routing 同步
   - **修复 B2**: 按 headId 分组，消除排序依赖

### 第三阶段: 清理

9. **Phase 4**: 更新 cron 和 routes

10. **Phase 5**: 删除旧文件，运行测试
