# 演示批次生成步骤

## 1. 概述
本文档提供生成 DIP 演示数据的详细步骤，按顺序执行可生成完整的演示场景数据。

## 2. 前置条件

### 2.1 系统要求
- 数据库已初始化
- 基础配置已完成（用户/角色/权限）
- API 服务正常运行

### 2.2 准备工作
- 确认数据库无冲突数据
- 准备操作员账号
- 准备质量人员账号

## 3. 第一阶段：配置数据

### 3.1 创建产线
```
操作: 创建产线
页面: /mes/lines
数据:
  - lineCode: DIP-A
    name: DIP 产线 A
    type: DIP
    status: ACTIVE
```

### 3.2 创建工位
```
操作: 批量创建工位
页面: /mes/stations
数据: (按 01_demo_dataset_blueprint.md 工位配置)
验证: 11 个工位创建成功
```

### 3.3 创建产品
```
操作: 创建产品
页面: /mes/products
数据:
  - productCode: PROD-DIP-A
    name: DIP 产品 A
  - productCode: PROD-DIP-B
    name: DIP 产品 B
```

### 3.4 创建路由
```
操作: 创建路由和路由版本
页面: /mes/routes
数据: (按 01_demo_dataset_blueprint.md 路由配置)
验证: 路由包含 10 个步骤
```

### 3.5 创建夹具
```
操作: 创建夹具
页面: /mes/tooling (或 API)
数据:
  - WS-JIG-PRDA-001 (正常寿命)
  - WS-JIG-PRDA-002 (接近寿命预警)
  - ICT-JIG-PRDA-001
  - FCT-JIG-PRDA-001
```

## 4. 第二阶段：工单与批次

### 4.1 创建工单
```
操作: 创建工单
页面: /mes/work-orders (或 API 模拟 ERP 同步)
数据:
  - WO-DIP-001: 产品 A, 数量 200, IN_PROGRESS
  - WO-DIP-002: 产品 A, 数量 100, RELEASED
  - WO-DIP-003: 产品 B, 数量 150, RELEASED
```

### 4.2 创建批次 1（已完成）
```
操作: 创建批次
页面: /mes/runs
数据:
  - runNo: RUN-DIP-001
    workOrderId: WO-DIP-001
    lineId: DIP-A
    plannedQty: 100
```

### 4.3 创建批次 2（执行中）
```
操作: 创建批次
数据:
  - runNo: RUN-DIP-002
    workOrderId: WO-DIP-001
    lineId: DIP-A
    plannedQty: 100
```

### 4.4 创建批次 3（待首件）
```
操作: 创建批次
数据:
  - runNo: RUN-DIP-003
    workOrderId: WO-DIP-002
    lineId: DIP-A
    plannedQty: 100
    (保持 PREP 状态)
```

## 5. 第三阶段：首件与授权

### 5.1 批次 1 首件（已完成场景）
```
步骤:
1. 生成首件单件
2. 创建 FAI: POST /api/fai/run/RUN-DIP-001
3. 执行首件（全流程）
4. 完成 FAI: POST /api/fai/:faiId/complete (PASS)
5. 授权批次: POST /api/runs/RUN-DIP-001/authorize
```

### 5.2 批次 2 首件（执行中场景）
```
步骤:
1. 生成首件单件
2. 创建 FAI
3. 执行首件
4. 完成 FAI (PASS)
5. 授权批次
```

### 5.3 批次 3 保持待首件状态
```
不执行首件，保持 PREP 状态用于演示
```

## 6. 第四阶段：执行记录

### 6.1 批次 1 完整执行
```
生成 100 个单件的完整执行记录:

for 每个单件 (98 个 PASS + 2 个 FAIL):
  1. AI 插件: TrackIn → TrackOut(PASS)
  2. 手工插件: TrackIn → TrackOut(PASS)
  3. 波峰焊: TrackIn → TrackOut(PASS)
  4. 手工焊接: TrackIn → TrackOut(PASS)
  5. 剪脚: TrackIn → TrackOut(PASS)
  6. 三防漆: TrackIn → TrackOut(PASS)
  7. 固化: TrackIn → TrackOut(PASS)
  8. 外观检验: TrackIn → TrackOut(PASS)
  9. ICT: TrackIn → TrackOut(PASS/FAIL)
  10. FCT: TrackIn → TrackOut(PASS/FAIL)

2 个 FAIL 单件:
  - UNIT-045: ICT 失败，报废
  - UNIT-067: FCT 失败，报废
```

### 6.2 批次 2 部分执行
```
生成 55 个单件的执行记录（45 完成 + 10 进行中）:

45 个已完成单件:
  全流程 TrackIn/TrackOut

10 个进行中单件:
  - 3 个在手工插件工位
  - 2 个在波峰焊工位
  - 2 个在 ICT 工位
  - 3 个待返修

3 个待返修单件:
  - UNIT-201: ICT 短路，待返修
  - UNIT-205: 波峰焊虚焊，待返修
  - UNIT-210: 插件缺件，待判定
```

## 7. 第五阶段：测试数据

### 7.1 ICT 测试记录
```
为所有经过 ICT 的单件生成测试记录:

PASS 记录:
  - result: PASS
  - testTime: 15s
  - failedItems: []

FAIL 记录:
  - result: FAIL
  - testTime: 15s
  - failedItems: [
      { item: "SHORT_TEST", location: "U5-PIN3", measured: "0.1Ω" }
    ]
```

### 7.2 FCT 测试记录
```
为所有经过 FCT 的单件生成测试记录:

PASS 记录:
  - result: PASS
  - testTime: 30s
  - testItems: [
      { item: "POWER_ON", result: "PASS" },
      { item: "COMM_TEST", result: "PASS" },
      { item: "GPIO_TEST", result: "PASS" }
    ]

FAIL 记录:
  - result: FAIL
  - testTime: 30s
  - failedItems: [
      { item: "COMM_TEST", result: "FAIL", error: "No response" }
    ]
```

## 8. 第六阶段：不良与返修

### 8.1 登记不良
```
为失败单件登记不良:

POST /api/defects
[
  {
    unitId: "UNIT-045",
    stationId: "DIP-A-ICT-01",
    defectCode: "ICT_SHORT",
    description: "U5 短路"
  },
  {
    unitId: "UNIT-067",
    stationId: "DIP-A-FCT-01",
    defectCode: "FCT_COMM",
    description: "通讯失败"
  },
  {
    unitId: "UNIT-201",
    stationId: "DIP-A-ICT-01",
    defectCode: "ICT_SHORT",
    description: "R12 短路"
  }
]
```

### 8.2 不良处置
```
POST /api/defects/:defectId/disposition

UNIT-045: SCRAP (报废)
UNIT-067: SCRAP (报废)
UNIT-201: REWORK (返修) → 创建返修任务
UNIT-205: REWORK (返修) → 创建返修任务
```

### 8.3 执行返修
```
UNIT-205 返修完成示例:
1. 接收返修任务
2. 执行返修（补焊）
3. 完成返修
4. 复测 → PASS
5. 关闭返修任务
6. 继续执行后续工位
```

## 9. 第七阶段：OQC 与 MRB

### 9.1 批次 1 OQC（合格）
```
1. 创建 OQC: POST /api/oqc/run/RUN-DIP-001
2. 执行 OQC 检验
3. 完成 OQC: POST /api/oqc/:oqcId/complete (PASS)
4. 批次状态 → COMPLETED
```

### 9.2 批次 4 OQC（不合格）
```
创建批次 4 (OQC 不合格场景):
1. 创建批次 RUN-DIP-004
2. 执行完成
3. 创建 OQC
4. 完成 OQC (FAIL) → 批次状态 → ON_HOLD
5. 等待 MRB 决策（保持 PENDING）
```

## 10. 第八阶段：夹具使用记录

### 10.1 记录夹具使用
```
为波峰焊和测试工位记录夹具使用:

每个经过波峰焊的单件:
  POST /api/tooling/:toolingId/usage
  {
    runId: "RUN-ID",
    unitId: "UNIT-ID",
    usageCount: 1
  }

每个经过测试的单件:
  同上
```

### 10.2 夹具寿命更新
```
WS-JIG-PRDA-001: currentLife → 1234 + 执行数量
WS-JIG-PRDA-002: currentLife → 4800 + 少量（预警场景）
```

## 11. 验证检查

### 11.1 数据完整性检查
- [ ] 产线、工位、产品、路由配置完整
- [ ] 工单、批次关联正确
- [ ] 单件状态分布符合预期
- [ ] 执行记录覆盖所有工位
- [ ] 测试记录与执行记录关联
- [ ] 不良与返修记录关联
- [ ] OQC 与批次状态一致
- [ ] 夹具使用记录完整

### 11.2 追溯验证
- [ ] 单件追溯完整
- [ ] 批次追溯完整
- [ ] 夹具追溯完整

## 12. 数据生成脚本

详细脚本见 `03_demo_dataset_script.md`。
