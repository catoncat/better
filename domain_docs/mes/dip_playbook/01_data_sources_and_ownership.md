# 数据来源与管理边界

## 1. 总体原则
- 系统区分"配置数据"和"运行数据"。
- 配置数据由工程/计划维护，运行数据由现场操作产生并自动沉淀。
- 演示数据应尽量模拟真实来源与生成顺序，避免跳过关键前置条件。
- DIP 与 SMT 共享基础主数据（物料、工单、路由），但执行流程数据独立。

## 2. 数据来源分类

### 2.1 ERP/外部系统导入
- 物料主数据（Material）
- 工单（WorkOrder）
- 产品/路由（Routing/RouteVersion）
- 线体与工作中心（WorkCenter）

**来源**：ERP 同步接口或手动导入。

### 2.2 人工配置
- 产线（Line）
- 工位（Station）
- 工装夹具（Tooling）- DIP 特有
- 测试程序配置 - DIP 特有
- 检验规则（IPQC 巡检点配置）

**来源**：工程师/管理员在配置页面维护。

### 2.3 运行时自动生成
- 批次（Run）
- 首件任务与记录（FAI）
- IPQC 记录（段首件/巡检）
- 执行记录（TrackIn/TrackOut）
- 测试记录（ICT/FCT 结果）
- 不良记录（Defect）
- 返修任务（ReworkTask）
- OQC 记录
- 追溯输出（Trace）
- 工装夹具使用记录

**来源**：执行流程或扫码行为自动写入。

## 3. 关键数据如何产生

### 3.1 配置阶段数据
| 数据 | 产生时机 | 关键依赖 | 生成方式 |
|------|----------|----------|----------|
| Line | 系统初始化/工程配置 | 无 | 管理员创建 |
| Station | 工位配置阶段 | Line | 工程师在工位管理创建 |
| Tooling | 夹具配置阶段 | 无 | 工程师在夹具管理创建 |
| Material | ERP 导入 | 物料主数据 | ERP 同步或导入 |
| Routing | 路由配置阶段 | Station + Material | 工程师在路由管理配置 |
| TestProgram | 测试程序配置 | Station | 测试工程师配置 |

### 3.2 运行阶段数据
| 数据 | 产生时机 | 关键依赖 | 生成方式 |
|------|----------|----------|----------|
| WorkOrder | ERP 导入 | 计划 | ERP 同步 |
| Run | 批次创建 | WorkOrder + Line + RouteVersion | `/mes/runs` 创建 |
| FAI | 首件创建 | Run | `/mes/fai` 创建 |
| IPQCRecord | 段首件/巡检 | Run + Station | IPQC 执行 |
| TrackIn | 工位进站 | Run + Station + Unit | `/mes/execution` 操作 |
| TrackOut | 工位出站 | TrackIn | `/mes/execution` 操作 |
| TestRecord | 测试执行 | TrackOut + TestProgram | 测试完成写入 |
| Defect | 不良发现 | Unit + Station | 不良登记 |
| ReworkTask | 返修决策 | Defect | 不良处置生成 |
| ToolingUsage | 夹具使用 | Tooling + Run | 执行时自动记录 |
| OQC | 完工前抽检 | Run | OQC 抽样规则触发 |
| Trace | 查询 | Run + Unit + 执行记录 | `/mes/trace` 动态生成 |

## 4. 数据如何管理

### 4.1 配置数据管理
- **所属角色**：工艺工程师、测试工程师、管理员
- **更新频率**：较低（变更需审核或确认）
- **约束**：
  - 工位必须属于产线（`lineId + stationCode` 唯一）
  - 路由步骤必须绑定有效工位
  - 测试程序必须关联测试工位
  - 夹具必须有有效的寿命配置

### 4.2 运行数据管理
- **所属角色**：操作员/班组长/质量/测试技术员
- **更新频率**：随生产实时发生
- **约束**：
  - 批次需在 AUTHORIZED 状态才允许执行
  - FAI 必须先创建再执行
  - 测试不通过需登记不良并决定返修/报废
  - 夹具使用次数达到寿命需报警

## 5. DIP 特有数据流

### 5.1 无上料防错
与 SMT 不同，DIP 产线不使用站位上料防错：
- SMT：`SlotMaterialMapping` → `RunSlotExpectation` → `LoadingRecord`
- DIP：物料通过发料单发放，无实时扫码验证

### 5.2 工装夹具追踪
DIP 产线需要追踪工装夹具使用：
```
Tooling（夹具主数据）
    ↓
ToolingAssignment（夹具分配到 Run/Line）
    ↓
ToolingUsage（每次使用记录）
    ↓
ToolingLife（寿命累计与报警）
```

### 5.3 测试数据流
DIP 产线通常包含 ICT 和 FCT 两种测试：
```
TestProgram（测试程序配置）
    ↓
TestStation（测试工位）
    ↓
TrackIn → 测试执行 → TrackOut
    ↓
TestRecord（测试结果）
    ↓
PASS → 下一工位 / FAIL → Defect → ReworkTask
```

## 6. 演示数据生成建议

### 6.1 生成顺序
1. 先准备"配置数据"（产线 → 工位 → 夹具 → 路由）
2. 再生成"运行数据"（工单 → 批次 → 执行）
3. 运行数据严格按流程顺序生成

### 6.2 演示批次至少包含
- 产线与工位配置
- 工装夹具（波峰焊治具、测试夹具）
- 物料主数据
- 工单与批次
- 完整执行记录（插件→焊接→后焊→测试）
- 测试结果（含 PASS 和 FAIL 场景）
- 不良与返修记录
- OQC 与 MRB 决策

后续具体演示数据模板见 `04_demo_data/`。
