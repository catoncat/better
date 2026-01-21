# 数据来源与管理边界

## 1. 总体原则
- 系统区分“配置数据”和“运行数据”。
- 配置数据由工程/计划维护，运行数据由现场操作产生并自动沉淀。
- 演示数据应尽量模拟真实来源与生成顺序，避免跳过关键前置条件。

## 2. 数据来源分类
### 2.1 ERP/外部系统导入
- 物料主数据（Material）
- 工单（WorkOrder）
- 产品/路由（Routing/RouteVersion）
- 线体与工作中心（WorkCenter）

来源：ERP 同步接口或手动导入。

### 2.2 人工配置
- 产线（Line）
- 站位（FeederSlot）
- 站位物料映射（SlotMaterialMapping）
- 站位别名/位置描述（slotName/position）

来源：工程师/管理员在配置页面维护。

### 2.3 运行时自动生成
- 批次（Run）
- 上料期望（RunSlotExpectation）
- 上料记录（LoadingRecord）
- 首件任务与记录（FAI）
- 执行记录（TrackIn/TrackOut）
- OQC 记录
- 追溯输出（Trace）

来源：执行流程或扫码行为自动写入。

## 3. 关键数据如何产生
| 数据 | 产生时机 | 关键依赖 | 生成方式 |
|---|---|---|---|
| Line | 系统初始化/工程配置 | 无 | 管理员创建 |
| FeederSlot | 站位配置阶段 | Line | 在 `/mes/loading/slot-config` 创建 |
| SlotMaterialMapping | 站位配置阶段 | FeederSlot + Material | 在 `/mes/loading/slot-config` 创建 |
| Material | ERP 导入 | 物料主数据 | ERP 同步或导入 |
| MaterialLot | 上料扫码 | Material + 批次号 | 扫码时自动 upsert 或批次管理 |
| WorkOrder | ERP 导入 | 计划 | ERP 同步 |
| Run | 批次创建 | WorkOrder + Line + RouteVersion | `/mes/runs` 创建 |
| RunSlotExpectation | 加载站位表 | Run + SlotMaterialMapping | `/api/runs/:runNo/loading/load-table` |
| LoadingRecord | 上料扫码验证 | RunSlotExpectation + MaterialLot | `/api/loading/verify` |
| FAI | 首件创建 | Run | `/mes/fai` 创建 |
| TrackIn/TrackOut | 执行 | Run + Station | `/mes/execution` 操作 |
| OQC | 完工前抽检 | Run | OQC 抽样规则触发 |
| Trace | 查询 | Run + Unit + LoadingRecord | `/mes/trace` 动态生成 |

## 4. 数据如何管理
### 4.1 配置数据管理
- 所属角色：工艺工程师、管理员
- 更新频率：较低（变更需审核或确认）
- 约束：
  - 站位必须属于产线（`lineId + slotCode` 唯一）
  - 站位映射必须绑定有效站位
  - 映射支持“通用/产品/路由”三种粒度

### 4.2 运行数据管理
- 所属角色：操作员/班组长/质量
- 更新频率：随生产实时发生
- 约束：
  - 批次需在 PREP 状态才允许上料
  - 上料验证必须先加载站位表
  - 站位错误扫码会触发锁定与异常流程

## 5. 演示数据生成建议
- 先准备“配置数据”，再生成“运行数据”。
- 运行数据严格按流程顺序生成，确保后续验证可重复。
- 演示批次至少包含：
  - 产线、站位、站位映射
  - 物料主数据
  - 工单与批次
  - 上料记录（含替代料与失败场景）

后续具体演示数据模板见 `04_demo_data/`。
