# SMT 收尾阶段

> Run 收尾、OQC 检验、MRB 决策、追溯验证。
> 预计时间：5-10 分钟

## 1. OQC 触发条件与抽检规则

### 1.1 抽检规则类型

| 类型 | 说明 | 示例 | 计算方式 |
|------|------|------|----------|
| PERCENTAGE | 按百分比抽检 | 10% | 100 PCS 完成 → 抽 10 个 |
| FIXED | 固定数量抽检 | 5 | 无论多少，固定抽 5 个 |

### 1.2 触发条件

- 所有 Unit 已进入终态（DONE/SCRAPPED）
- 存在匹配抽检规则且样本数 > 0
- 若无匹配规则或样本数为 0，Run 直接 COMPLETED（不创建 OQC）

---

## 2. OQC 状态流转

```
PENDING → INSPECTING → PASS/FAIL
PASS → Run COMPLETED
FAIL → Run ON_HOLD → MRB 决策
```

---

## 3. Run 收尾

**页面**：`/mes/runs/{runNo}`

### 3.1 收尾前置条件

- 所有 Unit 已完成（DONE 或 SCRAPPED）
- 无未处置的 OUT_FAILED Unit

### 3.2 操作步骤

1. 在 Run 详情页点击 **收尾**
2. 系统检查是否需要 OQC
   - 需要 OQC：自动创建 OQC 任务
   - 不需要 OQC：Run 直接进入 COMPLETED

---

## 4. OQC 检验（PASS）

**页面**：`/mes/oqc`

### 4.1 操作步骤

1. 找到该 Run 的 OQC 任务
2. 点击 **开始检验**
3. 完成抽检并记录结果
4. 判定为 PASS

### 4.2 期望结果

- OQC 状态变为 PASS
- Run 状态变为 COMPLETED

---

## 5. OQC FAIL → MRB 决策

### 5.1 OQC FAIL 操作

1. OQC 判定 FAIL
2. Run 进入 ON_HOLD 状态

### 5.2 MRB 决策

**页面**：`/mes/runs/{runNo}`

1. 在 Run 详情页点击 **MRB 决策**
2. 选择处理方式：

| 选项 | 说明 | Run 终态 |
|------|------|----------|
| RELEASE | 放行 | COMPLETED |
| REWORK | 返修 | CLOSED_REWORK |
| SCRAP | 报废 | SCRAPPED |

### 5.3 创建返修 Run

若 MRB 选择 REWORK：
1. 系统自动创建返修 Run
2. 在 `/mes/runs` 中查看返修 Run
3. 返修 Run 继续执行流程

---

## 6. 工单收尾

**页面**：`/mes/work-orders`

### 6.1 操作步骤

1. 找到对应工单
2. 点击 **收尾**
3. 工单状态变为 COMPLETED

### 6.2 前置条件

- 关联的所有 Run 已完成或取消

---

## 7. 追溯验证

**页面**：`/mes/trace`

### 7.1 操作步骤

1. 输入 SN（如 `SN-RUN-001-0001`）
2. 点击搜索

### 7.2 期望结果

追溯页面显示完整信息：

| 信息类型 | 内容 |
|----------|------|
| 路由版本快照 | 绑定的 routeVersion |
| 过站记录 | TrackIn/TrackOut 时间、工位、结果 |
| 上料记录 | 站位、物料、批次、验证结果 |
| FAI 记录 | FAI 状态、检验项、签字信息 |
| OQC 记录 | OQC 状态、抽检结果 |
| 缺陷处置 | 缺陷代码、处置方式 |

### 7.3 验证检查点

- Trace 中 routeVersion 与 Run 绑定版本一致
- loadingRecords、tracks、inspections 同步可见
- 物料批次反查返回正确 SN 列表

---

## 8. 完整流程验证清单

### 8.1 Readiness

- [ ] 检查项状态与数据来源一致
- [ ] Formal Check 写入记录与审计
- [ ] Waive 需要权限并记录原因

### 8.2 Loading

- [ ] load-table 生成站位期望
- [ ] PASS/WARNING/FAIL 结果一致
- [ ] 站位锁定/解锁生效
- [ ] replace 记录 REPLACED + 原因

### 8.3 FAI

- [ ] sampleQty 满足才能创建
- [ ] 试产 TrackIn/Out 完成
- [ ] PASS/FAIL 与 failedQty 规则一致
- [ ] 签字后才能授权

### 8.4 Execution

- [ ] Unit 状态流转正确
- [ ] 必填数据采集阻断 TrackOut
- [ ] FAIL 触发缺陷处置

### 8.5 OQC

- [ ] 抽检规则匹配与样本数计算
- [ ] OQC PASS/FAIL 对 Run 状态影响
- [ ] MRB 决策与返修 Run 创建

### 8.6 Trace

- [ ] routeVersion 冻结一致
- [ ] tracks/dataValues/inspections/loadingRecords 可见
- [ ] 物料批次反查返回正确 SN 列表
