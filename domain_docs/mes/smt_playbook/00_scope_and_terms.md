# 范围与术语

## 1. 适用范围
本文档集描述 SMT 产线在本系统中的配置与执行流程，覆盖：
- 工单/批次（Run）
- 产线与站位配置
- 上料防错（加载站位表、扫码验证、换料）
- 首件（FAI）
- 批量执行（TrackIn/TrackOut）
- OQC 与完工
- 追溯输出

不覆盖：DIP/测试/维修等后段流程。

## 2. 角色与职责
- 计划/生管：下达工单，创建或释放批次
- 工艺工程师：配置站位与物料映射、路由/程序
- 线长/班组长：组织上料与首件确认
- 操作员：扫码上料、执行站位作业
- 质量（IPQC/OQC）：首件判定、抽检与处置

## 3. 核心术语与系统实体
| 术语 | 系统实体 | 说明 | 主要配置/入口 |
|---|---|---|---|
| 产线 | Line | SMT 线体（如 SMT-A） | 产线管理（系统已有入口） |
| 站位/槽位 | FeederSlot | 飞达位置，属于产线 | `/mes/loading/slot-config` |
| 物料 | Material | 物料主数据（编码/名称/单位） | ERP 同步或物料管理 |
| 物料批次 | MaterialLot | 物料批次（物料编码 + 批次号） | 上料扫码自动生成或批次管理 |
| 站位映射 | SlotMaterialMapping | 站位与物料的对应规则 | `/mes/loading/slot-config` |
| 批次 | Run | 生产批次（PREP/AUTHORIZED/IN_PROGRESS 等） | `/mes/runs` |
| 工单 | WorkOrder | 工单与产品信息 | ERP 同步或工单管理 |
| 路由 | Routing / RouteVersion | 工艺路径与版本 | `/mes/routes` |
| 上料期望 | RunSlotExpectation | 批次级“应上料清单” | 加载站位表时生成 |
| 上料记录 | LoadingRecord | 实际上料记录 | 扫码验证写入 |
| 首件 | FAI | 首件检验任务 | `/mes/fai` |
| 执行记录 | TrackIn/TrackOut | 工位执行事件 | `/mes/execution` |
| OQC | OQC | 出货抽检 | `/mes/oqc` |
| 追溯 | Trace | 单件/批次追溯输出 | `/mes/trace` |

## 4. 站位与工位的区别
- 站位（FeederSlot）：上料位置，用于“上料防错”。
- 工位（Station）：工艺执行位置，用于 TrackIn/TrackOut 执行与数据采集。

## 5. 条码约定
- 上料扫码格式：`物料编码|批次号`。
- 站位扫码：机台站位二维码或手工输入站位码。
- 具体规则详见 `99_appendix/03_barcode_rules.md`。
