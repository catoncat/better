# OQC 与完工（抽检 → MRB → Closeout）

## 1. 目的
描述 SMT 批次完成后的 OQC 抽检触发、判定与完工/处置流程，以及相关数据如何产生与管理。

## 2. 流程位置（对应 SMT 流程图）
- 批量执行结束 → OQC 抽检（如命中规则） → 通过则完工，失败则 MRB 决策。

## 3. 前置条件
- Run 处于 `IN_PROGRESS`。
- 所有 Unit 已进入终态（DONE 或 SCRAPPED）。

## 4. 数据如何产生
### 4.1 抽检规则（OQC Sampling Rule）
- 入口：`/api/oqc/sampling-rules`（CRUD）
- 关键字段：
  - `productCode` / `lineId` / `routingId`（适用范围）
  - `samplingType`：PERCENTAGE / FIXED
  - `sampleValue`：抽样比例或固定数量
  - `priority`：匹配优先级

### 4.2 OQC 触发
- 自动触发逻辑：
  - 若无适用规则 → Run 直接完成
  - 若计算样本数为 0 → Run 直接完成
  - 否则创建 OQC 任务，并记录抽样 Unit 列表

### 4.3 OQC 任务与检验项
- OQC 任务：Inspection 记录（类型 OQC），状态 PENDING → INSPECTING → PASS/FAIL。
- 检验项：
  - `unitSn`（样本 SN）
  - `itemName` / `itemSpec`
  - `actualValue`
  - `result`（PASS/FAIL/NA）
  - `defectCode` / `remark`

### 4.4 OQC 完成与 MRB
- PASS：Run 完工（COMPLETED）。
- FAIL：Run 进入 ON_HOLD，并进入 MRB 决策。
- MRB 决策：RELEASE / REWORK / SCRAP（可创建返修 Run）。

## 5. 数据如何管理
- 抽检规则为配置数据，应明确版本与适用范围。
- OQC 任务与检验项为运行数据，需保留用于追溯。
- MRB 决策记录在 OQC 相关数据中，用于后续追溯。

## 6. 真实例子（中文）
- 抽检规则：
  - 产品 `5223029018` → 抽样 10%（PERCENTAGE）
- 批次 100 PCS 完成，抽样 10 个
- OQC 结果：PASS → Run 完工

失败场景：
- OQC FAIL → Run ON_HOLD → MRB 决策 REWORK → 创建返修 Run

## 7. 演示数据生成建议
- 1 个“无抽检规则”场景（Run 直接完成）。
- 1 个“抽检通过”场景。
- 1 个“抽检失败 + MRB 返修”场景。

## 8. 验证步骤（预览）
- 验证规则匹配与样本数量计算。
- 验证 OQC 任务创建与样本 SN 列表。
- 验证 PASS/FAIL 对 Run 状态的影响。
- 验证 MRB 决策流转。

详细验证见 `05_validation/02_run_and_execution_validation.md`。
