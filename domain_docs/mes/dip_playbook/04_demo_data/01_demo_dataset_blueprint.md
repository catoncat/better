# 演示数据蓝图

## 1. 概述
本文档定义 DIP 产线演示数据的设计蓝图，用于生成真实、完整的演示场景数据。

## 2. 演示场景设计

### 2.1 场景概览
| 场景 | 说明 | 目的 |
|------|------|------|
| 正常生产 | 完整的正常生产流程 | 展示标准流程 |
| 首件检验 | FAI 和 IPQC 流程 | 展示检验门禁 |
| 测试不良 | ICT/FCT 测试失败 | 展示不良处理 |
| 返修流程 | 不良返修与复检 | 展示返修流程 |
| OQC 抽检 | OQC 检验和 MRB | 展示质量闭环 |
| 夹具管理 | 夹具使用与寿命 | 展示夹具追踪 |

### 2.2 数据规模
| 数据类型 | 数量 | 说明 |
|----------|------|------|
| 产线 | 1 | DIP-A |
| 工位 | 11 | 全流程工位 |
| 产品 | 2 | 产品 A、产品 B |
| 工单 | 3 | 不同状态 |
| 批次 | 5 | 不同阶段 |
| 单件 | 500+ | 批次内单件 |
| 夹具 | 4 | 波峰焊+测试 |

## 3. 配置数据设计

### 3.1 产线配置
```yaml
产线:
  - lineCode: DIP-A
    name: DIP 产线 A
    type: DIP
    status: ACTIVE
```

### 3.2 工位配置
```yaml
工位:
  - stationCode: DIP-A-AI-01
    name: AI 插件工位
    lineId: DIP-A
    stationType: INSERTION
    sequence: 10

  - stationCode: DIP-A-MI-01
    name: 手工插件工位
    lineId: DIP-A
    stationType: INSERTION
    sequence: 20

  - stationCode: DIP-A-OI-01
    name: 异形件插件工位
    lineId: DIP-A
    stationType: INSERTION
    sequence: 30

  - stationCode: DIP-A-WS-01
    name: 波峰焊工位
    lineId: DIP-A
    stationType: WAVE
    sequence: 40

  - stationCode: DIP-A-HS-01
    name: 手工焊接工位
    lineId: DIP-A
    stationType: POST_SOLDER
    sequence: 50

  - stationCode: DIP-A-TL-01
    name: 剪脚工位
    lineId: DIP-A
    stationType: POST_SOLDER
    sequence: 60

  - stationCode: DIP-A-CC-01
    name: 三防漆喷涂工位
    lineId: DIP-A
    stationType: POST_SOLDER
    sequence: 70

  - stationCode: DIP-A-CU-01
    name: 固化工位
    lineId: DIP-A
    stationType: POST_SOLDER
    sequence: 80

  - stationCode: DIP-A-VI-01
    name: 外观检验工位
    lineId: DIP-A
    stationType: INSPECTION
    sequence: 90

  - stationCode: DIP-A-ICT-01
    name: ICT 测试工位
    lineId: DIP-A
    stationType: TEST
    sequence: 100

  - stationCode: DIP-A-FCT-01
    name: FCT 测试工位
    lineId: DIP-A
    stationType: TEST
    sequence: 110
```

### 3.3 产品配置
```yaml
产品:
  - productCode: PROD-DIP-A
    name: DIP 产品 A
    category: PCBA
    description: 带通孔元器件的 PCBA

  - productCode: PROD-DIP-B
    name: DIP 产品 B
    category: PCBA
    description: 复杂通孔元器件的 PCBA
```

### 3.4 路由配置
```yaml
路由:
  - routeCode: ROUTE-DIP-PRDA
    name: 产品 A DIP 路由
    productId: PROD-DIP-A
    steps:
      - seq: 10, station: DIP-A-AI-01, name: AI 插件
      - seq: 20, station: DIP-A-MI-01, name: 手工插件
      - seq: 40, station: DIP-A-WS-01, name: 波峰焊
      - seq: 50, station: DIP-A-HS-01, name: 手工焊接
      - seq: 60, station: DIP-A-TL-01, name: 剪脚
      - seq: 70, station: DIP-A-CC-01, name: 三防漆喷涂
      - seq: 80, station: DIP-A-CU-01, name: 固化
      - seq: 90, station: DIP-A-VI-01, name: 外观检验
      - seq: 100, station: DIP-A-ICT-01, name: ICT 测试
      - seq: 110, station: DIP-A-FCT-01, name: FCT 测试
```

### 3.5 夹具配置
```yaml
夹具:
  - toolingCode: WS-JIG-PRDA-001
    name: 产品 A 波峰焊治具 1
    type: WAVE_JIG
    productId: PROD-DIP-A
    maxLife: 5000
    currentLife: 1234

  - toolingCode: WS-JIG-PRDA-002
    name: 产品 A 波峰焊治具 2
    type: WAVE_JIG
    productId: PROD-DIP-A
    maxLife: 5000
    currentLife: 4800  # 接近寿命预警

  - toolingCode: ICT-JIG-PRDA-001
    name: 产品 A ICT 测试夹具
    type: ICT_JIG
    productId: PROD-DIP-A
    maxLife: 10000
    currentLife: 2500

  - toolingCode: FCT-JIG-PRDA-001
    name: 产品 A FCT 测试夹具
    type: FCT_JIG
    productId: PROD-DIP-A
    maxLife: 10000
    currentLife: 3000
```

## 4. 运行数据设计

### 4.1 工单数据
```yaml
工单:
  - workOrderNo: WO-DIP-001
    productId: PROD-DIP-A
    quantity: 200
    status: IN_PROGRESS

  - workOrderNo: WO-DIP-002
    productId: PROD-DIP-A
    quantity: 100
    status: RELEASED

  - workOrderNo: WO-DIP-003
    productId: PROD-DIP-B
    quantity: 150
    status: RELEASED
```

### 4.2 批次数据
```yaml
批次:
  # 已完成批次
  - runNo: RUN-DIP-001
    workOrderId: WO-DIP-001
    lineId: DIP-A
    plannedQty: 100
    status: COMPLETED
    completedQty: 98
    defectQty: 2

  # 执行中批次
  - runNo: RUN-DIP-002
    workOrderId: WO-DIP-001
    lineId: DIP-A
    plannedQty: 100
    status: IN_PROGRESS
    completedQty: 45

  # 待首件批次
  - runNo: RUN-DIP-003
    workOrderId: WO-DIP-002
    lineId: DIP-A
    plannedQty: 100
    status: PREP

  # OQC 挂起批次
  - runNo: RUN-DIP-004
    workOrderId: WO-DIP-002
    lineId: DIP-A
    plannedQty: 50
    status: ON_HOLD

  # 返修批次
  - runNo: RUN-DIP-005
    workOrderId: WO-DIP-001
    lineId: DIP-A
    plannedQty: 5
    status: IN_PROGRESS
    parentRunNo: RUN-DIP-001
```

### 4.3 单件数据分布
```yaml
RUN-DIP-001 (已完成):
  - DONE: 98 件（全流程完成）
  - SCRAPPED: 2 件（报废）

RUN-DIP-002 (执行中):
  - DONE: 45 件
  - IN_PROGRESS: 10 件（分布在不同工位）
  - DEFECTIVE: 3 件（待返修）
  - QUEUED: 42 件
```

### 4.4 执行记录分布
确保执行记录覆盖所有工位：
- 每个工位都有 TrackIn/TrackOut 记录
- 包含正常和不良场景
- 测试记录包含 PASS 和 FAIL

### 4.5 不良与返修数据
```yaml
不良记录:
  - defectCode: ICT_SHORT
    unitId: UNIT-045
    stationId: DIP-A-ICT-01
    description: ICT 测试短路
    disposition: REWORK

  - defectCode: WS_COLD
    unitId: UNIT-067
    stationId: DIP-A-WS-01
    description: 波峰焊虚焊
    disposition: REWORK

  - defectCode: INS_MISS
    unitId: UNIT-089
    stationId: DIP-A-MI-01
    description: 插件缺件
    disposition: SCRAP

返修任务:
  - taskId: REWORK-001
    defectId: DEF-001
    status: COMPLETED
    result: PASS

  - taskId: REWORK-002
    defectId: DEF-002
    status: IN_PROGRESS
```

### 4.6 OQC 与 MRB 数据
```yaml
OQC 记录:
  - oqcId: OQC-001
    runNo: RUN-DIP-001
    status: PASSED
    sampleSize: 8
    defectCount: 0

  - oqcId: OQC-002
    runNo: RUN-DIP-004
    status: FAILED
    sampleSize: 5
    defectCount: 2

MRB 决策:
  - runNo: RUN-DIP-004
    decision: PENDING
```

## 5. 测试数据设计

### 5.1 ICT 测试数据
```yaml
ICT 测试记录:
  - 正常 PASS 记录: 90%
  - FAIL 记录: 10%
    - 短路: 4%
    - 开路: 3%
    - 参数偏差: 3%
```

### 5.2 FCT 测试数据
```yaml
FCT 测试记录:
  - 正常 PASS 记录: 95%
  - FAIL 记录: 5%
    - 功能异常: 3%
    - 通讯失败: 2%
```

## 6. 追溯数据关联

### 6.1 追溯链路
确保以下追溯关联完整：
- 单件 → 批次 → 工单 → 产品
- 单件 → 执行记录 → 工位
- 单件 → 测试记录 → 测试程序
- 单件 → 不良记录 → 返修记录
- 批次 → 夹具使用记录

### 6.2 追溯查询场景
- 根据单件查询完整生产历史
- 根据批次查询所有单件状态
- 根据夹具查询使用过的单件
- 根据不良查询影响范围

## 7. 数据生成顺序

1. 配置数据（产线 → 工位 → 产品 → 路由 → 夹具）
2. 工单数据
3. 批次数据
4. 单件数据
5. FAI/IPQC 数据
6. 执行记录（按工位顺序）
7. 测试记录
8. 不良与返修数据
9. OQC 与 MRB 数据
10. 夹具使用记录

详细生成步骤见 `02_demo_run_recipe.md`。
