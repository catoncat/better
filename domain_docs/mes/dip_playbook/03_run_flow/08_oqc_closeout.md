# OQC 与完工

## 1. 概述
OQC（Outgoing Quality Control，出货质量控制）是 DIP 产线的最后一道质量关卡，确保出货产品符合质量要求。完工后批次进入 COMPLETED 状态。

## 2. OQC 触发

### 2.1 触发条件
| 条件 | 说明 |
|------|------|
| Run 完成 | 所有单件完成时自动触发 |
| 达到批量阈值 | 累计完成 N 件触发 |
| 手动触发 | 质量人员手动创建 |

### 2.2 触发流程
```
所有单件完成测试
    ↓
系统检查 OQC 规则
    ↓
自动创建 OQC（或手动）
    ↓
OQC 任务待执行
```

## 3. OQC 抽样

### 3.1 抽样规则
按 AQL（Acceptable Quality Level）标准抽样：

| 批量范围 | 抽样数（正常） | AQL 2.5 Ac/Re |
|----------|----------------|---------------|
| 2-8 | 2 | 0/1 |
| 9-15 | 3 | 0/1 |
| 16-25 | 5 | 0/1 |
| 26-50 | 8 | 0/1 |
| 51-90 | 13 | 1/2 |
| 91-150 | 20 | 1/2 |
| 151-280 | 32 | 2/3 |
| 281-500 | 50 | 3/4 |

> Ac = 接收数，Re = 拒收数

### 3.2 抽样方式
| 方式 | 说明 |
|------|------|
| 随机抽样 | 系统随机选取 |
| 首尾中抽样 | 首件+尾件+中间 |
| 时间段抽样 | 各时间段均匀抽取 |
| 指定抽样 | 手动指定单件 |

## 4. OQC 检验项

### 4.1 DIP 产品 OQC 检验项
| 检验项 | 方法 | 标准 |
|--------|------|------|
| 外观检查 | 目视 | 无划伤/污染/变形 |
| 焊点质量 | 目视/放大镜 | 光亮圆润无缺陷 |
| 三防漆覆盖 | 目视 | 按图纸覆盖 |
| 尺寸测量 | 卡尺/量具 | 符合图纸要求 |
| 功能抽测 | FCT 设备 | 功能正常 |
| 包装检查 | 目视 | 包装完好 |
| 标签检查 | 核对 | 标签信息正确 |

### 4.2 检验标准配置
```yaml
OQC 配置:
  productId: PROD-A
  aqlLevel: 2.5
  inspectionLevel: NORMAL
  checkItems:
    - name: 外观检查
      type: VISUAL
      critical: false
    - name: 焊点质量
      type: VISUAL
      critical: true
    - name: 功能抽测
      type: FUNCTIONAL
      critical: true
```

## 5. OQC 流程

### 5.1 标准流程
```
OQC 创建
    ↓
确定抽样单件
    ↓
执行检验
    ↓
记录检验结果
    ↓
OQC 判定
    ├─ 合格 → Run = COMPLETED
    └─ 不合格 → Run = ON_HOLD → MRB
```

### 5.2 OQC 状态
| 状态 | 说明 |
|------|------|
| PENDING | 待检验 |
| IN_PROGRESS | 检验中 |
| PASSED | 合格 |
| FAILED | 不合格 |

## 6. OQC 执行

### 6.1 创建 OQC
```
POST /api/oqc/run/:runNo

Response:
{
  "oqcId": "OQC-001",
  "runNo": "RUN-2024-001",
  "sampleSize": 8,
  "sampleUnits": ["UNIT-001", "UNIT-015", ...],
  "status": "PENDING"
}
```

### 6.2 执行检验
```
检验每个抽样单件
    ↓
记录检验结果
    ↓
统计合格/不合格数
    ↓
与 Ac/Re 对比判定
```

### 6.3 完成 OQC
```
POST /api/oqc/:oqcId/complete

Request:
{
  "result": "PASS", // PASS / FAIL
  "checkItems": [
    { "item": "外观检查", "passCount": 8, "failCount": 0 },
    { "item": "焊点质量", "passCount": 8, "failCount": 0 },
    ...
  ],
  "defectUnits": [], // 不良单件
  "completedBy": "QC-001",
  "notes": ""
}
```

## 7. OQC 不合格处理

### 7.1 不合格判定
当不良数 ≥ Re（拒收数）时，OQC 判定不合格。

### 7.2 处理流程
```
OQC 不合格
    ↓
Run = ON_HOLD（挂起）
    ↓
启动 MRB 流程
    ↓
MRB 决策
    ├─ 放行 → Run = COMPLETED
    ├─ 返修 → 创建返修 Run
    └─ 报废 → Run = SCRAPPED
```

### 7.3 不良单件处理
OQC 发现的不良单件：
- 登记不良（Defect）
- 根据 MRB 决策处理
- 可能返修或报废

## 8. MRB 决策

### 8.1 MRB 概述
MRB（Material Review Board，物料评审委员会）负责处理不合格品的最终决策。

### 8.2 决策选项
| 决策 | 说明 | Run 状态 |
|------|------|----------|
| 放行 | 让步接收 | COMPLETED |
| 返修 | 创建返修批次 | CLOSED_REWORK |
| 报废 | 整批报废 | SCRAPPED |

### 8.3 MRB 流程
```
OQC 不合格
    ↓
质量提交 MRB 申请
    ↓
MRB 评审
    - 审核不良信息
    - 评估风险
    - 征求相关方意见
    ↓
MRB 决策
    ↓
执行决策
    ↓
记录决策结果
```

### 8.4 MRB API
```
POST /api/runs/:runNo/mrb-decision

Request:
{
  "decision": "RELEASE", // RELEASE / REWORK / SCRAP
  "reason": "让步接收理由",
  "decidedBy": "MRB-CHAIR",
  "attachments": ["report.pdf"]
}
```

## 9. 完工处理

### 9.1 正常完工
```
OQC 合格
    ↓
Run = COMPLETED
    ↓
生成完工报告
    ↓
更新工单进度
    ↓
触发后续流程（入库/发货）
```

### 9.2 完工数据
| 数据项 | 说明 |
|--------|------|
| 完成数量 | 实际完成单件数 |
| 良品数 | 合格单件数 |
| 不良数 | 不合格单件数 |
| 报废数 | 报废单件数 |
| 完工时间 | 最后一件完成时间 |

### 9.3 完工报告
- 批次基本信息
- 生产统计数据
- 质量统计数据
- 不良分析
- 追溯信息

## 10. 页面与操作

### 10.1 OQC 页面
路径：`/mes/oqc`

功能：
- OQC 任务列表
- 创建 OQC
- 执行 OQC 检验
- 查看 OQC 结果

### 10.2 MRB 决策对话框
路径：`/mes/runs/:runNo` 内的 MRB 对话框

功能：
- 查看不良信息
- 选择决策
- 输入决策理由
- 提交决策

## 11. 相关 API

| 操作 | API | 说明 |
|------|-----|------|
| 创建 OQC | `POST /api/oqc/run/:runNo` | |
| 查询 OQC | `GET /api/oqc` | 支持按 Run 筛选 |
| 完成 OQC | `POST /api/oqc/:oqcId/complete` | |
| MRB 决策 | `POST /api/runs/:runNo/mrb-decision` | |
| 创建返修 Run | `POST /api/runs/:runNo/rework` | MRB 返修时调用 |
