# 物料与工装夹具

## 1. 概述
DIP 产线的物料管理与 SMT 有本质区别：
- **SMT**：机台上料，通过站位扫码实时验证
- **DIP**：人工领料，通过发料单管控

DIP 产线还需要管理 **工装夹具**（Tooling），这是 SMT 产线没有的重要配置项。

## 2. 物料管理

### 2.1 DIP 典型物料类型
| 物料类型 | 说明 | 示例 |
|----------|------|------|
| 通孔元器件 | 有引脚的元器件 | 连接器、继电器、大电容、电感 |
| 异形件 | 非标准封装元器件 | 变压器、显示屏、特殊连接器 |
| 辅料 | 焊接辅助材料 | 助焊剂、锡条、三防漆 |
| 工装 | 生产用工装夹具 | 波峰焊治具、测试夹具 |

### 2.2 物料主数据（Material）
| 字段 | 说明 | 示例 |
|------|------|------|
| materialCode | 物料编码 | CONN-001, CAP-100UF |
| name | 物料名称 | 20PIN 连接器 |
| category | 物料类别 | COMPONENT / CONSUMABLE / TOOLING |
| unit | 单位 | PCS, KG, L |
| leadFree | 是否无铅 | true/false |

### 2.3 物料发放流程
DIP 产线不使用站位上料验证，而是通过发料单管理：

```
物料需求（BOM）
    ↓
发料申请
    ↓
仓库发料（扫码出库）
    ↓
线边物料
    ↓
人工领用
    ↓
消耗回报
```

> **注意**：当前系统暂未实现完整的 DIP 发料流程，物料追溯通过执行记录关联。

## 3. 工装夹具管理

### 3.1 夹具类型
| 夹具类型 | 说明 | 典型用途 |
|----------|------|----------|
| 波峰焊治具 | 用于固定 PCB 通过波峰焊 | 波峰焊工位 |
| 测试夹具 | 用于固定 PCB 进行电气测试 | ICT/FCT 工位 |
| 插件治具 | 用于辅助人工插件 | 手工插件工位 |
| 喷涂治具 | 用于三防漆喷涂保护 | 三防漆工位 |

### 3.2 夹具主数据（Tooling）
| 字段 | 说明 | 示例 |
|------|------|------|
| toolingCode | 夹具编码 | WS-JIG-001 |
| name | 夹具名称 | 产品 A 波峰焊治具 |
| type | 夹具类型 | WAVE_JIG / TEST_JIG / INSERT_JIG |
| productId | 适用产品 | 可为空（通用夹具） |
| maxLife | 设计寿命（次数） | 5000 |
| currentLife | 当前使用次数 | 1234 |
| status | 状态 | ACTIVE / MAINTENANCE / SCRAPPED |

### 3.3 夹具寿命管理
```
夹具投入使用
    ↓
每次使用 → currentLife++
    ↓
currentLife >= maxLife * 0.8 → 预警
    ↓
currentLife >= maxLife → 强制报警/禁用
    ↓
TPM 检修 / 报废处理
```

### 3.4 夹具与产品关联
夹具可以是：
- **专用夹具**：关联特定产品，只能用于该产品
- **通用夹具**：无产品关联，可用于多个产品

```yaml
专用夹具示例:
  toolingCode: WS-JIG-PRDA
  name: 产品 A 专用波峰焊治具
  productId: PROD-A
  maxLife: 5000

通用夹具示例:
  toolingCode: TEST-JIG-COMM
  name: 通用 ICT 测试底座
  productId: null
  maxLife: 10000
```

## 4. 夹具分配与使用

### 4.1 夹具分配（ToolingAssignment）
在批次开始前，需将夹具分配到批次：

| 字段 | 说明 |
|------|------|
| toolingId | 夹具 ID |
| runId | 批次 ID |
| stationId | 使用工位 |
| assignedAt | 分配时间 |
| assignedBy | 分配人 |

### 4.2 夹具使用记录（ToolingUsage）
每次使用夹具时记录：

| 字段 | 说明 |
|------|------|
| toolingId | 夹具 ID |
| runId | 批次 ID |
| unitId | 单件 ID（可选） |
| usedAt | 使用时间 |
| usageCount | 使用次数增量 |

### 4.3 使用场景
```
波峰焊工位:
  - 批次开始 → 分配波峰焊治具
  - 每块 PCB 过波峰焊 → 记录使用
  - 批次结束 → 解除分配

ICT 工位:
  - 批次开始 → 分配 ICT 测试夹具
  - 每块 PCB 测试 → 记录使用
  - 批次结束 → 解除分配
```

## 5. 夹具 TPM（预防性维护）

### 5.1 维护触发条件
| 条件 | 触发动作 |
|------|----------|
| 使用次数达到 80% 寿命 | 预警提醒 |
| 使用次数达到 100% 寿命 | 强制停用 |
| 定期维护周期到达 | 维护提醒 |
| 发现异常（测试不良率上升） | 检查要求 |

### 5.2 维护记录
| 字段 | 说明 |
|------|------|
| toolingId | 夹具 ID |
| maintenanceType | 维护类型（定期/异常/更换） |
| performedAt | 维护时间 |
| performedBy | 维护人员 |
| notes | 维护说明 |
| resetLife | 是否重置寿命 |

## 6. 配置要点

### 6.1 夹具编码规范
```
{类型缩写}-{产品代码/COMM}-{序号}

示例：
- WS-JIG-PRDA-001  = 产品 A 波峰焊治具 001
- ICT-JIG-COMM-001 = 通用 ICT 夹具 001
- FCT-JIG-PRDB-001 = 产品 B FCT 夹具 001
```

### 6.2 类型缩写参考
| 类型 | 缩写 |
|------|------|
| 波峰焊治具 | WS-JIG |
| ICT 测试夹具 | ICT-JIG |
| FCT 测试夹具 | FCT-JIG |
| 插件治具 | INS-JIG |
| 喷涂治具 | CC-JIG |

## 7. 页面与 API

### 7.1 配置入口
- 物料管理：`/mes/materials`（系统通用）
- 夹具管理：`/mes/tooling`（待实现）

### 7.2 相关 API（规划）
| 操作 | API | 说明 |
|------|-----|------|
| 查询夹具 | `GET /api/tooling` | 支持按类型/产品筛选 |
| 创建夹具 | `POST /api/tooling` | |
| 更新夹具 | `PUT /api/tooling/:id` | |
| 分配夹具 | `POST /api/tooling/:id/assign` | 分配到批次 |
| 记录使用 | `POST /api/tooling/:id/usage` | 记录使用次数 |
| 维护登记 | `POST /api/tooling/:id/maintenance` | TPM 记录 |
