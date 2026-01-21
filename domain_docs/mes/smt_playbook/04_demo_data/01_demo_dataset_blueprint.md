# 演示数据蓝图（SMT）

## 1. 目标
为 SMT 流程构建一套“可运行、可验证、可追溯”的演示数据蓝图，支持：
- 真实的上料防错流程
- 完整的 FAI 试产与判定
- 批量执行与追溯
- OQC 抽检与 MRB 决策

## 2. 数据集覆盖范围
演示数据需覆盖以下场景：
- 上料 PASS / WARNING（替代料）/ FAIL（锁定）
- 换料记录（带原因、包装数量）
- FAI PASS 与 FAIL
- 批量执行 PASS/FAIL
- OQC 触发（含“不触发”的情况）
- Trace 查询包含 loadingRecords + inspections + tracks

## 3. 实体清单与建议规模
| 实体 | 建议数量 | 说明 |
|---|---|---|
| Line | 1~2 | SMT 产线（如 SMT-A） |
| FeederSlot | 8~12 | 模拟真实站位表 |
| Material | 30~50 | 真实零件 P/N 覆盖 |
| MaterialLot | 10~20 | 对应上料批次 |
| WorkOrder | 2~3 | 不同产品或路由 |
| Run | 2~3 | 一个 PASS，一个 FAIL，一个 OQC/MRB |
| Unit | 50~200 | 按 Run 计划数量生成 |
| RunSlotExpectation | 每 Run = 站位数 | 站位期望清单 |
| LoadingRecord | 每 Run ≥ 站位数 | 包含替代料/失败/换料 |
| FAI | 每 Run 0~1 | 覆盖 PASS/FAIL |
| OQC | 每 Run 0~1 | 覆盖 PASS/FAIL/不触发 |

## 4. 数据来源与生成方式
### 4.1 配置数据（人工配置）
- Line / FeederSlot / SlotMaterialMapping
- OQC Sampling Rules

### 4.2 外部导入（ERP/同步）
- Material（物料主数据）
- WorkOrder（工单）
- Routing / ExecutableRouteVersion（路由/版本）

### 4.3 运行时生成
- Run（批次）
- RunSlotExpectation（加载站位表时生成）
- LoadingRecord（扫码/换料生成）
- Unit（生成 SN）
- Track / DataValue（执行与数据采集）
- FAI / OQC（检验任务）

## 5. 关键关联关系（必须保证）
- WorkOrder.productCode → SlotMaterialMapping.productCode
- Run.routeVersionId → 路由冻结版本
- RunSlotExpectation.runId + slotId → 期望物料
- LoadingRecord.runId + slotId → 实际上料记录
- Unit.runId → Track → DataValue → Trace

## 6. 命名规范建议（便于识别）
- 产线：`SMT-A`, `SMT-B`
- 站位码：`2F-46`, `1R-14`（与现场一致）
- 工单：`WO-YYYYMMDD-XXX`
- 批次：`RUN-WO-YYYYMMDD-XXX-01`
- 物料批次：`LOT-YYYYMMDD-XXX`
- Unit SN：`SN-${runNo}-0001`

## 7. 场景分配建议（示例）
- Run A：上料 PASS + FAI PASS + OQC PASS
- Run B：上料 FAIL/锁定 + 换料 + FAI FAIL
- Run C：OQC 不触发（无规则或样本=0）

## 8. 生成顺序（必须遵循）
1) 创建 Line / FeederSlot / SlotMaterialMapping
2) 导入 Material / WorkOrder / Routing
3) 创建 Run（绑定产线与路由版本）
4) 生成 Units（SN）
5) 就绪检查通过
6) 加载站位表
7) 扫码上料/换料
8) 创建并完成 FAI
9) 授权 Run
10) 批量执行（TrackIn/TrackOut）
11) OQC 触发与完成
12) Trace 验证

## 9. 数据管理原则
- 配置数据可修改，但要保持版本一致性。
- 运行数据应只追加，不回写（用于真实追溯）。
- 测试数据应有清晰前缀，便于清理。

## 10. 关联文档
- 配置指南：`02_configuration/*`
- 流程指南：`03_run_flow/*`
- 验证步骤：`05_validation/*`
