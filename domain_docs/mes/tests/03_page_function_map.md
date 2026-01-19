# MES 页面与功能速查表

> 快速了解每个页面的作用和使用场景

---

## 一、页面关系图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MES 页面导航结构                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │   主数据配置     │────▶│   生产准备      │────▶│   生产执行      │   │
│  │   (工程师)       │     │   (组长)        │     │   (操作员)      │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│         │                       │                       │              │
│         ▼                       ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        质量闭环 (质量工程师)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                      │
│                                 ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        追溯查询 (全员)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、主数据配置（工艺工程师）

> 生产前的基础数据准备，通常只需配置一次

### 数据流向图

```
物料 (Material)
    │
    └──▶ BOM (Bill of Materials)
              │
              └──▶ 槽位映射 (SlotMaterialMapping)
                        │
                        └──▶ 上料防错验证

路由 (Route)
    │
    ├──▶ 路由步骤 (RouteStep)
    │         │
    │         ├──▶ 工作中心 (WorkCenter) ──▶ 工位 (Station)
    │         │
    │         └──▶ 采集项 (DataCollectionSpec)
    │
    └──▶ 路由版本 (RouteVersion)
              │
              └──▶ 创建批次时快照
```

### 页面说明

| 页面 | 路径 | 作用 | 何时使用 |
|------|------|------|----------|
| **物料主数据** | `/mes/materials` | 管理物料基础信息（编码、名称、规格） | 新增物料时 |
| **BOM** | `/mes/boms` | 定义产品的物料清单 | 新产品导入时 |
| **工作中心** | `/mes/work-centers` | 定义工位分组（如"SMT 印刷组"） | 新增产线/设备时 |
| **路由管理** | `/mes/routes` | 定义产品的工艺流程 | 新产品导入/工艺变更时 |
| **路由详情** | `/mes/routes/$code` | 配置路由步骤和采集项 | 编辑具体路由时 |
| **采集项** | `/mes/data-collection-specs` | 定义 TrackOut 时采集的数据项 | 新增/修改采集需求时 |
| **路由版本** | `/mes/route-versions` | 管理路由版本（编译/发布） | 发布新路由版本时 |

### 配置流程

```
1. 物料 → 创建成品和原材料物料
      ↓
2. BOM → 建立成品到原材料的关系
      ↓
3. 工作中心 → 定义产线的工位分组
      ↓
4. 采集项 → 定义需要采集的数据规格
      ↓
5. 路由 → 配置工艺步骤、绑定工作中心和采集项
      ↓
6. 路由版本 → 编译 → 发布 (READY)
      ↓
7. 槽位配置 → 为产品配置槽位-物料映射
```

---

## 三、生产准备（产线组长）

> 每个批次生产前的准备工作

### 准备流程图

```
创建批次 (Run)
    │
    ├──▶ 槽位配置 ──▶ 加载站位表 ──▶ 上料验证
    │
    ├──▶ 就绪检查配置 ──▶ 执行就绪检查 ──▶ 异常处理/豁免
    │
    └──▶ 集成状态 ──▶ 手动录入（降级）
```

### 页面说明

| 页面 | 路径 | 作用 | 何时使用 |
|------|------|------|----------|
| **槽位配置** | `/mes/loading/slot-config` | 配置飞达槽位和物料映射 | 新产品/换产时 |
| **上料防错** | `/mes/loading` | 扫码验证上料正确性 | 每次生产前 |
| **准备配置** | `/mes/readiness-config` | 配置产线启用的检查项 | 产线初始化时 |
| **准备异常** | `/mes/readiness-exceptions` | 查看/处理就绪检查异常 | 检查失败时 |
| **集成状态** | `/mes/integration/status` | 监控外部系统状态 | 日常监控 |
| **耗材录入** | `/mes/integration/manual-entry` | 手动录入钢网/锡膏状态 | 外部系统离线时 |

### 上料防错详解

```
槽位配置（一次性）                上料验证（每批次）
──────────────────               ──────────────────
FeederSlot                       LoadingRecord
├── slotCode: "F001"             ├── slotCode: "F001"
├── lineId: 产线                  ├── runNo: 批次号
└── description                  ├── materialCode: 实际物料
                                 ├── lotNo: 物料批次
SlotMaterialMapping              ├── verifiedAt: 验证时间
├── productCode: "P-1001"        └── status: LOADED
└── materialCode: "MAT-001"
                                 验证逻辑：
含义：生产 P-1001 时              实际物料 == 期望物料 ?
F001 槽位应上料 MAT-001              ✅ 上料成功
                                     ❌ 物料不匹配
```

### 就绪检查详解

```
检查项              数据来源                    通过条件
──────────────────────────────────────────────────────
ROUTE              RouteVersion               status = READY
LOADING            RunSlotExpectation         全部 verified
EQUIPMENT          TpmEquipment               status = "normal"
MATERIAL           BomItem + Material         库存充足
STENCIL            LineStencil                status = READY
SOLDER_PASTE       LineSolderPaste            status = COMPLIANT
```

---

## 四、生产执行（操作员）

> 实际生产过程的操作

### 执行流程图

```
工单管理                   批次管理                    工位执行
───────────                ──────────                  ─────────
PENDING                    创建 Run                   TrackIn
    │                          │                          │
    ▼ 接收                     ▼                          ▼
RECEIVED                   PREP ──────────────────▶ IN_STATION
    │                          │                          │
    ▼ 释放                     │ 就绪检查                   ▼ TrackOut
RELEASED                       │    │                  (采集数据)
    │                          │    ▼ FAI                 │
    └──▶ 创建批次 ─────────────┘    │                     ▼
                                   ▼                  QUEUED (下一步)
                           AUTHORIZED                 或 DONE
                                   │
                                   ▼
                           IN_PROGRESS
                                   │
                                   ▼ 收尾
                           COMPLETED
```

### 页面说明

| 页面 | 路径 | 作用 | 何时使用 |
|------|------|------|----------|
| **工单管理** | `/mes/work-orders` | 接收/释放工单 | 新工单到达时 |
| **批次管理** | `/mes/runs` | 创建/查看批次列表 | 管理生产批次 |
| **批次详情** | `/mes/runs/$runNo` | 就绪检查/授权/收尾 | 批次全生命周期 |
| **工位执行** | `/mes/execution` | TrackIn/TrackOut 操作 | 实际生产时 |
| **首件检验** | `/mes/fai` | FAI 创建/判定 | 批次首件检验时 |

### TrackIn/TrackOut 详解

```
TrackIn (进站)                    TrackOut (出站)
──────────────                    ──────────────
输入：                             输入：
├── stationCode: 工位代码           ├── stationCode: 工位代码
├── sn: Unit 序列号                ├── sn: Unit 序列号
└── runNo: 批次号                  ├── result: PASS/FAIL
                                   └── data[]: 采集数据
校验：
├── Run 状态 = AUTHORIZED/IN_PROGRESS    校验：
├── Unit 状态 = QUEUED                   ├── Unit 状态 = IN_STATION
├── Unit 当前步骤与工位匹配              ├── 必填采集项已填写
└── Station 属于 Run.line                └── data 值符合规格

结果：                             结果：
└── Unit.status → IN_STATION       ├── PASS: stepNo++ → QUEUED 或 DONE
                                   └── FAIL: status → OUT_FAILED
```

---

## 五、质量闭环（质量工程师）

> 质量检验和不良处置

### 质量流程图

```
FAI (首件检验)                     OQC (出货检验)
──────────────                     ──────────────
创建 FAI                           批次收尾触发
    │                                   │
    ▼ 开始                              ▼
INSPECTING ──▶ 试产执行            OQC 任务创建
    │          (TrackIn/Out)            │
    ▼                                   ▼ 检验
PASS/FAIL ──▶ 授权/重试             PASS/FAIL
                                        │
                                        ▼
                                   PASS → COMPLETED
                                   FAIL → ON_HOLD → MRB

缺陷处置                           返工任务
────────                           ────────
不良 Unit                          创建返工任务
    │                                   │
    ├──▶ 返工 ──▶ 返工任务              ▼
    │         ──▶ 重新执行           OPEN
    │                                   │
    ├──▶ 报废 ──▶ SCRAPPED             ▼ 开始返工
    │                               IN_PROGRESS
    └──▶ 让步放行                       │
                                       ▼ 完成
                                   COMPLETED
```

### 页面说明

| 页面 | 路径 | 作用 | 何时使用 |
|------|------|------|----------|
| **首件检验** | `/mes/fai` | 创建/管理 FAI 任务 | 批次首件检验 |
| **出货检验** | `/mes/oqc` | OQC 任务列表和判定 | 批次收尾后 |
| **OQC 规则** | `/mes/oqc/rules` | 配置抽检规则 | 初始化/规则变更 |
| **缺陷处置** | `/mes/defects` | 不良 Unit 的处置决策 | 有不良时 |
| **返工任务** | `/mes/rework-tasks` | 查看/完成返工任务 | 返工处置后 |

### OQC 规则配置

```
OQC 规则结构
────────────
├── name: 规则名称
├── productScope: 适用产品（ALL / 指定产品）
├── sampleMethod: 抽检方式
│       ├── BY_QTY: 固定数量（如每批 3 件）
│       └── BY_RATIO: 固定比例（如 10%）
├── sampleSize: 抽检数量/比例值
├── isActive: 是否启用
└── triggerPoint: 触发时机（CLOSEOUT）

触发逻辑：
批次收尾 (Closeout)
    ↓
匹配 OQC 规则
    ↓
创建 OQC 任务
    ↓
质量检验
    ↓
PASS → Run.status = COMPLETED
FAIL → Run.status = ON_HOLD → MRB
```

---

## 六、追溯查询（全员）

> 查询生产记录的完整追溯链

### 追溯数据结构

```
Trace 响应结构
──────────────
├── unit: Unit 基本信息
│     ├── sn: 序列号
│     ├── status: 当前状态
│     └── stepNo: 当前/最终步骤
│
├── run: 批次信息
│     ├── runNo: 批次号
│     ├── status: 批次状态
│     └── lineCode: 产线代码
│
├── workOrder: 工单信息
│     ├── woNo: 工单号
│     └── productCode: 产品编码
│
├── route: 路由信息
│     ├── routingCode: 路由代码
│     ├── version: 使用的版本
│     └── steps[]: 步骤列表
│
├── executions[]: 执行历史
│     ├── stepNo: 步骤序号
│     ├── stationCode: 工位代码
│     ├── trackInAt / trackOutAt: 时间
│     ├── result: PASS/FAIL
│     ├── operator: 操作员
│     └── dataValues[]: 采集数据
│
├── loadingRecords[]: 上料记录
│     ├── slotCode: 槽位
│     ├── materialCode: 物料编码
│     ├── lotNo: 物料批次
│     └── loadedAt: 上料时间
│
├── inspections[]: 检验记录
│     ├── type: FAI/OQC
│     ├── status: PASS/FAIL
│     └── completedAt: 完成时间
│
└── defects[]: 不良记录
      ├── defectCode: 缺陷代码
      ├── location: 位置
      ├── disposition: 处置方式
      └── reworkTask: 返工任务
```

### 页面说明

| 页面 | 路径 | 作用 | 何时使用 |
|------|------|------|----------|
| **追溯查询** | `/mes/trace` | 输入 SN 查询完整生产记录 | 质量追溯/客诉分析 |

---

## 七、常见问题 FAQ

### Q1: 上料防错和 BOM 有什么关系？

```
BOM 定义：产品 P-1001 需要物料 MAT-001, MAT-002, MAT-003
          ↓
槽位配置：槽位 F001 → MAT-001 (针对 P-1001)
          槽位 F002 → MAT-002 (针对 P-1001)
          ↓
上料验证：扫描物料条码，校验是否与槽位映射匹配
          ↓
就绪检查(LOADING)：验证所有槽位都已正确上料
```

### Q2: 路由步骤和工作中心的关系？

```
路由 PCBA-STD-V1
├── Step 1: PRINTING ──▶ 工作中心 "印刷组" ──▶ 工位 ST-PRINT-01, ST-PRINT-02
├── Step 2: SPI ──────▶ 工作中心 "SPI组" ───▶ 工位 ST-SPI-01
├── Step 3: MOUNTING ─▶ 工作中心 "贴片组" ──▶ 工位 ST-MOUNT-01, ST-MOUNT-02
├── Step 4: REFLOW ───▶ 工作中心 "回流组" ──▶ 工位 ST-REFLOW-01
└── Step 5: AOI ──────▶ 工作中心 "AOI组" ───▶ 工位 ST-AOI-01

执行时：
Unit 在 Step 1 ──▶ 可在 ST-PRINT-01 或 ST-PRINT-02 执行
Unit 在 Step 2 ──▶ 只能在 ST-SPI-01 执行（该组只有一个工位）
```

### Q3: FAI 试产是什么？

```
FAI 流程：
1. 创建 FAI（指定样本数，如 2 件）
2. 开始 FAI → 状态变为 INSPECTING
3. 试产执行（Run=PREP 时允许的特殊执行模式）
   - TrackIn 试产 Unit
   - TrackOut 试产 Unit（首工序完成）
4. 完成判定
   - 记录检验项
   - PASS → 可授权批次
   - FAIL → 需要重新试产或调整工艺
```

### Q4: 就绪检查各项的数据来源？

| 检查项 | 数据来源 | 如何满足 |
|--------|----------|----------|
| ROUTE | RouteVersion 表 | 发布路由版本 (READY) |
| LOADING | RunSlotExpectation 表 | 完成上料扫码验证 |
| EQUIPMENT | TpmEquipment 表 | 设备状态正常 (TPM 系统) |
| MATERIAL | BomItem + Material 表 | BOM 物料库存充足 (WMS 系统) |
| STENCIL | LineStencil + StencilStatusRecord | 钢网状态合规 (手动录入或集成) |
| SOLDER_PASTE | LineSolderPaste + SolderPasteStatusRecord | 锡膏状态合规 (手动录入或集成) |

### Q5: OQC 失败后会发生什么？

```
OQC FAIL
    ↓
Run.status → ON_HOLD (挂起)
    ↓
MRB (Material Review Board) 决策
    ├── 放行 → Run.status → COMPLETED
    ├── 返修 → 创建返修任务 → Run.status → IN_PROGRESS
    └── 报废 → 批次整体报废
```

---

## 八、快速导航

### 按角色

| 角色 | 常用页面 |
|------|----------|
| **工艺工程师** | 路由管理、采集项、槽位配置、准备配置 |
| **产线组长** | 批次管理、上料防错、准备异常 |
| **操作员** | 工位执行、上料防错 |
| **质量工程师** | FAI、OQC、缺陷处置、追溯查询 |
| **系统管理员** | 集成状态、耗材录入 |

### 按生产阶段

| 阶段 | 页面 |
|------|------|
| **生产前配置** | 物料、BOM、路由、采集项、槽位配置 |
| **生产准备** | 批次创建、上料防错、就绪检查 |
| **首件检验** | FAI、工位执行(试产) |
| **批量生产** | 工位执行、批次详情 |
| **质量收尾** | OQC、缺陷处置、返工任务 |
| **追溯分析** | 追溯查询 |
