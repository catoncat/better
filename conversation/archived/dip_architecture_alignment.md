# DIP 流程架构对齐说明

> **创建日期**: 2026-01-06
> **目的**: 说明 DIP 流程如何对齐现有 MES 架构
> **关联文档**: `domain_docs/mes/spec/process/04_dip_flows.md`

---

## 同事提出的两个关键问题

### 问题 1：多次"首件/授权"是否要做成"卡控 gate"？

**现状约束**：
- FAI 是 Run 级别的一次性 gate：`Inspection.activeKey = ${runId}:FAI`
- `createFai` 要求 `run.status === PREP`，无法在 Run 进入 IN_PROGRESS 后再创建 FAI
- `checkFaiGate` 只在 Run 授权时检查一次，不支持工序段级别的卡控

**决策：Run 级 FAI（一次）+ 工序段首件 IPQC（规划）**

| 检验类型 | 位置 | 实现方式 | 是否卡控 Run 授权 |
|---------|------|---------|------------------|
| **FAI** | **路由第一段首件**（例如 SMT；或 DIP-only 路由的插件段） | Run 级首件检验（`activeKey = ${runId}:FAI`） | ✅ 是（PREP → AUTHORIZED） |
| **IPQC** | DIP-1 插件段首件（当 DIP 不是第一段时） | 复用 `Inspection.type = IPQC`（按 stepNo 区分） | ❌ 否（仅记录/提示） |
| **IPQC** | DIP-3 后焊段首件 | 同上 | ❌ 否 |
| **IPQC** | DIP-4 测试段首件 | 同上 | ❌ 否 |

**理由**：
1. **系统架构约束**：现有 FAI 机制无法支持多段卡控，扩展需要改造核心逻辑（同一 Run 只能有一次 FAI gate）
2. **业务合理性**：
   - Run 的第一段首件通常承担“开工前检查”，用 FAI 强卡控最合适
   - DIP-1/DIP-3/DIP-4 的段首件更多是工艺参数/方法验证，用 IPQC 记录即可满足追溯需求
   - 如果后焊/测试首件不合格，可通过返修流程处理，无需暂停整个 Run
3. **语义准确性**：IPQC（In-Process Quality Control）本就是"过程质量控制"的标准术语

### 问题 2：SMT 和 DIP 要不要同一个 SN 串在同一个 Run 里跑完路由？

**现状约束**：
- `Unit.sn` 唯一约束：同一个 SN 只能有一条 Unit 记录
- `Unit.runId` 单值：同一个 SN 不能同时属于两个 Run
- `UNIT_RUN_MISMATCH` 校验：如果 SN 已绑定到另一个 Run，会直接报错

**决策：SMT + DIP 作为同一 Run 的不同工序段（Option A）**

```
同一个 SN（Unit.sn）在同一个 Run 中：
┌─────────────────────────────────────────────────────────────┐
│ Unit: SN001                                                  │
│   runId: run-xxx (固定不变)                                  │
│   currentStepNo: 10 → 20 → 30 → ... → 190                   │
│   status: QUEUED → IN_STATION → QUEUED → ... → DONE         │
└─────────────────────────────────────────────────────────────┘

Routing 结构：
- SMT 工序段：stepNo 10-50
- DIP 工序段：stepNo 110-190
```

**理由**：
1. **避免数据结构改造**：无需引入 Unit-Run 多对多关系
2. **符合 MES 标准实践**：同一路由包含多个工序段是常见模式
3. **简化追溯逻辑**：同一个 Run 从头到尾完整追溯

---

## IPQC 实现方案（后焊/测试首件）

### 数据模型（复用现有 Inspection）

```prisma
// 现有 schema.prisma 中的 Inspection 表已支持
model Inspection {
  id          String           @id @default(cuid())
  runId       String
  type        InspectionType   // 使用 IPQC 类型
  status      InspectionStatus @default(PENDING)
  activeKey   String?          @unique  // ${runId}:IPQC:${stepNo}
  
  // 新增：通过 data 字段存储工序段信息
  data        Json?            // { "stepNo": 160, "stepGroup": "DIP-3", "checkType": "POST_WELDING_FAI" }
  
  // FAI specific fields（IPQC 也复用这些字段）
  sampleQty   Int?             // 首件数量（通常为 1）
  passedQty   Int?             // 通过数量
  failedQty   Int?             // 失败数量
  inspectorId String?          // 检验员 ID
  startedAt   DateTime?        // 开始时间
  
  decidedBy   String?
  decidedAt   DateTime?
  remark      String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  run   Run               @relation(fields: [runId], references: [id])
  items InspectionItem[]  // 详细检验项
}
```

### IPQC activeKey 设计

为了支持同一 Run 的多个 IPQC 任务（后焊首件、测试首件），需要在 activeKey 中包含 stepNo：

```typescript
// activeKey 格式：${runId}:IPQC:${stepNo}
const buildIpqcActiveKey = (runId: string, stepNo: number) => 
  `${runId}:IPQC:${stepNo}`;

// 示例
// 后焊首件：run-xxx:IPQC:160
// 测试首件：run-xxx:IPQC:180
```

### API 端点（规划）

```typescript
// 创建 IPQC 检验任务（后焊/测试首件）
POST /api/ipqc/run/:runNo
{
  "stepNo": 160,                    // 工序步骤号
  "stepGroup": "DIP-3",             // 工序段标识
  "checkType": "POST_WELDING_FAI",  // 检查类型（后焊首件/测试首件）
  "sampleQty": 1,                   // 首件数量
  "unitSn": "SN001"                 // 首件 SN
}

// 响应
{
  "success": true,
  "data": {
    "inspectionId": "insp-xxx",
    "activeKey": "run-xxx:IPQC:160",
    "status": "PENDING"
  }
}

// 记录 IPQC 检验项
POST /api/ipqc/:inspectionId/items
{
  "itemName": "烙铁温度",
  "itemSpec": "350±10°C",
  "actualValue": "355°C",
  "result": "PASS",
  "inspectedBy": "user-xxx"
}

// 完成 IPQC 检验
POST /api/ipqc/:inspectionId/complete
{
  "result": "PASS" | "FAIL",
  "remark": "后焊首件合格，参数正常"
}

// 查询 Run 的所有 IPQC 记录
GET /api/ipqc/run/:runNo
→ [
  {
    "inspectionId": "insp-1",
    "stepNo": 160,
    "stepGroup": "DIP-3",
    "checkType": "POST_WELDING_FAI",
    "status": "PASS",
    "passedQty": 1,
    "inspectedAt": "2026-01-06T10:00:00Z"
  },
  {
    "inspectionId": "insp-2",
    "stepNo": 180,
    "stepGroup": "DIP-4",
    "checkType": "TEST_FAI",
    "status": "PASS",
    "passedQty": 1,
    "inspectedAt": "2026-01-06T11:00:00Z"
  }
]
```

### 业务流程

#### 1. 后焊首件（DIP-3）

```
1. 操作员 TrackIn 首件 UNIT 到 stepNo=160（后焊工序）
2. 系统检查 `RoutingStep.meta.requiresIPQC === true`（规划字段）
3. 系统提示："需要完成后焊首件检验"
4. 质检员创建 IPQC 任务：
   POST /api/ipqc/run/:runNo
   { "stepNo": 160, "stepGroup": "DIP-3", "checkType": "POST_WELDING_FAI", "unitSn": "SN001" }
5. 质检员记录检验项（烙铁温度、焊点质量、三防漆覆盖）
6. 质检员完成检验：
   POST /api/ipqc/:inspectionId/complete
   { "result": "PASS", "remark": "后焊首件合格" }
7. 系统记录检验结果，操作员可继续批量后焊作业
8. 如果不合格：
   - 记录不良原因
   - 调整参数后重新首件
   - 不阻断 Run 授权（区别于 FAI）
```

#### 2. 测试首件（DIP-4）

```
1. 操作员 TrackIn 首件 UNIT 到 stepNo=180（ICT 测试）
2. 系统检查 `RoutingStep.meta.requiresIPQC === true`（规划字段）
3. 测试工程师创建 IPQC 任务：
   POST /api/ipqc/run/:runNo
   { "stepNo": 180, "stepGroup": "DIP-4", "checkType": "TEST_FAI", "unitSn": "SN001" }
4. 测试工程师执行 ICT/FCT 测试，记录测试项
5. 测试工程师完成检验：
   POST /api/ipqc/:inspectionId/complete
   { "result": "PASS", "remark": "测试首件通过，程序正确" }
6. 系统记录检验结果，可继续批量测试
7. 如果不合格：
   - 记录测试不良项
   - 调整测试程序后重新首件
   - 可选：暂停批量测试直到首件通过（业务规则可配置）
```

### IPQC 与 FAI 的对比总结

| 维度 | FAI（Run 级首件） | IPQC（段首件） |
|------|----------------|---------------------|
| 语义 | First Article Inspection（批次首件） | In-Process Quality Control（过程质量控制） |
| 卡控力度 | **强卡控**：不通过则 Run 无法授权 | **软卡控**：不通过记录不良，可选择暂停或继续 |
| Run 状态影响 | PREP → AUTHORIZED | 不影响 Run 状态 |
| 数据库实现 | `Inspection.type = FAI` | `Inspection.type = IPQC` |
| activeKey | `${runId}:FAI` | `${runId}:IPQC:${stepNo}` |
| 创建时机 | Run 创建后，PREP 状态 | 执行到特定 stepNo 时 |
| 多次检验 | 同一 Run 只有 1 次 FAI | 同一 Run 可以有多个 IPQC（按 stepNo 区分） |
| 返修豁免 | MRB 决策可豁免 | 可根据返修类型豁免 |

### 实现优势

1. **无需修改核心逻辑**：复用现有 `Inspection` 表和 API 结构
2. **语义更准确**：IPQC 本就是"过程中检验"的标准术语
3. **灵活性更高**：不阻断 Run 授权，业务可根据实际情况决定是否暂停生产
4. **可追溯性**：所有 IPQC 记录都关联到具体的 stepNo 和 unitSn，便于质量追溯

---

## SMT + DIP 完整路由示例

### 路由结构

```json
{
  "routingId": "routing-smt-dip",
  "routingCode": "SMT_DIP_V1",
  "steps": [
    // SMT 工序段
    { "stepNo": 10, "operationCode": "STENCIL_PREP", "meta": { "stepGroup": "SMT" } },
    { "stepNo": 20, "operationCode": "SPI", "meta": { "stepGroup": "SMT" } },
    { "stepNo": 30, "operationCode": "SMT_PLACEMENT", "requiresFAI": true, "meta": { "stepGroup": "SMT" } },
    { "stepNo": 40, "operationCode": "AOI", "meta": { "stepGroup": "SMT" } },
    { "stepNo": 50, "operationCode": "REFLOW", "meta": { "stepGroup": "SMT" } },
    
    // DIP 工序段
    { "stepNo": 110, "operationCode": "DIP_PREP", "meta": { "stepGroup": "DIP-1" } },
    { "stepNo": 120, "operationCode": "DIP_INSERTION", "meta": { "stepGroup": "DIP-1", "requiresIPQC": true } },
    { "stepNo": 130, "operationCode": "PRE_WAVE_AOI", "meta": { "stepGroup": "DIP-1" } },
    { "stepNo": 140, "operationCode": "WAVE_SOLDERING", "meta": { "stepGroup": "DIP-2" } },
    { "stepNo": 150, "operationCode": "POST_WAVE_AOI", "meta": { "stepGroup": "DIP-2" } },
    { "stepNo": 160, "operationCode": "POST_WELDING", "meta": { "stepGroup": "DIP-3", "requiresIPQC": true } },
    { "stepNo": 170, "operationCode": "VISUAL_INSPECTION", "meta": { "stepGroup": "DIP-3" } },
    { "stepNo": 180, "operationCode": "ICT", "meta": { "stepGroup": "DIP-4", "requiresIPQC": true } },
    { "stepNo": 190, "operationCode": "FCT", "meta": { "stepGroup": "DIP-4" } }
  ]
}
```

### FAI 和 IPQC 检查点

| stepNo | 工序 | 检查类型 | 实现方式 | 卡控力度 |
|--------|------|---------|---------|---------|
| 30 | SMT 贴片 | FAI | `Inspection.type = FAI` | 强卡控（PREP → AUTHORIZED） |
| 120 | DIP 插件段首件 | IPQC（规划） | `Inspection.type = IPQC, activeKey = run-xxx:IPQC:120` | 软卡控（记录检验结果） |
| 160 | 后焊 | IPQC | `Inspection.type = IPQC, activeKey = run-xxx:IPQC:160` | 软卡控（记录检验结果） |
| 180 | ICT 测试 | IPQC | `Inspection.type = IPQC, activeKey = run-xxx:IPQC:180` | 软卡控（记录检验结果） |

**说明**：
- 同一 Run 只有 **1 次** FAI，且只能在 `Run.status = PREP` 时创建；因此应仅在**路由第一段**设置 `requiresFAI`。
- DIP 各工序段的“段首件”采用 IPQC（规划），用于记录/提示，不作为 Run 授权 gate。

### 实际执行时序

```
1. 创建 Run（包含 SMT + DIP 完整路由）
   Run.status = PREP

2. SMT 首件检查（stepNo=30）
   - 创建 FAI：POST /api/fai/run/:runNo
   - FAI 通过 → Run.status = AUTHORIZED

3. SMT 批量生产（stepNo=30-50）
   - TrackIn/Out 执行 SMT 工序
   - 所有 UNIT 完成 stepNo=50

4. DIP 插件首件检查（stepNo=110）
   - 如果需要独立验证，创建 IPQC：POST /api/ipqc/run/:runNo
   - IPQC 通过 → 记录检验结果，允许批量插件

5. DIP 批量生产（stepNo=110-190）
   - 后焊首件（stepNo=160）：创建 IPQC，通过后继续
   - 测试首件（stepNo=180）：创建 IPQC，通过后继续
   - 所有 UNIT 完成 stepNo=190

6. Run 完成
   Run.status = IN_PROGRESS → COMPLETED（或触发 OQC）
```

---

## 需要的实现工作

### 1. 数据库（无需改动）
- 现有 `Inspection` 表已支持 IPQC 类型
- `activeKey` 字段已存在，只需调整生成逻辑

### 2. 后端 API

**新增 IPQC 服务** (`apps/server/src/modules/mes/ipqc/service.ts`)：
```typescript
export async function createIpqc(
  db: PrismaClient,
  runNo: string,
  data: CreateIpqcInput
): Promise<ServiceResult<InspectionRecord>>

export async function recordIpqcItem(
  db: PrismaClient,
  inspectionId: string,
  data: RecordIpqcItemInput
): Promise<ServiceResult<InspectionItem>>

export async function completeIpqc(
  db: PrismaClient,
  inspectionId: string,
  data: CompleteIpqcInput
): Promise<ServiceResult<InspectionRecord>>

export async function listIpqc(
  db: PrismaClient,
  runNo: string
): Promise<ServiceResult<InspectionRecord[]>>
```

**新增 IPQC 路由** (`apps/server/src/modules/mes/ipqc/routes.ts`)：
```typescript
POST /api/ipqc/run/:runNo
POST /api/ipqc/:inspectionId/start
POST /api/ipqc/:inspectionId/items
POST /api/ipqc/:inspectionId/complete
GET /api/ipqc/run/:runNo
```

### 3. 前端界面

**IPQC 首件检验页面**：
- DIP 后焊首件检验表单（stepNo=160）
- DIP 测试首件检验表单（stepNo=180）
- IPQC 检验记录列表
- IPQC 检验项详情展示

### 4. 路由配置

**SMT+DIP 完整路由模板**：
- 在路由管理界面添加 SMT_DIP_V1 模板
- 仅在路由第一段设置 `requiresFAI`；工序段首件用 `RoutingStep.meta.requiresIPQC`（规划字段）

---

## 总结

通过将后焊/测试首件改为 IPQC（而非多段 FAI），实现了：

1. **无缝融入现有架构**：不需要修改 FAI 核心逻辑和 Unit-Run 关系
2. **语义更准确**：IPQC 本就是"过程质量控制"的标准术语
3. **灵活性更高**：软卡控机制，业务可根据实际情况决定是否暂停生产
4. **可追溯性强**：所有 IPQC 记录都关联到具体的 stepNo 和 unitSn

这个方案既满足了 DIP 流程的质量管理需求，又避免了对现有系统的大规模改造，是一个务实的工程决策。
