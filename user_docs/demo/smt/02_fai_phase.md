# SMT 首件检验阶段

> FAI 创建、试产、检验项记录、判定、签字确认。
> 预计时间：5-10 分钟

## 1. FAI 状态流转

```
[创建 FAI] → PENDING → [开始] → INSPECTING → [完成判定]
├─ PASS → [签字确认] → Run 可授权
└─ FAIL → 需重新首件
```

---

## 2. 创建 FAI

**页面**：`/mes/runs/{runNo}`

### 2.1 前置条件

- Run 状态为 PREP
- 就绪检查（Formal）已通过
- 已生成足够 Unit（>= sampleQty）

### 2.2 操作步骤

1. 在 Run 详情页点击 **创建 FAI**
2. 输入样本数量 sampleQty（建议 2）
3. 点击 **创建**

**期望结果**：
- FAI 状态为 PENDING

### 2.3 常见创建失败

| 错误码 | 原因 | 恢复方式 |
|--------|------|----------|
| READINESS_CHECK_NOT_PASSED | 就绪检查未通过 | 通过 Readiness 后重试 |
| INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| FAI_ALREADY_EXISTS | 已存在未完成 FAI | 完成或取消现有 FAI |

---

## 3. 启动 FAI

**页面**：`/mes/fai`

1. 找到该 Run 的 FAI
2. 点击 **开始**

**期望结果**：
- FAI 状态变为 INSPECTING

---

## 4. 首件试产（授权前过站）

**页面**：`/mes/runs/{runNo}` + `/mes/execution`

### 4.1 操作步骤

1. 在 Run 详情页"实际生产"卡片点击 **生成单件**
2. 进入 `/mes/execution`，选择首工位
3. 对 sampleQty 个 SN 完成 TrackIn/TrackOut（PASS）

### 4.2 注意事项

- Run=PREP 时仅允许首工序试产
- 非首工序会阻断，返回 `FAI_TRIAL_STEP_NOT_ALLOWED`

---

## 5. 记录检验项

**页面**：`/mes/fai`

### 5.1 字段说明

| 字段 | 必填 | 说明 | 示例值 |
|------|------|------|--------|
| unitSn | 否 | 样本 SN | `SN-RUN-001-0001` |
| itemName | 是 | 检验项名称 | 锡膏厚度 |
| itemSpec | 否 | 规范/标准 | 0.12±0.02mm |
| actualValue | 否 | 实测值 | 0.13mm |
| result | 是 | PASS / FAIL / NA | PASS |
| defectCode | 否 | 不良代码 | SOLDER_BRIDGE |
| remark | 否 | 备注 | 目视检查正常 |

### 5.2 操作步骤

1. 在 FAI 详情页点击 **添加检验项**
2. 填写检验项信息
3. 保存记录

---

## 6. 完成判定

**页面**：`/mes/fai`

### 6.1 判定 PASS

1. 确认 failedQty = 0
2. 点击 **完成判定**
3. 选择结果：PASS

**期望结果**：
- FAI 状态变为 PASS

### 6.2 FAI Gate 阻断逻辑

- 路由要求 FAI 时，Run 授权前必须 FAI=PASS
- 若存在 SPI/AOI 检验 FAIL，系统阻断 FAI PASS

---

## 7. FAI 签字确认

**页面**：`/mes/fai`

> FAI 判定 PASS 后，需要签字确认才能授权生产。

### 7.1 操作步骤

1. 找到状态为 PASS 的 FAI
2. 点击 **签字**
3. 填写签字备注（可选）
4. 确认签字

### 7.2 期望结果

- FAI 显示签字人和签字时间
- 签字记录包含：signedBy、signedAt、signatureRemark
- Run 可以授权

### 7.3 签字门禁验证

- 若不签字直接尝试授权 → 授权被阻断
- 提示：FAI 需要签字确认

### 7.4 权限要求

签字操作需要 `fai:sign` 权限，通常质量角色拥有此权限。

---

## 8. 失败分支：FAI FAIL → 恢复流程

```
FAI FAIL → [是否可修复?]
├─ 是 → 创建新 FAI → 重新试产 → 新 FAI 判定
└─ 否 → 取消 Run
```

### 8.1 恢复演示

1. 创建 FAI
2. 录入检验项 FAIL 或 failedQty > 0
3. FAI FAIL → Run 无法授权
4. 创建新 FAI 并重新试产 → PASS
5. 签字确认
