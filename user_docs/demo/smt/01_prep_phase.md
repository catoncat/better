# SMT 准备阶段

> 工单创建、准备记录录入、Readiness 检查、上料验证。
> 预计时间：10-15 分钟

## 1. 工单下发与创建 Run

**页面**：`/mes/work-orders`

### 1.1 操作步骤

1. 选择一个 RECEIVED 的 SMT 工单（例如 `WO-MGMT-SMT-QUEUE`）
2. 点击 **下发** 选择 SMT 产线（如 `LINE-A`）→ 工单变为 RELEASED
3. 点击 **创建批次** 创建 Run（Run=PREP）并跳转到 `/mes/runs/{runNo}`

### 1.2 期望结果

- Run 绑定产线与路由版本
- Run 状态为 PREP
- Run 详情页可看到 Readiness/FAI/执行卡片

### 1.3 验证检查点

- Run.routeVersionId 已绑定 READY 版本
- Run.lineId 正确

---

## 2. 准备记录录入

**前置说明**：在进行 Readiness 检查之前，需要录入相关准备记录。

### 2.1 钢网清洗记录

**页面**：`/mes/stencil-cleaning`

1. 点击 **新建记录**
2. 填写信息：
   - 钢网编号
   - 清洗方式（自动/手动/超声波）
   - 清洗结果
3. 确认提交

**期望结果**：
- 记录保存成功
- PREP_STENCIL_CLEAN 检查项可通过

### 2.2 刮刀点检记录

**页面**：`/mes/squeegee-usage`

1. 点击 **新建记录**
2. 填写信息：
   - 刮刀编号
   - 表面状态检查：OK
   - 刀口状态检查：OK
   - 平整度检查：OK
3. 确认提交

**期望结果**：
- 记录保存成功
- PREP_SCRAPER 检查项可通过

### 2.3 时间规则查看（可选）

若演示锡膏暴露时间规则：
1. 在锡膏扫码时系统自动创建时间规则实例
2. 在看板或 Run 详情页查看规则状态
3. 观察预警通知（接近 24 小时时）

---

## 3. 产前检查（Readiness）

**页面**：`/mes/runs/{runNo}`

### 3.1 检查项详解

| 检查项 | 含义 | 数据来源 | 通过条件 | 可豁免 |
|--------|------|----------|----------|--------|
| ROUTE | 路由版本可用 | 路由编译状态 | 绑定版本 = READY | 否 |
| STENCIL | 钢网已绑定 | 线体钢网绑定 | 状态正常、在有效期内 | 是 |
| SOLDER_PASTE | 锡膏已扫码 | 锡膏状态记录 | 未过期、已回温 | 是 |
| EQUIPMENT | 设备状态正常 | TPM/设备状态 | 贴片机 = normal | 是 |
| MATERIAL | 物料齐套 | BOM + 物料主数据 | 关键物料已领料 | 是 |
| LOADING | 上料完成 | RunSlotExpectation | 全部站位 = LOADED | 否 |
| PREP_STENCIL_CLEAN | 钢网清洗 | StencilCleaningRecord | 有有效记录 | 是 |
| PREP_SCRAPER | 刮刀点检 | SqueegeeUsageRecord | 有合格记录 | 是 |
| PREP_FIXTURE | 夹具状态 | FixtureUsageRecord | 未超寿命 | 是 |
| PREP_PROGRAM | 炉温程式 | ReflowProfile | 期望程式存在且可用 | 是 |
| TIME_RULE | 时间规则 | TimeRuleInstance | 无超时 | 是 |

### 3.2 Precheck vs Formal 区别

- **Precheck**：Run 详情页在 PREP 状态会自动触发，写入 PRECHECK 记录，仅用于预警。
- **Formal**：Run 授权时会自动触发（若尚未执行），也可通过接口手动触发，是门禁依据。

### 3.3 正式检查触发方式

1. 通过接口 `POST /api/runs/:runNo/readiness/check` 触发 Formal 检查
2. 或直接执行 Run 授权，系统会自动补做 Formal

**期望结果**：
- Readiness 状态更新
- 检查结果写入审计记录

### 3.4 豁免（Waive）流程

**前置条件**：当前用户具有 `readiness:override` 权限（quality 角色）

1. 找到失败的检查项（如 STENCIL）
2. 点击该项右侧 **豁免** 按钮
3. 在弹窗中填写豁免原因（必填）
4. 点击 **确认豁免**

**期望结果**：
- 该检查项状态变为 WAIVED（黄色标记）
- Readiness 整体状态变为 PASSED
- 审计日志记录豁免操作（waivedBy/waivedAt/waiveReason）

### 3.5 失败分支演示

- 示例：LOADING 未完成 → Readiness FAIL
- 处理：完成上料验证后重新 Formal Check
- 若钢网/锡膏/设备状态未同步，可使用 `/mes/integration/manual-entry` 手动录入后再检查

---

## 4. 上料防错（Loading Verify）

**页面**：`/mes/loading`

### 4.1 前置条件

- Run 状态为 PREP
- Run 已绑定产线（lineId）
- 产线已配置站位（FeederSlot）
- 站位已配置物料映射（SlotMaterialMapping）

### 4.2 加载站位表

1. 在搜索框输入 Run 号
2. 点击 **确定** 加载 Run 信息
3. 若提示"尚未加载站位期望"，点击 **加载站位表**
4. 等待加载完成

**期望结果**：
- 站位列表显示站位码、期望物料、替代料信息
- 所有站位状态为 PENDING

**可能的错误**：

| 错误提示 | 原因 | 处理方式 |
|----------|------|----------|
| SLOT_MAPPING_MISSING | 站位缺少物料映射 | 去 `/mes/loading/slot-config` 补充映射 |
| LOADING_ALREADY_STARTED | 已有上料记录 | 不能重新加载，只能继续上料 |

### 4.3 扫码验证（PASS）

条码格式：`物料编码|批次号`

**示例数据**：
- 站位码：`2F-34`
- 期望物料：`5212090007`
- 扫码条码：`5212090007|LOT-20250526-003`

**操作步骤**：
1. 在站位列表中找到 `2F-34` 行
2. 点击 **扫码** 按钮或使用扫码枪
3. 输入/确认条码
4. 点击 **验证**

**期望结果**：
- 验证结果显示 PASS（绿色对勾）
- 站位状态变为 LOADED

### 4.4 替代料验证（WARNING）

**示例数据**：
- 站位码：`2F-46`
- 期望物料：`5212090001`
- 扫码条码：`5212090001B|LOT-20250526-002`

**期望结果**：
- 验证结果显示 WARNING（黄色警告）
- 站位状态变为 LOADED

### 4.5 错误物料（FAIL + 锁定）

**操作步骤（模拟连续 3 次失败）**：
1. 点击 **扫码**
2. 输入错误物料条码：`9999999999|LOT-FAIL-001`
3. 点击 **验证** → 显示 FAIL
4. 重复步骤 1-3 共 3 次

**期望结果**：
- 第 1-2 次：显示 FAIL，failedAttempts 递增
- 第 3 次：显示 SLOT_LOCKED 错误
- 站位显示"锁定"标记

### 4.6 解锁站位

**前置条件**：站位锁定，用户具备解锁权限（engineer）

1. 在锁定站位行点击 **解锁**
2. 在弹窗中填写解锁原因
3. 点击 **确认解锁**

**期望结果**：
- 站位锁定标记消失
- failedAttempts 归零

### 4.7 换料操作

**场景**：站位已上料，需要更换为另一批次物料

1. 在已上料站位行点击 **换料**
2. 输入新物料条码
3. 填写换料原因（必填）
4. 点击 **确认换料**

**期望结果**：
- 旧上料记录标记为 REPLACED
- 新上料记录写入
- 换料原因可追溯
