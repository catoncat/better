# DIP 全流程演示

> DIP 产线的完整演示流程（简化版），涵盖工单创建到追溯验证。

---

## 流程概览

DIP 与 SMT 共享相同的系统架构，主要区别在于：

| 维度 | SMT | DIP |
|------|-----|-----|
| 产线 | SMT-A, SMT-B | LINE-DIP-A |
| 路由 | PCBA-SMT-V1 | PCBA-DIP-V1 |
| 工序 | SPI → 贴片 → 回流焊 → AOI | 插件 → 波峰焊 → 后焊 → 测试 |
| 准备项 | 钢网/刮刀/锡膏 | 夹具/波峰焊参数 |

---

## 1. 创建 DIP 工单与 Run

**页面**：`/mes/work-orders`

### 1.1 操作步骤

1. 点击"接收外部工单"
2. 填写工单信息：
   - 工单号：`WO-DEMO-DIP-{时间戳}`
   - 产品编码：`P-2001`
   - 计划数量：`5`
   - 路由编码：`PCBA-DIP-V1`
3. 点击"创建"
4. 下发到 DIP 产线（`LINE-DIP-A`）
5. 点击"创建批次"创建 Run

### 1.2 期望结果

- 工单状态 RECEIVED → RELEASED
- Run 状态 PREP
- Run 绑定路由版本与产线

---

## 2. Readiness（产前检查）

**页面**：`/mes/runs/{runNo}`

### 2.1 操作步骤

1. 在 Readiness 卡片点击刷新（预检）
2. 查看检查结果
3. 失败项可豁免或手动录入

### 2.2 期望结果

- Readiness 状态 PASSED
- 检查项规则与 SMT 一致

### 2.3 DIP 特有检查项

| 检查项 | 说明 |
|--------|------|
| PREP_FIXTURE | 夹具使用状态 |
| WAVE_SOLDER_PARAM | 波峰焊参数（如配置） |

---

## 3. FAI（可选）+ 授权前试产

**页面**：`/mes/runs/{runNo}` + `/mes/fai` + `/mes/execution`

### 3.1 创建并启动 FAI

1. 若路由要求 FAI：在 Run 详情页点击"创建 FAI"
2. 生成单件（如尚未生成）
3. 进入 `/mes/fai` 点击"开始"

### 3.2 首件试产

1. 进入 `/mes/execution`
2. 选择 DIP 首工位 `ST-DIP-INS-01`
3. 完成 TrackIn/TrackOut（PASS）

### 3.3 完成 FAI

1. 在 `/mes/fai` 记录检验项
2. 完成判定 PASS
3. 点击"签字"确认

### 3.4 期望结果

- FAI 状态 PASS
- 显示签字人和签字时间
- Run 可授权

---

## 4. Run 授权

**页面**：`/mes/runs/{runNo}`

1. 点击"授权生产"
2. 确认授权

**期望结果**：
- Run 状态变为 AUTHORIZED

---

## 5. DIP 执行过站

**页面**：`/mes/execution`

### 5.1 DIP 工位顺序

按顺序依次过站：

| 序号 | 工位代码 | 工序名称 |
|------|----------|----------|
| 1 | ST-DIP-INS-01 | 插件 |
| 2 | ST-DIP-WAVE-01 | 波峰焊 |
| 3 | ST-DIP-POST-01 | 后焊处理 |
| 4 | ST-DIP-TEST-01 | 功能测试 |

### 5.2 操作步骤

1. 选择工位
2. 扫描 SN
3. TrackIn
4. 完成数据采集（如有）
5. TrackOut PASS

### 5.3 期望结果

- Unit 依次过站
- 最终状态 DONE
- Run 状态 IN_PROGRESS

### 5.4 可选：演示 FAIL 分支

1. 在某一步 TrackOut 选择 FAIL
2. 选择缺陷代码
3. 进入 `/mes/defects` 进行处置
4. 观察 Unit 状态变化

---

## 6. 收尾与 OQC/MRB

**页面**：`/mes/runs/{runNo}` + `/mes/oqc`

### 6.1 Run 收尾

1. Run 详情页点击"收尾"
2. 根据抽检规则触发 OQC 或直接完成

### 6.2 OQC 流程（如触发）

1. 进入 `/mes/oqc`
2. 完成检验任务
3. 判定 PASS 或 FAIL

### 6.3 MRB 决策（如 OQC FAIL）

1. Run 进入 ON_HOLD
2. 在 Run 详情页执行"MRB 决策"
3. 选择：RELEASE / REWORK / SCRAP

### 6.4 期望结果

| 场景 | Run 终态 |
|------|----------|
| 无 OQC 或 OQC PASS | COMPLETED |
| OQC FAIL + MRB RELEASE | COMPLETED |
| OQC FAIL + MRB REWORK | CLOSED_REWORK |
| OQC FAIL + MRB SCRAP | SCRAPPED |

---

## 7. 工单收尾 + 追溯验证

**页面**：`/mes/work-orders` + `/mes/trace`

### 7.1 工单收尾

1. 回到 `/mes/work-orders`
2. 对该工单执行"收尾"
3. WO 进入 COMPLETED

### 7.2 追溯验证

1. 在 `/mes/trace` 输入刚生产的 SN
2. 检查追溯信息：
   - 路由版本快照
   - 过站记录
   - FAI/OQC（如有）
   - 数据采集值

### 7.3 期望结果

- 信息完整且可定位
- 路由版本与 Run 绑定版本一致

---

## 验证检查点汇总

- [ ] DIP 全流程闭环完成（工单→批次→过站→收尾→追溯）
- [ ] 关键页面可正常访问和操作
- [ ] 状态转换符合预期
- [ ] 追溯信息完整准确
- [ ] 无阻断性 Bug

---

## 下一步

如需演示 DIP 失败分支与恢复路径，请参考 [DIP 异常处理](./02_exception.md)。
