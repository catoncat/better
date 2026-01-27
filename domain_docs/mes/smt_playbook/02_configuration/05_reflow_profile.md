# 炉温程式配置（Reflow Profile）

## 1. 概述
炉温程式（Reflow Profile）用于管理回流焊设备的温区参数配置，确保焊接质量一致性。系统支持程式版本管理和一致性校验门禁。

## 2. 数据结构

### 2.1 ReflowProfile（炉温程式定义）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 |
| code | String | 程式代码（用于设备匹配） |
| name | String | 显示名称 |
| version | String | 版本号（默认 "1.0"） |
| description | String? | 描述 |
| status | Enum | 状态（ACTIVE/INACTIVE/DEPRECATED） |
| zoneConfig | JSON | 温区配置 |
| peakTempMin | Float? | 最低峰值温度（°C） |
| peakTempMax | Float? | 最高峰值温度（°C） |
| totalTimeMin | Int? | 最短总时间（秒） |
| totalTimeMax | Int? | 最长总时间（秒） |

### 2.2 zoneConfig 结构
```json
{
  "zones": [
    { "name": "Preheat", "temp": 150, "time": 60 },
    { "name": "Soak", "temp": 180, "time": 90 },
    { "name": "Reflow", "temp": 245, "time": 45 },
    { "name": "Cooling", "temp": 100, "time": 30 }
  ]
}
```

### 2.3 ReflowProfileUsage（程式使用记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 |
| profileId | String | 关联的程式 ID |
| runId | String? | 关联的 Run（追溯用） |
| lineId | String? | 使用的产线 |
| equipmentId | String? | 设备 ID |
| actualProgramName | String | 设备实际程式名 |
| actualPeakTemp | Float? | 实际峰值温度 |
| actualTotalTime | Int? | 实际周期时间（秒） |
| isMatched | Boolean | 程式名是否匹配 |
| mismatchReason | String? | 不匹配原因 |
| usedAt | DateTime | 使用时间 |
| usedBy | String? | 操作员 |
| verifiedBy | String? | 验证人 |
| verifiedAt | DateTime? | 验证时间 |

## 3. 程式与产品/路由关联

### 3.1 关联方式
程式通过 RoutingStep 与产品关联：
- 每个回流焊工序（RoutingStep）可指定期望的 ReflowProfile
- 路由编译时验证程式有效性
- 执行时校验设备程式与期望程式一致

### 3.2 路由配置
```
RoutingStep:
  - stepCode: "REFLOW"
    stationType: "REFLOW"
    expectedProfileId: "profile-xxx"  # 期望的炉温程式
```

## 4. 程式一致性校验

### 4.1 校验时机
程式一致性校验在以下时机触发：
1. **Readiness 检查**：Run 授权前检查 PREP_PROGRAM 项
2. **执行时校验**：TrackIn 回流焊工位时实时校验

### 4.2 校验逻辑
```
1. 读取设备当前程式名（actualProgramName）
2. 与 RoutingStep.expectedProfileId 对应的 ReflowProfile.code 比对
3. 若不匹配，创建 PREP_PROGRAM 检查项 FAIL
4. 写入 ReflowProfileUsage 记录
```

### 4.3 校验结果
| 结果 | 说明 | 后续动作 |
|------|------|----------|
| MATCHED | 程式匹配 | 通过，继续执行 |
| MISMATCHED | 程式不匹配 | BLOCK，需调整设备程式 |
| NOT_VERIFIED | 未验证 | 警告，可手动确认 |

### 4.4 BLOCK 门禁
程式不匹配时的处理：
- Run 无法授权（Readiness FAIL）
- TrackIn 被阻断（执行时校验）
- 需调整设备程式或豁免

## 5. 程式版本管理

### 5.1 版本策略
- 程式 code 唯一标识程式
- version 字段记录变更版本
- 状态变更：ACTIVE → DEPRECATED（不删除，保留追溯）

### 5.2 版本变更流程
```
1. 创建新版本程式（新 ID，相同 code，新 version）
2. 将旧版本状态改为 DEPRECATED
3. 更新路由的 expectedProfileId
4. 路由重新编译
```

## 6. 页面入口

| 页面 | 路径 | 说明 |
|------|------|------|
| 程式列表 | `/mes/reflow-profiles` | 查看/管理程式 |
| 程式详情 | `/mes/reflow-profiles/:id` | 查看程式配置 |
| 使用记录 | `/mes/reflow-profile-usage` | 查看使用历史 |

## 7. 相关 API

| 操作 | API | 说明 |
|------|-----|------|
| 查询程式列表 | `GET /api/reflow-profiles` | 支持状态筛选 |
| 创建程式 | `POST /api/reflow-profiles` | |
| 更新程式 | `PUT /api/reflow-profiles/:id` | |
| 记录使用 | `POST /api/reflow-profiles/:id/usage` | 记录使用情况 |
| 程式校验 | `POST /api/reflow-profiles/verify` | 校验程式一致性 |

## 8. 与其他模块的关系

```
ReflowProfile
    │
    ├── RoutingStep.expectedProfileId (期望程式)
    │
    ├── ReflowProfileUsage (使用记录)
    │       └── Run (追溯)
    │
    └── ReadinessCheckItem (PREP_PROGRAM)
            └── 门禁校验
```

## 9. 演示数据建议
- 创建至少 2 个有效程式（不同产品）
- 创建 1 个 DEPRECATED 程式（版本变更场景）
- 准备 1 个程式不匹配的测试场景
