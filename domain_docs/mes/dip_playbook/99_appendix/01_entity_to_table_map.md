# 实体到数据表映射

## 1. 概述
本文档提供 DIP 产线相关实体与数据库表的映射关系。

## 2. 核心实体映射

### 2.1 产线与工位

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 产线 | `Line` | 产线主数据 |
| 工位 | `Station` | 工位主数据 |

#### Line 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| lineCode | String | 产线编码（唯一） |
| name | String | 产线名称 |
| type | String | 产线类型（DIP/SMT） |
| status | String | 状态 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Station 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| stationCode | String | 工位编码（唯一） |
| name | String | 工位名称 |
| lineId | String | 所属产线 |
| stationType | String | 工位类型 |
| sequence | Int | 工艺顺序 |
| status | String | 状态 |

### 2.2 产品与路由

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 产品 | `Product` | 产品主数据 |
| 路由 | `Routing` | 路由主数据 |
| 路由版本 | `RouteVersion` | 路由版本 |
| 路由步骤 | `RoutingStep` | 路由步骤 |

#### Routing 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| routeCode | String | 路由编码 |
| name | String | 路由名称 |
| productId | String | 关联产品 |
| type | String | 路由类型 |

#### RoutingStep 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| routeVersionId | String | 路由版本 |
| stationId | String | 工位 |
| sequence | Int | 顺序 |
| stepName | String | 步骤名称 |
| required | Boolean | 是否必需 |
| meta | Json | 扩展元数据 |

### 2.3 工单与批次

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 工单 | `WorkOrder` | 工单主数据 |
| 批次 | `Run` | 生产批次 |
| 单件 | `Unit` | 生产单件 |

#### Run 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| runNo | String | 批次号（唯一） |
| workOrderId | String | 工单 |
| lineId | String | 产线 |
| routeVersionId | String | 路由版本 |
| plannedQty | Int | 计划数量 |
| status | String | 状态 |
| authorizedAt | DateTime | 授权时间 |
| completedAt | DateTime | 完成时间 |

#### Unit 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| serialNo | String | 序列号（唯一） |
| runId | String | 批次 |
| status | String | 状态 |
| currentStationId | String | 当前工位 |

### 2.4 执行记录

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 执行记录 | `TrackRecord` | TrackIn/TrackOut 记录 |

#### TrackRecord 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| unitId | String | 单件 |
| stationId | String | 工位 |
| trackInTime | DateTime | 进站时间 |
| trackOutTime | DateTime | 出站时间 |
| result | String | 结果 |
| operatorId | String | 操作员 |
| cycleTime | Int | 周期时间（秒） |
| processData | Json | 工艺数据 |

### 2.5 质量相关

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 首件 | `FAI` | 首件检验 |
| 不良 | `Defect` | 不良记录 |
| 返修任务 | `ReworkTask` | 返修任务 |
| OQC | `OQC` | 出货检验 |

#### Defect 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| unitId | String | 单件 |
| stationId | String | 发现工位 |
| defectCode | String | 不良代码 |
| defectType | String | 不良类型 |
| severity | String | 严重程度 |
| location | String | 不良位置 |
| description | String | 描述 |
| disposition | String | 处置方式 |
| disposedBy | String | 处置人 |
| disposedAt | DateTime | 处置时间 |

#### ReworkTask 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| defectId | String | 关联不良 |
| unitId | String | 单件 |
| reworkStation | String | 返修工位 |
| status | String | 状态 |
| reworkAction | String | 返修动作 |
| reworkBy | String | 返修人 |
| reworkStartTime | DateTime | 开始时间 |
| reworkEndTime | DateTime | 结束时间 |
| result | String | 结果 |

### 2.6 测试相关

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 测试程序 | `TestProgram` | 测试程序配置 |
| 测试记录 | `TestRecord` | 测试结果 |

#### TestRecord 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| unitId | String | 单件 |
| programId | String | 测试程序 |
| stationId | String | 测试工位 |
| result | String | 结果 |
| testTime | DateTime | 测试时间 |
| testItems | Json | 测试项结果 |
| failedItems | Json | 失败项明细 |
| rawData | Json | 原始数据 |
| equipmentId | String | 测试设备 |
| toolingId | String | 测试夹具 |

### 2.7 工装夹具

| 实体 | 数据表 | 说明 |
|------|--------|------|
| 夹具 | `Tooling` | 夹具主数据 |
| 夹具分配 | `ToolingAssignment` | 夹具分配记录 |
| 夹具使用 | `ToolingUsage` | 夹具使用记录 |
| 夹具维护 | `ToolingMaintenance` | 维护记录 |

#### Tooling 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| toolingCode | String | 夹具编码（唯一） |
| name | String | 夹具名称 |
| type | String | 夹具类型 |
| productId | String | 适用产品（可空） |
| maxLife | Int | 设计寿命 |
| currentLife | Int | 当前使用次数 |
| status | String | 状态 |

#### ToolingUsage 表结构
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| toolingId | String | 夹具 |
| runId | String | 批次 |
| unitId | String | 单件（可空） |
| usedAt | DateTime | 使用时间 |
| usageCount | Int | 使用次数 |

## 3. 关系图

```
WorkOrder (1) ──> (n) Run
Run (1) ──> (n) Unit
Run (1) ──> (1) RouteVersion
Run (1) ──> (1) Line
Unit (1) ──> (n) TrackRecord
Unit (1) ──> (n) TestRecord
Unit (1) ──> (n) Defect
Defect (1) ──> (0..1) ReworkTask
Line (1) ──> (n) Station
Tooling (1) ──> (n) ToolingUsage
ToolingUsage (n) ──> (1) Run
```

## 4. 索引建议

### 4.1 常用查询索引
| 表 | 索引字段 | 用途 |
|---|----------|------|
| Unit | runId | 按批次查询单件 |
| Unit | serialNo | 按序列号查询 |
| TrackRecord | unitId | 按单件查询执行记录 |
| TrackRecord | stationId | 按工位查询 |
| TestRecord | unitId | 按单件查询测试记录 |
| Defect | unitId | 按单件查询不良 |
| ToolingUsage | toolingId | 按夹具查询使用记录 |
| ToolingUsage | runId | 按批次查询 |

## 5. 注意事项

1. **ID 生成**：所有主键使用 CUID/UUID
2. **时间字段**：所有时间使用 UTC 存储
3. **软删除**：重要数据使用软删除（deletedAt）
4. **审计字段**：createdAt/updatedAt/createdBy/updatedBy
5. **JSON 字段**：扩展数据使用 JSON 字段存储
