# SMT 执行阶段

> Run 授权、批量执行 TrackIn/TrackOut、数据采集。
> 预计时间：10-15 分钟

## 1. Run 授权

**页面**：`/mes/runs/{runNo}` 或 `/mes/runs`

### 1.1 前置条件

- Readiness Formal Check 通过
- FAI 判定 PASS 且已签字（如路由要求）
- Run 状态为 PREP

### 1.2 操作步骤

1. 点击 **授权生产**
2. Run 状态变为 AUTHORIZED

### 1.3 提示

若未执行 Formal Readiness，授权时会自动触发一次检查，失败则阻止授权。

### 1.4 常见授权失败原因

| 错误码 | 原因 | 恢复方式 |
|--------|------|----------|
| READINESS_NOT_PASSED | Readiness 未通过 | 通过 Readiness 后重试 |
| FAI_GATE_BLOCKED | FAI 未 PASS 或未签字 | 完成 FAI 且签字 |
| INVALID_RUN_STATUS | Run 状态不允许授权 | 确认 Run 为 PREP |

---

## 2. Unit 状态流转

```
[生成单件] → QUEUED → [TrackIn] → IN_STATION → [TrackOut]
├─ PASS → DONE (终态)
└─ FAIL → OUT_FAILED
        ├─ [返修] → IN_STATION
        └─ [报废] → SCRAPPED (终态)
```

---

## 3. 生成单件（Unit）

**页面**：`/mes/runs/{runNo}`

### 3.1 操作步骤

1. Run 详情页点击 **生成单件**
2. 输入数量
3. 系统生成 SN

### 3.2 期望结果

- Unit 状态为 QUEUED
- SN 格式：`SN-{runNo}-{序号}`
- SN 连续可追溯

### 3.3 限制

- 仅允许 Run 状态为 PREP 或 AUTHORIZED 时生成

---

## 4. TrackIn/TrackOut 执行

**页面**：`/mes/execution`

### 4.1 前置条件

**TrackIn 前置条件**：

| 条件 | 说明 | 错误码 |
|------|------|--------|
| Run 已授权 | Run.status = AUTHORIZED 或 IN_PROGRESS | RUN_NOT_AUTHORIZED |
| Unit 存在 | 必须先生成 Unit | UNIT_NOT_FOUND |
| Unit 不在站 | Unit.status != IN_STATION | UNIT_ALREADY_IN_STATION |
| 上次失败已处置 | OUT_FAILED 的 Unit 需先处置 | DISPOSITION_REQUIRED |

**TrackOut 前置条件**：

| 条件 | 说明 | 错误码 |
|------|------|--------|
| Unit 在站 | Unit.status = IN_STATION | UNIT_NOT_IN_STATION |
| 数据采集完成 | 必填项已填写 | REQUIRED_DATA_MISSING |

### 4.2 TrackIn/TrackOut（PASS 主线）

1. 选择工位
2. TrackIn → Unit 状态 IN_STATION
3. 填写数据采集项（如有）
4. TrackOut 选择 PASS → Unit 状态 DONE

**SMT 示例工位顺序**：
- `ST-SPI-01` → `ST-MOUNT-01` → `ST-REFLOW-01` → `ST-AOI-01`

### 4.3 提示

- 首次 TrackIn 后 Run 会进入 IN_PROGRESS
- 后续 Unit 的 TrackIn 不会再改变 Run 状态

---

## 5. 数据采集项填写

若工位配置了数据采集项，TrackOut 前必须填写必填项。

### 5.1 常见采集项示例

| 工位 | 采集项 | 类型 |
|------|--------|------|
| SPI | 锡膏高度 | 数值 |
| REFLOW | 炉温峰值 | 数值 |
| REFLOW | 过炉时间 | 数值 |
| AOI | 检测结果 | PASS/FAIL |

### 5.2 时间规则提醒

在执行过程中，系统会显示时间规则状态：
- 锡膏暴露时间（24 小时限制）
- 水洗时间（4 小时限制，如路由配置）

若规则接近超时，系统会显示预警提示。

---

## 6. TrackOut FAIL + 缺陷处置

### 6.1 操作步骤

1. TrackOut 选择 FAIL
2. Unit 状态变为 OUT_FAILED
3. 进入 `/mes/defects` 处理缺陷
4. 选择处置：REWORK / SCRAP / HOLD

### 6.2 Unit 失败处置决策树

```
Unit OUT_FAILED → [处置决策]
├─ 返修 → [创建返修工单] → 返修 TrackIn/Out
│                          ├─ PASS → DONE
│                          └─ FAIL → 再次处置
└─ 报废 → SCRAPPED (终态)
```

---

## 7. 验证检查点汇总

- TrackIn/Out 产生正确状态变化
- Run 首次 TrackIn 后变为 IN_PROGRESS
- FAIL 生成缺陷并要求处置
- 数据采集必填项阻断 TrackOut
- Trace 中可见 tracks/dataValues/inspections/loadingRecords
