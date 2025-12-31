# Line Readiness Check 详细设计

> 状态：**设计稿** - 待审阅
> 创建时间：2024-12-29
> 需求来源：`conversation/line_readiness_check_discussion.md`

---

## 1. 功能概述

### 1.1 目标

在 Run 授权前执行准备检查，确保设备、物料、工艺路线都已就绪。

### 1.2 核心流程

```
Run 创建 (PREP)
    ↓
[自动预检] ←─── TPM/路由变更时可重新触发
    ↓
预检结果（仅提示，不阻断）
    ↓
操作员点击"请求授权"
    ↓
[正式检查] ←─── 同步执行，阻断式
    ↓
检查通过？
    ├─ Yes → Run 可授权 → FAI → AUTHORIZED
    └─ No  → 显示失败项
              ├─ 解决问题 → 重新检查
              └─ 豁免（需权限）→ Run 可授权
```

---

## 2. 数据模型设计

### 2.1 新增枚举

```prisma
enum ReadinessCheckType {
  PRECHECK      // 预检（异步，仅提示）
  FORMAL        // 正式检查（同步，阻断式）
}

enum ReadinessCheckStatus {
  PENDING       // 检查中
  PASSED        // 全部通过
  FAILED        // 有失败项
}

enum ReadinessItemType {
  EQUIPMENT     // 设备状态
  MATERIAL      // 物料主数据
  ROUTE         // 工艺路线
}

enum ReadinessItemStatus {
  PASSED        // 通过
  FAILED        // 失败
  WAIVED        // 已豁免
}
```

### 2.2 ReadinessCheck 表

主检查记录，关联到 Run。

```prisma
model ReadinessCheck {
  id          String                @id @default(cuid())
  runId       String
  type        ReadinessCheckType    // PRECHECK | FORMAL
  status      ReadinessCheckStatus  // PENDING | PASSED | FAILED
  checkedAt   DateTime              @default(now())
  checkedBy   String?               // 执行检查的用户 ID（正式检查时）
  meta        Json?                 // 扩展字段
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  run         Run                   @relation(fields: [runId], references: [id])
  items       ReadinessCheckItem[]

  @@index([runId])
  @@index([type, status])
}
```

### 2.3 ReadinessCheckItem 表

每个检查项的结果。

```prisma
model ReadinessCheckItem {
  id              String              @id @default(cuid())
  checkId         String
  itemType        ReadinessItemType   // EQUIPMENT | MATERIAL | ROUTE
  itemKey         String              // 具体标识，如设备代码、物料代码
  status          ReadinessItemStatus // PASSED | FAILED | WAIVED
  failReason      String?             // 失败原因
  evidenceJson    Json?               // 检查时的证据快照（可选）

  // 豁免信息
  waivedAt        DateTime?
  waivedBy        String?             // 豁免人用户 ID
  waiveReason     String?             // 豁免原因（必填）

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  check           ReadinessCheck      @relation(fields: [checkId], references: [id])

  @@index([checkId])
  @@index([itemType, status])
}
```

### 2.4 Run 模型扩展

不在 Run 上冗余存储 readinessStatus，通过关联查询获取。

```prisma
model Run {
  // ... existing fields ...

  readinessChecks ReadinessCheck[]
}
```

### 2.5 ER 图

```
┌─────────────┐       ┌───────────────────┐       ┌─────────────────────┐
│    Run      │ 1───* │  ReadinessCheck   │ 1───* │  ReadinessCheckItem │
├─────────────┤       ├───────────────────┤       ├─────────────────────┤
│ id          │       │ id                │       │ id                  │
│ runNo       │       │ runId (FK)        │       │ checkId (FK)        │
│ status      │       │ type              │       │ itemType            │
│ ...         │       │ status            │       │ itemKey             │
└─────────────┘       │ checkedAt         │       │ status              │
                      │ checkedBy         │       │ failReason          │
                      └───────────────────┘       │ waivedAt/By/Reason  │
                                                  └─────────────────────┘
```

---

## 3. 检查逻辑设计

### 3.1 设备状态检查 (EQUIPMENT)

**数据来源**：`TpmEquipment`, `TpmMaintenanceTask`

**检查逻辑**：
```typescript
async function checkEquipment(run: Run): Promise<CheckItemResult[]> {
  // 1. 获取 Run 关联的 Line 下所有 Station
  const stations = await getStationsByLineId(run.lineId);

  // 2. 对每个 Station，查找对应的 TpmEquipment（通过 code 匹配）
  const results: CheckItemResult[] = [];

  for (const station of stations) {
    const equipment = await db.tpmEquipment.findFirst({
      where: { equipmentCode: station.code }
    });

    if (!equipment) {
      // 无设备记录，跳过（或根据配置决定是否失败）
      continue;
    }

    // 3. 检查设备状态
    if (equipment.status !== 'normal') {
      results.push({
        itemType: 'EQUIPMENT',
        itemKey: equipment.equipmentCode,
        status: 'FAILED',
        failReason: `设备状态异常: ${equipment.status}`
      });
      continue;
    }

    // 4. 检查是否有阻断性维保任务
    const blockingTask = await db.tpmMaintenanceTask.findFirst({
      where: {
        equipmentCode: equipment.equipmentCode,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        isBlocking: true
      }
    });

    if (blockingTask) {
      results.push({
        itemType: 'EQUIPMENT',
        itemKey: equipment.equipmentCode,
        status: 'FAILED',
        failReason: `有未完成的阻断性维保任务: ${blockingTask.taskNo}`
      });
      continue;
    }

    results.push({
      itemType: 'EQUIPMENT',
      itemKey: equipment.equipmentCode,
      status: 'PASSED'
    });
  }

  return results;
}
```

### 3.2 物料主数据检查 (MATERIAL)

**数据来源**：`BomItem`, `Material`

**检查逻辑**：
```typescript
async function checkMaterial(run: Run): Promise<CheckItemResult[]> {
  // 1. 获取工单的产品代码
  const workOrder = await db.workOrder.findUnique({
    where: { id: run.woId }
  });

  // 2. 获取该产品的 BOM
  const bomItems = await db.bomItem.findMany({
    where: { parentCode: workOrder.productCode }
  });

  if (bomItems.length === 0) {
    return [{
      itemType: 'MATERIAL',
      itemKey: workOrder.productCode,
      status: 'FAILED',
      failReason: `产品 ${workOrder.productCode} 无 BOM 定义`
    }];
  }

  // 3. 检查每个 BOM 物料是否有主数据
  const results: CheckItemResult[] = [];

  for (const item of bomItems) {
    const material = await db.material.findUnique({
      where: { code: item.childCode }
    });

    if (!material) {
      results.push({
        itemType: 'MATERIAL',
        itemKey: item.childCode,
        status: 'FAILED',
        failReason: `物料 ${item.childCode} 无主数据`
      });
    } else {
      results.push({
        itemType: 'MATERIAL',
        itemKey: item.childCode,
        status: 'PASSED'
      });
    }
  }

  return results;
}
```

### 3.3 工艺路线检查 (ROUTE)

**数据来源**：`ExecutableRouteVersion`

**检查逻辑**：
```typescript
async function checkRoute(run: Run): Promise<CheckItemResult[]> {
  // 检查 Run 是否绑定了 READY 状态的可执行路由版本
  if (!run.routeVersionId) {
    return [{
      itemType: 'ROUTE',
      itemKey: run.runNo,
      status: 'FAILED',
      failReason: '未绑定可执行路由版本'
    }];
  }

  const version = await db.executableRouteVersion.findUnique({
    where: { id: run.routeVersionId }
  });

  if (!version) {
    return [{
      itemType: 'ROUTE',
      itemKey: run.routeVersionId,
      status: 'FAILED',
      failReason: '绑定的路由版本不存在'
    }];
  }

  if (version.status !== 'READY') {
    return [{
      itemType: 'ROUTE',
      itemKey: version.versionNo,
      status: 'FAILED',
      failReason: `路由版本状态为 ${version.status}，非 READY`
    }];
  }

  return [{
    itemType: 'ROUTE',
    itemKey: version.versionNo,
    status: 'PASSED'
  }];
}
```

---

## 4. API 设计

### 4.1 执行预检

```
POST /api/runs/{runNo}/readiness/precheck
```

**描述**：对 Run 执行预检（异步提示，不阻断）

**请求**：无 body

**响应**：
```json
{
  "success": true,
  "data": {
    "checkId": "clxxx...",
    "type": "PRECHECK",
    "status": "PASSED",  // or "FAILED"
    "checkedAt": "2024-12-29T10:00:00Z",
    "items": [
      {
        "itemType": "EQUIPMENT",
        "itemKey": "EQ-001",
        "status": "PASSED"
      },
      {
        "itemType": "MATERIAL",
        "itemKey": "MAT-001",
        "status": "FAILED",
        "failReason": "物料无主数据"
      }
    ],
    "summary": {
      "total": 5,
      "passed": 4,
      "failed": 1,
      "waived": 0
    }
  }
}
```

### 4.2 执行正式检查

```
POST /api/runs/{runNo}/readiness/check
```

**描述**：对 Run 执行正式检查（同步阻断式）

**请求**：无 body

**响应**：同预检

**错误码**：
- `READINESS_CHECK_FAILED`：检查失败，无法授权

### 4.3 获取最新检查结果

```
GET /api/runs/{runNo}/readiness/latest
```

**描述**：获取 Run 的最新准备检查结果

**查询参数**：
- `type`：可选，`PRECHECK` | `FORMAL`

**响应**：同上

### 4.4 获取检查历史

```
GET /api/runs/{runNo}/readiness/history
```

**描述**：获取 Run 的所有准备检查记录

**响应**：
```json
{
  "success": true,
  "data": {
    "checks": [
      {
        "checkId": "clxxx...",
        "type": "FORMAL",
        "status": "PASSED",
        "checkedAt": "2024-12-29T11:00:00Z",
        "checkedBy": "user-001"
      },
      {
        "checkId": "clyyy...",
        "type": "PRECHECK",
        "status": "FAILED",
        "checkedAt": "2024-12-29T10:00:00Z"
      }
    ]
  }
}
```

### 4.5 豁免检查项

```
POST /api/runs/{runNo}/readiness/items/{itemId}/waive
```

**描述**：豁免一个失败的检查项

**权限**：`mes:readiness:override`

**请求**：
```json
{
  "reason": "已确认设备已维护完成，TPM 系统尚未同步"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "itemId": "clzzz...",
    "status": "WAIVED",
    "waivedAt": "2024-12-29T10:30:00Z",
    "waivedBy": "user-002",
    "waiveReason": "已确认设备已维护完成，TPM 系统尚未同步"
  }
}
```

**错误码**：
- `FORBIDDEN`：无豁免权限
- `WAIVE_REASON_REQUIRED`：豁免原因必填

### 4.6 检查项配置（可配置扩展）

```
GET /api/readiness/config
POST /api/readiness/config
PATCH /api/readiness/config/{configId}
```

**说明**：用于未来支持按产线/产品配置检查项，当前阶段可不实现。

---

## 5. Run 授权流程集成

### 5.1 修改授权 API

现有 API：`POST /api/runs/{runNo}/authorize`

**新增前置检查**：

```typescript
async function authorizeRun(runNo: string, userId: string) {
  const run = await db.run.findUnique({ where: { runNo } });

  // 1. 执行正式检查
  const checkResult = await performFormalCheck(run, userId);

  // 2. 检查是否通过（PASSED 或 所有 FAILED 项已 WAIVED）
  const failedItems = checkResult.items.filter(
    item => item.status === 'FAILED'
  );

  if (failedItems.length > 0) {
    throw new BusinessError('READINESS_CHECK_FAILED', {
      failedItems: failedItems.map(i => ({
        itemType: i.itemType,
        itemKey: i.itemKey,
        failReason: i.failReason
      }))
    });
  }

  // 3. 检查通过，继续授权流程（FAI 等）
  // ...
}
```

### 5.2 新增错误码

在 `domain_docs/mes/tech/api/01_api_overview.md` 添加：

```
*   `READINESS_CHECK_FAILED`: 准备检查失败，无法授权。
*   `WAIVE_REASON_REQUIRED`: 豁免必须填写原因。
```

---

## 6. 自动预检触发

### 6.1 触发时机

1. **Run 创建后**：异步执行预检
2. **TPM 设备状态变更时**：对关联的进行中 Run 重新预检
3. **路由版本变更时**：对使用该路由的进行中 Run 重新预检

### 6.2 实现方式

使用事件驱动或定时任务：

```typescript
// 事件监听
eventBus.on('run:created', async (run) => {
  await performPrecheck(run);
});

eventBus.on('tpm:equipment:statusChanged', async (equipment) => {
  // 找到关联的进行中 Run
  const runs = await findAffectedRuns(equipment.equipmentCode);
  for (const run of runs) {
    await performPrecheck(run);
  }
});
```

---

## 7. UI 设计要点

### 7.1 Run 详情页增强

- 新增"准备状态"卡片，显示：
  - 最新检查结果（通过/失败/部分豁免）
  - 失败项列表（带豁免按钮）
  - 检查时间、检查人

### 7.2 准备检查执行页

- 检查项列表（设备/物料/路线）
- 每项显示：状态、失败原因、豁免信息
- "重新检查"按钮
- "豁免"按钮（需权限）

### 7.3 异常汇总看板

- 筛选条件：产线、状态、时间范围
- 列表显示所有有失败项的 Run
- 快速跳转到 Run 详情

### 7.4 检查项配置页

- 管理员配置不同产线的检查项
- 启用/禁用特定检查
- 当前阶段可简化实现

---

## 8. 权限设计

### 8.1 新增权限

| 权限代码 | 说明 |
|----------|------|
| `mes:readiness:view` | 查看准备检查结果 |
| `mes:readiness:check` | 执行准备检查 |
| `mes:readiness:override` | 豁免检查项 |
| `mes:readiness:config` | 管理检查项配置 |

### 8.2 角色分配建议

| 角色 | 权限 |
|------|------|
| 操作员 | `view`, `check` |
| 班长/主管 | `view`, `check`, `override` |
| 工程师/管理员 | 全部 |

---

## 9. 实现任务拆分

### Phase 1：核心功能（建议优先）

- [x] **9.1** 数据模型：添加 `ReadinessCheck`, `ReadinessCheckItem` 表和枚举
- [x] **9.2** 检查逻辑：实现设备/物料/路线三项检查
- [x] **9.3** API：预检、正式检查、获取结果
- [x] **9.4** 授权集成：修改 Run 授权 API 增加检查前置
- [x] **9.5** 权限：添加 `mes:readiness:*` 权限

### Phase 2：豁免功能

- [x] **9.6** API：豁免接口
- [x] **9.7** UI：Run 详情页增强（显示检查状态、豁免操作）

### Phase 3：自动触发

- [x] **9.8** 事件：Run 创建时自动预检
- [x] **9.9** 事件：TPM/路由变更时重新预检

### Phase 4：管理功能

- [x] **9.10** UI：准备检查执行页（集成在Run详情页）
- [x] **9.11** UI：异常汇总看板
- [ ] **9.12** UI：检查项配置页（可选）

---

## 10. 测试场景

### 10.1 正常流程

1. 创建 Run → 自动预检 → 全部通过
2. 请求授权 → 正式检查 → 通过 → 可进入 FAI

### 10.2 检查失败

1. 创建 Run → 预检失败（设备异常）
2. 请求授权 → 正式检查 → 失败 → 拒绝授权

### 10.3 豁免流程

1. 正式检查失败
2. 班长豁免失败项（填写原因）
3. 重新检查或直接授权 → 通过

### 10.4 自动重检

1. Run 在 PREP 状态
2. TPM 推送设备状态变更
3. 自动触发预检 → 结果更新

---

## 11. 相关文档

- 需求讨论：`conversation/line_readiness_check_discussion.md`
- 端到端流程：`domain_docs/mes/spec/process/01_end_to_end_flows.md`
- 集成规范：`domain_docs/mes/spec/integration/01_system_integrations.md`
- API 模式：`agent_docs/03_backend/api_patterns.md`
