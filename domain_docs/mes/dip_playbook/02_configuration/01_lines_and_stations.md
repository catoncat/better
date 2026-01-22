# 产线与工位配置

## 1. 概述
DIP 产线配置的核心是 **工位（Station）** 而非 SMT 的站位（FeederSlot）。工位代表工艺执行位置，用于追踪 TrackIn/TrackOut 执行与数据采集。

## 2. 产线结构

### 2.1 产线（Line）
产线是 DIP 生产的物理单元，通常按产品类型或产能规模划分。

| 字段 | 说明 | 示例 |
|------|------|------|
| lineCode | 产线编码 | DIP-A, DIP-B |
| name | 产线名称 | DIP 产线 A |
| type | 产线类型 | DIP |
| status | 状态 | ACTIVE, INACTIVE |

### 2.2 工段划分
DIP 产线按工艺流程划分为若干工段：

```
┌──────────────────────────────────────────────────────────────────┐
│                         DIP 产线结构                               │
├────────────┬────────────┬────────────┬────────────┬─────────────┤
│   插件段    │   焊接段    │   后焊段    │   检验段    │   测试段    │
├────────────┼────────────┼────────────┼────────────┼─────────────┤
│ AI 插件     │ 波峰焊      │ 手工焊接    │ 外观检验    │ ICT         │
│ 手工插件    │            │ 剪脚处理    │            │ FCT         │
│ 异形件插件  │            │ 三防漆喷涂  │            │             │
│            │            │ 固化处理    │            │             │
└────────────┴────────────┴────────────┴────────────┴─────────────┘
```

## 3. 工位配置

### 3.1 工位（Station）
每个工位代表一个工艺执行点，关联到特定产线。

| 字段 | 说明 | 示例 |
|------|------|------|
| stationCode | 工位编码 | DIP-A-AI-01 |
| name | 工位名称 | AI 插件工位 1 |
| lineId | 所属产线 | DIP-A |
| stationType | 工位类型 | INSERTION / WAVE / POST_SOLDER / INSPECTION / TEST |
| sequence | 工艺顺序 | 10, 20, 30... |
| status | 状态 | ACTIVE, INACTIVE |

### 3.2 工位类型
| 类型 | 说明 | 典型工位 |
|------|------|----------|
| INSERTION | 插件作业 | AI 插件、手工插件、异形件插件 |
| WAVE | 波峰焊接 | 波峰焊 |
| POST_SOLDER | 后焊处理 | 手工焊接、剪脚、喷涂、固化 |
| INSPECTION | 检验 | 人工外观检验 |
| TEST | 测试 | ICT、FCT |

### 3.3 典型 DIP 产线工位配置示例

```yaml
DIP-A 产线:
  - 工位: DIP-A-AI-01
    名称: AI 插件工位
    类型: INSERTION
    顺序: 10

  - 工位: DIP-A-MI-01
    名称: 手工插件工位
    类型: INSERTION
    顺序: 20

  - 工位: DIP-A-OI-01
    名称: 异形件插件工位
    类型: INSERTION
    顺序: 30

  - 工位: DIP-A-WS-01
    名称: 波峰焊工位
    类型: WAVE
    顺序: 40

  - 工位: DIP-A-HS-01
    名称: 手工焊接工位
    类型: POST_SOLDER
    顺序: 50

  - 工位: DIP-A-TL-01
    名称: 剪脚工位
    类型: POST_SOLDER
    顺序: 60

  - 工位: DIP-A-CC-01
    名称: 三防漆喷涂工位
    类型: POST_SOLDER
    顺序: 70

  - 工位: DIP-A-CU-01
    名称: 固化工位
    类型: POST_SOLDER
    顺序: 80

  - 工位: DIP-A-VI-01
    名称: 外观检验工位
    类型: INSPECTION
    顺序: 90

  - 工位: DIP-A-ICT-01
    名称: ICT 测试工位
    类型: TEST
    顺序: 100

  - 工位: DIP-A-FCT-01
    名称: FCT 测试工位
    类型: TEST
    顺序: 110
```

## 4. 与 SMT 站位的对比

| 维度 | SMT 站位（FeederSlot） | DIP 工位（Station） |
|------|------------------------|---------------------|
| 用途 | 上料防错（物料验证） | 工艺执行追踪 |
| 数量 | 每台机器数十到上百个 | 每条产线约 10-20 个 |
| 关联数据 | 物料映射、上料记录 | 执行记录、测试结果 |
| 扫码场景 | 物料条码验证 | 单件条码追踪 |
| 配置页面 | `/mes/loading/slot-config` | `/mes/stations` |

## 5. 配置要点

### 5.1 工位编码规范
建议采用以下编码规范：
```
{产线编码}-{工段缩写}-{序号}

示例：
- DIP-A-AI-01  = DIP-A 产线，AI 插件，工位 01
- DIP-A-WS-01  = DIP-A 产线，波峰焊，工位 01
- DIP-A-FCT-01 = DIP-A 产线，FCT 测试，工位 01
```

### 5.2 工段缩写参考
| 工段 | 缩写 | 说明 |
|------|------|------|
| AI 插件 | AI | Auto Insertion |
| 手工插件 | MI | Manual Insertion |
| 异形件插件 | OI | Odd-form Insertion |
| 波峰焊 | WS | Wave Soldering |
| 手工焊接 | HS | Hand Soldering |
| 剪脚 | TL | Trimming Lead |
| 三防漆 | CC | Conformal Coating |
| 固化 | CU | Curing |
| 外观检验 | VI | Visual Inspection |
| ICT | ICT | In-Circuit Test |
| FCT | FCT | Functional Test |

### 5.3 顺序配置
- 顺序号建议按 10 递增，便于后续插入新工位
- 顺序号决定路由执行顺序
- 同一工段可有多个并行工位（如多个手工插件工位）

## 6. 页面与 API

### 6.1 配置入口
- 产线管理：`/mes/lines`（系统通用）
- 工位管理：`/mes/stations`

### 6.2 相关 API
| 操作 | API | 说明 |
|------|-----|------|
| 查询工位 | `GET /api/stations` | 支持按产线筛选 |
| 创建工位 | `POST /api/stations` | 需指定产线 |
| 更新工位 | `PUT /api/stations/:id` | |
| 删除工位 | `DELETE /api/stations/:id` | 需无关联数据 |
