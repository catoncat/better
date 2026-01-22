# 路由与产品

## 1. 概述
DIP 产线的路由配置定义了产品的工艺流程，与 SMT 共享路由基础设施，但步骤类型和内容有明显区别。

## 2. 路由结构

### 2.1 路由层级
```
Routing（路由主数据）
    ↓
RouteVersion（路由版本）
    ↓
RoutingStep（路由步骤）
    ↓
Station（工位）
```

### 2.2 路由主数据（Routing）
| 字段 | 说明 | 示例 |
|------|------|------|
| routeCode | 路由编码 | ROUTE-DIP-PRDA |
| name | 路由名称 | 产品 A DIP 工艺路由 |
| productId | 关联产品 | PROD-A |
| type | 路由类型 | DIP |

### 2.3 路由版本（RouteVersion）
| 字段 | 说明 | 示例 |
|------|------|------|
| versionCode | 版本编码 | V1.0 |
| status | 状态 | DRAFT / ACTIVE / OBSOLETE |
| effectiveFrom | 生效日期 | 2024-01-01 |
| effectiveTo | 失效日期 | null（长期有效）|

## 3. DIP 路由步骤

### 3.1 典型 DIP 路由步骤
```yaml
产品 A DIP 路由:
  version: V1.0
  steps:
    - seq: 10
      station: DIP-A-AI-01
      stepType: INSERTION
      name: AI 插件
      required: true

    - seq: 20
      station: DIP-A-MI-01
      stepType: INSERTION
      name: 手工插件
      required: true

    - seq: 30
      station: DIP-A-OI-01
      stepType: INSERTION
      name: 异形件插件
      required: false  # 可选步骤

    - seq: 40
      station: DIP-A-WS-01
      stepType: WAVE
      name: 波峰焊
      required: true

    - seq: 50
      station: DIP-A-HS-01
      stepType: POST_SOLDER
      name: 手工焊接
      required: true

    - seq: 60
      station: DIP-A-TL-01
      stepType: POST_SOLDER
      name: 剪脚处理
      required: true

    - seq: 70
      station: DIP-A-CC-01
      stepType: POST_SOLDER
      name: 三防漆喷涂
      required: false  # 根据产品配置

    - seq: 80
      station: DIP-A-CU-01
      stepType: POST_SOLDER
      name: 固化处理
      required: false  # 与喷涂配套

    - seq: 90
      station: DIP-A-VI-01
      stepType: INSPECTION
      name: 外观检验
      required: true

    - seq: 100
      station: DIP-A-ICT-01
      stepType: TEST
      name: ICT 测试
      required: true

    - seq: 110
      station: DIP-A-FCT-01
      stepType: TEST
      name: FCT 测试
      required: true
```

### 3.2 步骤类型（RoutingStep.stepType）
| 类型 | 说明 | 执行特点 |
|------|------|----------|
| INSERTION | 插件作业 | 可并行（多工位）|
| WAVE | 波峰焊接 | 单工位，批量处理 |
| POST_SOLDER | 后焊处理 | 顺序执行 |
| INSPECTION | 检验 | 可设置抽检比例 |
| TEST | 测试 | 需测试程序配置 |

### 3.3 步骤元数据（RoutingStep.meta）
| 字段 | 说明 | 示例 |
|------|------|------|
| stepGroup | 工段分组 | INSERTION / WAVE / POST_SOLDER / TEST |
| ipqcRequired | 是否需要段首件 | true/false |
| toolingRequired | 是否需要夹具 | true/false |
| testProgramId | 测试程序 ID | PROG-ICT-001 |
| cycleTime | 标准工时（秒） | 30 |

## 4. 与 SMT 路由的区别

| 维度 | SMT 路由 | DIP 路由 |
|------|----------|----------|
| 步骤数量 | 较少（3-5 步） | 较多（8-12 步） |
| 可选步骤 | 较少 | 较多（喷涂/固化/异形件） |
| 测试步骤 | 通常无 | ICT + FCT |
| 夹具关联 | 无 | 波峰焊/测试夹具 |
| 段首件 | 通常无 | 后焊/测试需段首件 |

## 5. 产品配置

### 5.1 产品主数据（Product）
| 字段 | 说明 | 示例 |
|------|------|------|
| productCode | 产品编码 | PROD-A |
| name | 产品名称 | 产品 A |
| routeId | 默认路由 | ROUTE-DIP-PRDA |
| bomId | BOM | BOM-PRDA-V1 |

### 5.2 产品与路由关系
```
产品可以有多个路由版本：
- 常规路由（含所有步骤）
- 简化路由（跳过三防漆）
- 返修路由（部分步骤）

每个工单可指定使用哪个路由版本。
```

## 6. 路由步骤条件

### 6.1 条件跳过
某些步骤可以根据条件跳过：

```yaml
步骤: 三防漆喷涂
条件: product.meta.conformalCoating == true
跳过: 若条件不满足则跳过此步骤及固化步骤
```

### 6.2 分支路由
某些产品可能有分支路由：

```yaml
步骤: 外观检验
分支条件:
  - 合格 → 继续测试
  - 轻微不良 → 返修后重检
  - 严重不良 → MRB 决策
```

## 7. 路由与首件/IPQC

### 7.1 FAI 门禁
- 路由首段（通常是 AI 插件）需要首件确认
- FAI 通过后整个 Run 获得授权

### 7.2 段首件（IPQC）
- 后焊段首件：后焊作业开始前检查
- 测试段首件：测试开始前检查
- 用 IPQC 记录，不作为 Run 授权门禁

## 8. 配置要点

### 8.1 路由编码规范
```
ROUTE-{类型}-{产品代码}

示例：
- ROUTE-DIP-PRDA = 产品 A 的 DIP 路由
- ROUTE-SMT-PRDA = 产品 A 的 SMT 路由
```

### 8.2 组合路由
某些产品需要 SMT + DIP 组合路由：

```yaml
组合路由示例:
  - SMT 段:
      - 锡膏印刷
      - 贴片
      - 回流焊
  - DIP 段:
      - 插件
      - 波峰焊
      - 后焊
      - 测试
```

可通过 `RoutingStep.meta.stepGroup` 标注工段。

## 9. 页面与 API

### 9.1 配置入口
- 路由管理：`/mes/routes`
- 产品管理：`/mes/products`

### 9.2 相关 API
| 操作 | API | 说明 |
|------|-----|------|
| 查询路由 | `GET /api/routes` | 支持按产品筛选 |
| 查询路由版本 | `GET /api/routes/:id/versions` | |
| 查询路由步骤 | `GET /api/route-versions/:id/steps` | |
| 创建路由 | `POST /api/routes` | |
| 添加步骤 | `POST /api/route-versions/:id/steps` | |
