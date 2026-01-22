# 插件流程

## 1. 概述
插件作业是 DIP 产线的第一个主要工序，将通孔元器件插入 PCB 板。根据自动化程度分为：
- **AI 辅助插件**：自动插件机执行
- **手工插件**：人工插入常规元器件
- **异形件插件**：人工插入非标准元器件

## 2. 插件类型

### 2.1 AI 辅助插件
| 特点 | 说明 |
|------|------|
| 自动化 | 自动插件机执行 |
| 元器件 | 标准轴向/径向元器件 |
| 速度 | 高速（每小时数千件） |
| 精度 | 位置精度高 |

### 2.2 手工插件
| 特点 | 说明 |
|------|------|
| 人工 | 操作员手工插入 |
| 元器件 | 连接器、大电容、继电器等 |
| 速度 | 较慢（依赖熟练度） |
| 灵活性 | 适应多种元器件 |

### 2.3 异形件插件
| 特点 | 说明 |
|------|------|
| 人工 | 需特殊技能操作员 |
| 元器件 | 变压器、显示屏、特殊连接器 |
| 工艺 | 可能需要特殊工具 |
| 检验 | 通常需要加强检验 |

## 3. 插件执行流程

### 3.1 标准流程
```
PCB 进站（TrackIn）
    ↓
扫描 PCB 条码
    ↓
执行插件作业
    ↓
自检/互检
    ↓
PCB 出站（TrackOut）
    ├─ PASS → 流转下一工位
    └─ FAIL → 登记不良 → 返修
```

### 3.2 AI 插件流程
```
1. PCB 上料
   - 操作员将 PCB 放入插件机
   - 扫描 PCB 条码（TrackIn）

2. 程序执行
   - 插件机按程序自动插入元器件
   - 设备监控插件过程

3. 自动检测
   - 设备检测缺件/错件
   - 检测结果自动上传

4. PCB 下料
   - PCB 自动流出或人工取出
   - 记录 TrackOut

5. 结果判定
   - PASS → 流转下一工位
   - FAIL → 人工确认 → 返修或报废
```

### 3.3 手工插件流程
```
1. 领取物料
   - 按 BOM 领取待插元器件
   - 核对物料批次

2. PCB 进站
   - 扫描 PCB 条码（TrackIn）
   - 系统显示插件指导

3. 执行插件
   - 按指导书插入元器件
   - 注意极性和方向

4. 自检
   - 操作员自检插件完成情况
   - 确认无缺件/错件/反极性

5. PCB 出站
   - 确认完成（TrackOut）
   - 标记 PASS/FAIL
```

## 4. 执行记录

### 4.1 TrackIn 记录
| 字段 | 说明 | 示例 |
|------|------|------|
| unitId | 单件 ID | UNIT-001 |
| stationId | 工位 ID | DIP-A-AI-01 |
| trackInTime | 进站时间 | 2024-01-15 08:30:00 |
| operatorId | 操作员 | OP-001 |

### 4.2 TrackOut 记录
| 字段 | 说明 | 示例 |
|------|------|------|
| unitId | 单件 ID | UNIT-001 |
| stationId | 工位 ID | DIP-A-AI-01 |
| trackOutTime | 出站时间 | 2024-01-15 08:32:00 |
| result | 结果 | PASS / FAIL |
| operatorId | 操作员 | OP-001 |
| cycleTime | 周期时间 | 120 秒 |

## 5. 插件不良

### 5.1 常见不良类型
| 不良类型 | 代码 | 说明 |
|----------|------|------|
| 缺件 | INS_MISS | 元器件未插入 |
| 错件 | INS_WRONG | 插入错误元器件 |
| 反极性 | INS_POLAR | 极性插反 |
| 位置偏移 | INS_OFFSET | 插入位置不正 |
| 引脚弯曲 | INS_BENT | 元器件引脚弯曲 |
| 浮高 | INS_FLOAT | 元器件未贴紧 PCB |

### 5.2 不良处理
```
发现不良
    ↓
登记不良（Defect）
    ↓
不良判定
    ├─ 可返修 → 创建返修任务
    └─ 不可返修 → 报废处理
    ↓
返修执行
    ↓
重新检验
    ├─ 合格 → 继续流转
    └─ 不合格 → 再次判定
```

## 6. 插件返修

### 6.1 返修流程
```
1. 接收返修任务
   - 查看不良信息
   - 确认返修方案

2. 执行返修
   - 取出错误元器件
   - 插入正确元器件
   - 修正位置/极性

3. 返修确认
   - 操作员自检
   - 提交返修完成

4. 复检
   - 质量复检（可选）
   - 通过后继续流转
```

### 6.2 返修记录
| 字段 | 说明 |
|------|------|
| defectId | 不良 ID |
| reworkType | 返修类型 |
| reworkAction | 返修动作描述 |
| reworkBy | 返修人员 |
| reworkTime | 返修时间 |
| result | 返修结果 |

## 7. 插件工位配置

### 7.1 典型配置
```yaml
AI 插件工位:
  stationCode: DIP-A-AI-01
  stationType: INSERTION
  equipment: AI-INSERTER-01
  capacity: 5000 件/小时

手工插件工位:
  stationCode: DIP-A-MI-01
  stationType: INSERTION
  operators: 2
  capacity: 100 件/小时

异形件插件工位:
  stationCode: DIP-A-OI-01
  stationType: INSERTION
  operators: 1
  capacity: 50 件/小时
```

### 7.2 并行工位
同一工段可有多个并行工位：
- 多个手工插件工位同时作业
- 单件可分配到任意空闲工位
- 系统跟踪每个单件的实际工位

## 8. 页面与操作

### 8.1 执行页面
路径：`/mes/execution`

功能：
- 选择工位
- 扫描 PCB 条码
- TrackIn/TrackOut 操作
- 不良登记
- 返修确认

### 8.2 操作流程示例
```
1. 操作员选择工位（DIP-A-MI-01）
2. 扫描 PCB 条码 → 自动 TrackIn
3. 执行插件作业
4. 点击"完成"或"不良"
   - 完成 → TrackOut(PASS)
   - 不良 → 选择不良代码 → TrackOut(FAIL) + 登记不良
```

## 9. 相关 API

| 操作 | API | 说明 |
|------|-----|------|
| 进站 | `POST /api/stations/:stationCode/track-in` | |
| 出站 | `POST /api/stations/:stationCode/track-out` | |
| 登记不良 | `POST /api/defects` | |
| 不良处置 | `POST /api/defects/:defectId/disposition` | |
| 查询返修任务 | `GET /api/rework-tasks` | |
