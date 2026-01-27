# SMT 失败分支与恢复路径

> 常见异常场景的演示和恢复方法。
> 可选演示章节

## 1. 上料异常场景

### 1.1 站位映射缺失

**场景**：load-table 时找不到站位映射

**错误码**：`SLOT_MAPPING_MISSING`

**恢复方式**：
1. 去 `/mes/loading/slot-config` 补充站位物料映射
2. 重新加载站位表

### 1.2 已开始上料

**场景**：尝试重新加载已开始上料的 Run

**错误码**：`LOADING_ALREADY_STARTED`

**恢复方式**：
- 不能重新加载，只能继续上料流程

### 1.3 站位锁定

**场景**：同一站位连续 3 次扫码错误

**错误码**：`SLOT_LOCKED`

**恢复方式**：
1. 使用有解锁权限的账号（engineer）
2. 点击站位的 **解锁** 按钮
3. 填写解锁原因
4. 重新扫码

### 1.4 已上料再扫不同物料

**场景**：站位已上料，扫入不同的物料条码

**错误码**：`SLOT_ALREADY_LOADED`

**恢复方式**：
- 使用 **换料** 功能，而非直接扫码

### 1.5 条码格式错误

**场景**：扫入的条码不符合 `物料编码|批次号` 格式

**错误码**：`BARCODE_PARSE_ERROR`

**恢复方式**：
- 检查条码格式，确保使用竖线分隔

### 1.6 物料批次不存在

**场景**：扫入的批次号在系统中找不到

**错误码**：`MATERIAL_LOT_NOT_FOUND`

**恢复方式**：
- 检查条码是否正确
- 在系统中预注册物料批次

---

## 2. 就绪检查失败场景

### 2.1 上料未完成

**场景**：LOADING 检查项失败

**恢复方式**：
1. 完成所有站位的上料验证
2. 重新执行 Formal Check

### 2.2 外部系统状态异常

**场景**：STENCIL/SOLDER_PASTE/EQUIPMENT 检查失败

**恢复方式**：
- 方式一：修复实际问题后重新检查
- 方式二：使用 `/mes/integration/manual-entry` 手动录入状态
- 方式三：使用豁免功能（需要 `prep:waive` 权限）

### 2.3 准备记录缺失

**场景**：PREP_STENCIL_CLEAN/PREP_SCRAPER 检查失败

**恢复方式**：
1. 去对应页面录入准备记录
   - 钢网清洗：`/mes/stencil-cleaning`
   - 刮刀点检：`/mes/squeegee-usage`
2. 重新执行 Formal Check

### 2.4 时间规则超时

**场景**：TIME_RULE 检查失败（如锡膏暴露超时）

**恢复方式**：
- 方式一：更换新物料
- 方式二：使用豁免功能（需要 `time_rule:override` 权限）

---

## 3. FAI 失败场景

### 3.1 FAI 创建失败

| 错误码 | 原因 | 恢复方式 |
|--------|------|----------|
| READINESS_NOT_PASSED | 就绪检查未通过 | 通过 Readiness 后重试 |
| INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| FAI_ALREADY_EXISTS | 已存在未完成 FAI | 完成或取消现有 FAI |

### 3.2 FAI 判定 FAIL

**恢复流程**：
1. FAI FAIL → Run 无法授权
2. 分析失败原因
3. 创建新 FAI
4. 重新试产
5. 新 FAI 判定 PASS
6. 签字确认

### 3.3 FAI 未签字

**场景**：尝试授权但 FAI 未签字

**恢复方式**：
1. 在 `/mes/fai` 找到 PASS 状态的 FAI
2. 点击 **签字** 完成确认

---

## 4. 执行异常场景

### 4.1 Run 未授权

**错误码**：`RUN_NOT_AUTHORIZED`

**恢复方式**：
- 先完成 Run 授权

### 4.2 Unit 未生成

**错误码**：`UNIT_NOT_FOUND`

**恢复方式**：
- 在 Run 详情页生成 Unit

### 4.3 必填数据缺失

**错误码**：`REQUIRED_DATA_MISSING`

**恢复方式**：
- 填写工位配置的必填数据采集项

### 4.4 站点不在路由中

**错误码**：`STATION_NOT_IN_ROUTE`

**恢复方式**：
- 检查路由配置，确认工位在路由中

### 4.5 Unit 已在站

**错误码**：`UNIT_ALREADY_IN_STATION`

**恢复方式**：
- 先完成 TrackOut

### 4.6 失败 Unit 未处置

**错误码**：`DISPOSITION_REQUIRED`

**恢复方式**：
1. 在 `/mes/defects` 找到失败的 Unit
2. 完成处置（返修/报废）

---

## 5. OQC 失败场景

### 5.1 OQC FAIL → MRB 决策

**恢复流程**：
1. OQC 判定 FAIL
2. Run 进入 ON_HOLD
3. 执行 MRB 决策：
   - **RELEASE**：确认质量可接受，放行
   - **REWORK**：创建返修 Run
   - **SCRAP**：全批报废

### 5.2 返修 Run 流程

1. MRB 选择 REWORK
2. 系统自动创建返修 Run
3. 返修 Run 从 PREP 状态开始
4. 完成返修后的 FAI（如需要）
5. 授权并执行
6. 收尾

---

## 6. 错误码速查表

| 阶段 | 错误码 | 含义 | 快速恢复 |
|------|--------|------|----------|
| 上料 | RUN_NOT_FOUND | Run 不存在 | 确认 runNo 正确 |
| 上料 | RUN_NOT_IN_PREP | Run 非 PREP | 需新建 Run |
| 上料 | SLOT_MAPPING_MISSING | 站位缺少映射 | 补充映射后重试 |
| 上料 | LOADING_ALREADY_STARTED | 已开始上料 | 继续上料或走清理流程 |
| 上料 | SLOT_LOCKED | 站位已锁定 | 解锁后重试 |
| 上料 | MATERIAL_MISMATCH | 物料不匹配 | 扫正确物料 |
| 上料 | MATERIAL_LOT_NOT_FOUND | 物料批次不存在 | 检查条码或预注册批次 |
| 上料 | SLOT_ALREADY_LOADED | 站位已上料 | 使用换料流程 |
| 上料 | BARCODE_PARSE_ERROR | 条码格式错误 | 检查格式 |
| 就绪 | READINESS_NOT_PASSED | 就绪未通过 | 修复或豁免失败项 |
| FAI | FAI_ALREADY_EXISTS | 已有未完成 FAI | 完成或取消现有 FAI |
| FAI | INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| 授权 | FAI_GATE_BLOCKED | FAI 未 PASS/未签字 | 完成 FAI 且签字 |
| 授权 | INVALID_RUN_STATUS | Run 状态不允许授权 | 确认 Run 为 PREP |
| 执行 | RUN_NOT_AUTHORIZED | Run 未授权 | 先授权 |
| 执行 | UNIT_NOT_FOUND | Unit 不存在 | 先生成 Unit |
| 执行 | UNIT_ALREADY_IN_STATION | Unit 已在站 | 先 TrackOut |
| 执行 | UNIT_NOT_IN_STATION | Unit 不在站 | 先 TrackIn |
| 执行 | STATION_NOT_IN_ROUTE | 站点不在路由中 | 检查路由配置 |
| 执行 | REQUIRED_DATA_MISSING | 必填数据缺失 | 补全采集项 |
| 执行 | DISPOSITION_REQUIRED | 失败 Unit 未处置 | 先处置 |
