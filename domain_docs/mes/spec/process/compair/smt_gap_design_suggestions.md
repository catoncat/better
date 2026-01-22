# SMT 差距设计建议（基于确认表）

> 依据：`SMT 表单采集确认表.md` 与差距报告  
> 目标：把“表单确认结果”转成可落地的系统设计建议，明确门禁策略、数据模型与模块补齐方向。

---

## 1. 设计口径（统一理解）

- **准备完成 = 所有准备项达标**  
  允许继续但提醒/豁免的项，必须在系统里留痕，并通过豁免转为“达标”。
- **门禁类型分层**  
  - **硬门禁（BLOCK）**：不达标禁止进入下一步骤  
  - **软门禁（ALERT+WAIVE）**：不达标可以继续，但必须提醒并有豁免记录  
  - **仅记录（RECORD）**：不达标不阻塞，但仍需记录与提示（可选）

---

## 2. 建议的“准备项”模型（代替独立表单）

### 2.1 新增或扩展的核心对象

- **PrepItemDefinition（准备项定义）**  
  建议字段：`itemCode`、`itemName`、`stage`、`dataSource`、`gateType`、`ruleJson`、`formCode`、`ownerRole`

- **PrepItemRecord（准备项记录）**  
  建议字段：`runId`、`itemCode`、`status(PASS/FAIL/WAIVED)`、`evidenceRef`、`checkedAt`、`checkedBy`、`waivedBy/waiveReason`

- **PrepCheck（准备项汇总）**  
  规则：**所有准备项 PASS 或 WAIVED 才算准备完成**；若存在 FAIL，则要求豁免或继续修正。

### 2.2 与现有 Readiness 的关系（建议）

有两条路：

1) **扩展 ReadinessCheckItem**：新增 `itemType=PREP_*`，让准备项变为 Readiness 子项  
2) **独立 PrepCheck 模块**：在 Run PREP 阶段单独计算，再在授权/下一步骤前校验

建议优先 **扩展 Readiness**，减少新概念并复用“豁免/审计”能力。

---

## 3. 表单 → 准备项映射建议（核心项）

| 表单编号 | 准备项建议 | 门禁类型 | 可复用现有数据 | 需要补齐 |
| --- | --- | --- | --- | --- |
| QR-Pro-057 烘烤记录 | BakeRecord 校验 | SOFT | BakeRecord API | 与准备项绑定规则 |
| QR-Pro-013 锡膏使用 | SolderPasteUsage 校验 | SOFT | SolderPasteUsageRecord | 暴露时间规则 |
| QR-Pro-073 冷藏温度 | ColdStorageTemp 校验 | SOFT | ColdStorageTemperatureRecord | 规则阈值 |
| QR-Pro-089 钢网次数 | StencilUsage 校验 | SOFT | LineStencil + StencilStatusRecord | 使用次数/张力字段 |
| QR-Pro-130 钢网清洗 | StencilClean 校验 | SOFT | 无 | 新记录表 |
| QR-Mac-144 刮刀点检 | ScraperUsage 校验 | SOFT | 无 | 新记录表 |
| QR-Mac-155 夹具维护 | FixtureMaintenance 校验 | SOFT | TPM(设备) | 夹具实体与寿命模型 |
| QR-Pro-133 转拉前检查 | PreRunChecklist | SOFT | 部分 Readiness | 补齐程式/夹具/辅料项 |
| QR-Pro-105 炉温程式 | ReflowProgramMatch | BLOCK | 无 | 新记录与校验 |
| QR-Pro-121 上机对照 | Loading Verify | BLOCK | Loading模块 | 已覆盖 |
| QR-Pro-05 首件 | FAI + 签字 | BLOCK | Inspection(FAI) | 签字强制 |

---

## 4. 时间规则与豁免设计

### 4.1 时间规则

- **回流焊/AOI → 水洗 < 4h**：提醒 + 可豁免  
  - 需要新增 **水洗节点** 或 **时间扫描点**  
  - 规则触发时写入 `PrepItemRecord` 为 FAIL，要求豁免

- **锡膏暴露 < 24h**：提醒 + 可豁免  
  - 暴露时长从 `thawedAt/issuedAt` 与当前时间计算  
  - 规则触发时同上

### 4.2 豁免机制

建议新增：
- **Factory Manager 角色** 或映射到现有权限（需明确）  
- 统一 `waive` API：写入 `waivedBy/waiveReason` 并保留原 FAIL 证据

---

## 5. 数据采集落地建议

### 5.1 先人工后自动（符合确认表策略）
- 建议所有准备项先支持手工录入 + 系统校验  
- 设备数采接入后替换 `dataSource=DEVICE/TPM`

### 5.2 数据存储策略

有两种可选：

1) **表单专表 + 规则层**（当前已有 Bake/SolderPaste）  
2) **统一“表单记录表”+ JSON**（快速落地，但会弱化结构化分析）

建议：**关键准备项继续专表**，低频项可用统一表。

---

## 6. UI/流程建议

- 在 Run PREP 阶段新增 **“准备项看板”**  
  - 展示每项：状态、来源、证据、最后更新时间  
  - 支持录入/补录、豁免申请  
- 授权/进入下一步前必须通过准备项校验（PASS/WAIVED）

---

## 7. 分阶段实施建议

### Phase 1（必备）
- 准备项模型 + Readiness 扩展  
- 软门禁 + 豁免机制  
- 首件签字强制  

### Phase 2（核心追溯）
- 锡膏时间规则、烘烤规则  
- 钢网/刮刀寿命、炉温程式一致性  

### Phase 3（过程完善）
- AOI 点检、异常报告、维修表单  
- 设备数采接入与日报类报表

---

## 8. 风险点与验证建议

- 软门禁若无豁免，将导致“准备完成”永远无法达标  
  → 必须有明确的豁免角色与审批日志  
- 时间规则需要精确定义起算点与触发条件  
  → 需确定“回流焊完成时间”和“水洗扫码点”

---

## 9. 结论

“准备项”不需要独立表单，但**必须有达标规则与记录**。  
设计上建议复用 Readiness 模型，补齐软门禁、豁免和时间规则，以保证确认表口径可以系统化落地。
