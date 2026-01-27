# 维修管理（Maintenance）

## 1. 概述
维修管理模块用于记录和跟踪 DIP 产线中设备、夹具等实体的维修过程，确保维修记录可追溯，并与 Readiness 检查联动。

> **注意**：DIP 产线的维修管理与 SMT 类似，但实体类型有所不同。详细的数据结构和 API 说明请参考 SMT Playbook 的 `09_maintenance.md`。

## 2. DIP 适用的维修实体类型

### 2.1 实体类型
| 实体类型 | 说明 | 典型场景 |
|----------|------|----------|
| FIXTURE | 夹具 | 波峰焊治具磨损、变形；测试夹具损坏 |
| EQUIPMENT | 设备 | 波峰焊设备故障、AI 插件机故障 |

### 2.2 DIP 特有场景

#### 波峰焊治具维修
| 问题类型 | 描述 | 维修方式 |
|----------|------|----------|
| 变形 | 治具因高温变形 | 矫正或更换 |
| 磨损 | 定位孔/导轨磨损 | 研磨或更换 |
| 残锡堆积 | 治具底部残锡 | 清洗 |
| 焊接损坏 | 焊料飞溅损坏 | 维修或更换 |

#### 测试夹具维修
| 问题类型 | 描述 | 维修方式 |
|----------|------|----------|
| 探针磨损 | 接触不良 | 更换探针 |
| 定位偏移 | 定位销磨损 | 更换定位销 |
| 线缆损坏 | 连接线断裂 | 更换线缆 |
| 气动故障 | 气缸/阀门故障 | 维修气动件 |

#### 波峰焊设备维修
| 问题类型 | 描述 | 维修方式 |
|----------|------|----------|
| 温度异常 | 锡锅/预热温度不稳 | 校准或更换加热元件 |
| 传送故障 | 传送带卡顿 | 调整或更换皮带 |
| 喷涂故障 | 助焊剂喷涂不均 | 清洗或更换喷嘴 |
| 波峰异常 | 锡波高度/形状异常 | 调整参数或维修泵体 |

## 3. 维修状态流转

与 SMT 维修管理相同：

```
PENDING → IN_PROGRESS → COMPLETED → VERIFIED
```

| 状态 | 说明 |
|------|------|
| PENDING | 待处理（已报修，等待处理） |
| IN_PROGRESS | 维修中 |
| COMPLETED | 已完成（等待验证） |
| VERIFIED | 已验证（可恢复使用） |
| CANCELLED | 已取消 |

## 4. 维修流程

### 4.1 报修
```
POST /api/maintenance-records

Request:
{
  "entityType": "FIXTURE",
  "entityId": "fixture-wave-001",
  "entityDisplay": "波峰焊治具-A1-001",
  "maintenanceType": "REPAIR",
  "description": "治具变形导致 PCB 定位偏移"
}
```

### 4.2 开始维修
```
POST /api/maintenance-records/:id/start

Request:
{
  "assignedTo": "维修员-001"
}
```

### 4.3 完成维修
```
POST /api/maintenance-records/:id/complete

Request:
{
  "resolution": "矫正变形部位，更换定位销",
  "partsReplaced": "定位销 x2",
  "cost": 120
}
```

### 4.4 验证维修
```
POST /api/maintenance-records/:id/verify

Request:
{
  "remark": "已验证，治具定位精度恢复正常"
}
```

## 5. 与 Readiness 的联动

### 5.1 维修中实体的 Readiness 检查
当夹具处于维修状态（有 PENDING/IN_PROGRESS 的维修记录）时：
- **波峰焊治具**检查项 FAIL
- **测试夹具**检查项 FAIL

### 5.2 检查逻辑
```
就绪检查时：
1. 查询该 Run 关联的夹具
2. 检查夹具是否有未完成的维修记录
3. 若存在 → 检查项 FAIL，原因："夹具正在维修中"
4. 若不存在 → 继续其他检查（寿命、校准等）
```

### 5.3 维修完成后
- 维修验证通过（VERIFIED）后
- 夹具状态恢复正常
- 重新执行 Readiness 检查可通过

## 6. 页面入口

| 页面 | 路径 | 说明 |
|------|------|------|
| 维修记录列表 | `/mes/maintenance-records` | 查看所有维修记录 |
| 创建维修记录 | `/mes/maintenance-records/new` | 报修入口 |
| 维修详情 | `/mes/maintenance-records/:id` | 查看/更新维修状态 |

## 7. 相关 API

| 操作 | API | 说明 |
|------|-----|------|
| 查询维修记录 | `GET /api/maintenance-records` | 支持按状态/实体筛选 |
| 创建维修记录 | `POST /api/maintenance-records` | 报修 |
| 开始维修 | `POST /api/maintenance-records/:id/start` | |
| 完成维修 | `POST /api/maintenance-records/:id/complete` | |
| 验证维修 | `POST /api/maintenance-records/:id/verify` | |
| 取消维修 | `POST /api/maintenance-records/:id/cancel` | |

## 8. 与 SMT 维修管理的区别

| 维度 | SMT | DIP |
|------|-----|-----|
| 夹具类型 | 载板夹具 | 波峰焊治具、测试夹具 |
| 钢网维修 | 有 | 无（DIP 无钢网） |
| 刮刀维修 | 有 | 无（DIP 无刮刀） |
| 设备类型 | 贴片机、回流焊 | AI 插件机、波峰焊 |
| 时间规则 | 有（锡膏暴露等） | 无 |

## 9. 演示数据建议
- 创建 1 个 PENDING 状态的波峰焊治具维修记录
- 创建 1 个 IN_PROGRESS 状态的测试夹具维修记录
- 创建 1 个 VERIFIED 状态的波峰焊设备维修记录（已完成）
