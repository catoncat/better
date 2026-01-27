# MES 多行业支持路线图

> 更新时间：2026-01-27
> 状态：开发参考文档（非任务规划）
> 关联文档：[产品化通用技术方案](./01_product_abstraction.md)

---

> ⚠️ **文档定位说明**
>
> 本文档是**开发参考**，用于帮助 AI 和开发者在实现新功能时考虑通用性设计。
>
> - ❌ **不是任务规划**：不应将本文档的内容作为待办任务加入里程碑或 sprint
> - ❌ **不是执行入口**：`/next` 或任务分拣时不应引用本文档
> - ✅ **是设计参考**：在添加新功能时，参考本文档思考是否可以用更通用的方式实现
> - ✅ **是决策依据**：当需要在"电子行业特定实现"和"通用实现"之间选择时，参考本文档

---

## 1. 背景与目标

当前 MES 系统以 **电子行业（SMT/DIP）** 为核心场景设计。本文档分析系统的行业特定性，记录未来支持其他制造行业（注塑、机加工、装配等）所需的工作方向。

**使用场景**：当 AI 或开发者在实现新功能时，可参考本文档判断：
1. 当前实现是否过于电子行业特定？
2. 是否可以用更通用的方式实现（如使用 `meta Json?` 扩展字段）？
3. 新增的枚举值、表结构是否考虑了未来扩展性？

---

## 2. 当前系统架构分析

### 2.1 行业无关的通用模块（可直接复用）

这些模块是所有离散制造 MES 的核心能力，可以直接复用：

| 模块 | 主要模型 | 说明 |
|------|---------|------|
| **工单管理** | `WorkOrder`, `Run` | 工单下达、接收、释放、状态流转 |
| **工艺路线** | `Routing`, `RoutingStep`, `Operation` | 产品在产线上的工艺路径定义 |
| **产品追溯** | `Unit`, `Track`, `TraceSnapshot` | 单品全生命周期追溯 |
| **物料管理** | `Material`, `MaterialLot`, `BomItem` | 物料基础信息与批次管理 |
| **数据采集** | `DataCollectionSpec`, `DataValue` | 通用数据采集框架 |
| **质量检验** | `Inspection`, `InspectionItem` | FAI/IPQC/OQC 检验框架 |
| **不良品管理** | `Defect`, `Disposition`, `ReworkTask` | 缺陷记录与返修流程 |
| **用户权限** | `User`, `Role`, `UserRoleAssignment` | RBAC + 产线/站点绑定 |
| **审计日志** | `AuditEvent`, `SystemLog` | 操作审计与系统日志 |
| **设备维护** | `MaintenanceRecord` | 通用维护记录 |
| **产线准备** | `ReadinessCheck`, `ReadinessCheckItem` | 准备检查框架（框架通用，检查项需配置化） |
| **时间规则** | `TimeRuleDefinition`, `TimeRuleInstance` | 时间约束规则（规则类型需配置化） |

### 2.2 电子行业特定模块（需要抽象或替换）

| 模块 | 电子行业实现 | 其他行业对应概念 |
|------|-------------|-----------------|
| **工艺类型** | SMT、DIP、回流焊、波峰焊 | 注塑、冲压、焊接、喷涂、装配... |
| **资源管理** | 钢网、锡膏、刮刀 | 模具、刀具、焊丝、涂料... |
| **上料防错** | `FeederSlot`（贴片机料站） | 注塑机料斗、CNC 刀库、装配料架... |
| **烘烤记录** | `BakeRecord`（防潮处理） | 热处理、固化、老化... |
| **炉温曲线** | `ReflowProfile` | 热处理曲线、固化曲线... |
| **检测设备** | AOI、SPI | CMM、X光、超声波、视觉检测... |

### 2.3 关键枚举分析

当前硬编码在 Prisma schema 中的枚举，是行业特定性的主要来源：

```prisma
// 工艺类型 - 电子行业特定
enum ProcessType {
  SMT, DIP, REFLOW, WAVE_SOLDER, BAKE, CLEANING...
}

// 准备检查项 - 电子行业特定
enum ReadinessItemType {
  STENCIL, SOLDER_PASTE, LOADING, PREP_BAKE,
  PREP_PASTE, PREP_STENCIL_USAGE, PREP_STENCIL_CLEAN...
}

// 时间规则 - 电子行业特定
enum TimeRuleType {
  SOLDER_PASTE_EXPOSURE, WASH_TIME_LIMIT...
}

// 资源类型 - 电子行业特定
enum ResourceType {
  STENCIL, SOLDER_PASTE, SQUEEGEE, FIXTURE...
}
```

---

## 3. 多行业支持工作规划

### 3.1 Phase 1: 架构准备（低风险）

**目标**：实现通用抽象模型，不影响现有功能

| 任务 | 说明 | 关联文档 |
|------|------|---------|
| 实现 `ResourceStatusLog` | 资源生命周期事件通用表 | [技术方案 §3.1](./01_product_abstraction.md#31-resourcestatuslog资源生命周期事件) |
| 实现 `LineResourceBinding` | 产线-资源绑定通用表 | [技术方案 §3.2](./01_product_abstraction.md#32-lineresourcebinding产线-资源绑定) |
| 实现 `ProcessRecord` | 时段型工艺记录通用表 | [技术方案 §3.3](./01_product_abstraction.md#33-processrecord时段型工艺记录) |
| 双写验证 | 现有特定表与通用表同时写入，验证数据一致性 | - |

**产出**：
- 通用表 schema 落地
- 数据迁移脚本
- API 适配层（保持旧接口兼容）

### 3.2 Phase 2: 配置化改造（中风险）

**目标**：将硬编码枚举转为可配置

#### 3.2.1 枚举配置化

| 枚举 | 改造方向 |
|------|---------|
| `ProcessType` | 配置表 `ProcessTypeConfig` + 行业模板 |
| `ReadinessItemType` | 配置表 `ReadinessItemConfig` + 行业模板 |
| `TimeRuleType` | 配置表 `TimeRuleConfig` + 行业模板 |
| `ResourceType` | 配置表 `ResourceTypeConfig` + 行业模板 |

**配置表设计示例**：

```prisma
model ProcessTypeConfig {
  id          String   @id @default(cuid())
  code        String   @unique  // "SMT", "INJECTION", "MACHINING"
  name        String             // 显示名称
  industry    String             // "electronics", "injection", "machining"
  description String?
  attributes  Json               // 该工艺类型的属性定义
  validations Json               // 验证规则
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 3.2.2 UI 动态化

| 组件 | 改造内容 |
|------|---------|
| 产线准备页 | 根据配置动态渲染检查项（非硬编码 SMT 项） |
| 上料防错页 | 抽象为"物料-工位绑定"模式，UI 按配置渲染 |
| 资源管理页 | 通用资源 CRUD + 类型驱动的动态表单 |
| 工艺参数页 | 根据 `processType` 配置动态渲染参数表单 |

**产出**：
- 配置表 schema
- 配置管理界面
- UI 组件动态化改造

### 3.3 Phase 3: 行业模板（按需）

**目标**：为每个行业提供开箱即用的配置包

#### 3.3.1 模板目录结构

```
industry_templates/
├── electronics/              # 电子行业（当前配置提取）
│   ├── manifest.json         # 模板元数据
│   ├── process_types.json    # SMT, DIP, REFLOW...
│   ├── resource_types.json   # STENCIL, SOLDER_PASTE...
│   ├── readiness_items.json  # 准备检查项配置
│   ├── time_rules.json       # 时间规则配置
│   └── seed_data.sql         # 初始化数据
│
├── injection_molding/        # 注塑行业
│   ├── manifest.json
│   ├── process_types.json    # INJECTION, COOLING, DEMOLDING
│   ├── resource_types.json   # MOLD, HOPPER, ROBOT_ARM
│   └── ...
│
├── machining/                # 机加工行业
│   ├── process_types.json    # TURNING, MILLING, DRILLING
│   ├── resource_types.json   # CUTTING_TOOL, FIXTURE, GAUGE
│   └── ...
│
└── assembly/                 # 装配行业
    ├── process_types.json    # ASSEMBLY, TESTING, PACKING
    ├── resource_types.json   # JIG, TOOL_KIT, TESTER
    └── ...
```

#### 3.3.2 模板 Manifest 格式

```json
{
  "id": "electronics",
  "name": "电子行业模板",
  "version": "1.0.0",
  "description": "SMT/DIP 电子组装产线配置",
  "includes": [
    "process_types",
    "resource_types",
    "readiness_items",
    "time_rules"
  ],
  "dependencies": [],
  "compatibleWith": ">=2.0.0"
}
```

**产出**：
- 模板规范定义
- 电子行业模板（从现有配置提取）
- 模板加载器
- 新行业模板（按客户需求创建）

### 3.4 Phase 4: ERP 集成适配

当前 ERP 集成是针对金蝶 + 电子行业配置。多行业支持需要：

| 任务 | 说明 |
|------|------|
| 定义通用数据映射层 | 抽象 ERP 数据到 MES 通用模型的映射 |
| 字段映射配置 | 不同行业的 ERP 字段名差异通过配置处理 |
| 适配器模式 | 为不同 ERP 系统提供适配器（金蝶、SAP、用友...） |

**映射配置示例**：

```json
{
  "erp": "kingdee",
  "industry": "electronics",
  "mappings": {
    "material": {
      "FMaterialId": "materialId",
      "FNumber": "code",
      "FName": "name",
      "FMaterialGroup.FNumber": "category"
    },
    "bom": {
      "FBillNo": "bomCode",
      "FMaterialId.FNumber": "parentCode",
      "FEntryMaterialId.FNumber": "childCode"
    }
  }
}
```

---

## 4. 工作量估算

| 阶段 | 占比 | 主要工作 |
|------|------|---------|
| **Phase 1: 架构准备** | 30% | 通用表设计、迁移脚本、API 适配 |
| **Phase 2: 配置化改造** | 40% | 配置表、配置管理界面、UI 动态化 |
| **Phase 3: 行业模板** | 20% | 模板规范、电子行业模板提取、新行业模板 |
| **Phase 4: ERP 适配** | 10% | 映射层、适配器 |

---

## 5. 不同行业的差异对比

### 5.1 电子 vs 注塑

| 维度 | 电子行业 | 注塑行业 |
|------|---------|---------|
| **核心工艺** | SMT 贴片、回流焊 | 注塑成型、冷却、脱模 |
| **关键资源** | 钢网、锡膏、贴片机 | 模具、料筒、注塑机 |
| **上料防错** | 料站-物料绑定 | 料斗-原料绑定 |
| **工艺参数** | 炉温曲线、贴装压力 | 射出压力、保压时间、冷却时间 |
| **质量检测** | AOI、SPI | 外观检查、尺寸测量 |
| **追溯粒度** | 单板级 | 模腔级/批次级 |

### 5.2 电子 vs 机加工

| 维度 | 电子行业 | 机加工行业 |
|------|---------|----------|
| **核心工艺** | SMT、DIP | 车、铣、钻、磨 |
| **关键资源** | 钢网、锡膏 | 刀具、夹具、量具 |
| **上料防错** | 料站验证 | 刀库验证 |
| **工艺参数** | 温度曲线 | 转速、进给、切深 |
| **质量检测** | AOI | CMM、粗糙度仪 |
| **追溯粒度** | 单板级 | 工件级 |

---

## 6. 技术决策点

### 6.1 枚举 vs 配置表

| 方案 | 优势 | 劣势 | 建议 |
|------|------|------|------|
| **保持 enum** | 类型安全、IDE 提示 | 新增类型需 migration | 适合类型稳定的场景 |
| **改用配置表** | 无需 migration、灵活 | 失去编译时检查 | 适合需要频繁扩展的场景 |
| **混合方案** | 核心类型用 enum，扩展类型用配置表 | 复杂度增加 | ✅ 推荐 |

**建议**：采用混合方案
- 核心类型（`RUN_STATUS`, `UNIT_STATUS` 等）保持 enum
- 行业类型（`ProcessType`, `ResourceType` 等）改为配置表

### 6.2 模块隔离策略

| 方案 | 说明 | 适用场景 |
|------|------|---------|
| **单一 Schema** | 所有行业共用一套表 + 配置区分 | 行业差异主要在配置层面 |
| **Schema 拆分** | 按行业拆分 Prisma schema 文件 | 行业差异涉及表结构 |
| **多租户隔离** | 不同行业使用不同数据库 | 数据隔离要求高 |

**建议**：优先选择「单一 Schema + 配置」，保持架构简单。仅当行业表结构差异无法通过 `meta Json?` 覆盖时，才考虑 Schema 拆分。

---

## 7. 关键文件索引

| 文件 | 用途 |
|------|------|
| `domain_docs/mes/spec/architecture/01_product_abstraction.md` | 通用模型技术方案 |
| `domain_docs/mes/spec/architecture/02_multi_industry_roadmap.md` | 本路线图文档 |
| `packages/db/prisma/schema/schema.prisma` | 当前数据库 Schema |
| `domain_docs/mes/tech/db/01_prisma_schema.md` | Schema 文档 |

---

## 8. 总结

当前 MES 系统的核心能力（约 70%）是行业无关的，可以直接复用。多行业支持的关键工作是：

1. **实现通用抽象模型**：`ResourceStatusLog`、`LineResourceBinding`、`ProcessRecord`
2. **枚举配置化**：将 `ProcessType`、`ResourceType` 等从硬编码改为配置表
3. **UI 动态化**：根据配置动态渲染表单和检查项
4. **行业模板**：为每个行业提供开箱即用的配置包

系统已经在 `01_product_abstraction.md` 中规划了技术方案，且大量模型预留了 `meta Json?` 扩展字段，为多行业支持打下了良好基础。
