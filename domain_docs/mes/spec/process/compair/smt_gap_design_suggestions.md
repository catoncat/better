# SMT 差距设计建议

> 目的：对比用户确认的 SMT 表单采集需求与当前系统设计/实现，识别差距并提出改进方案
>
> 保存路径：`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
>
> 相关文档：
> - 用户差距报告：`domain_docs/mes/spec/process/compair/smt_form_confirmation_gap_report.md`
> - 用户确认表：`domain_docs/mes/spec/process/compair/SMT 表单采集确认表.md`

---

## 一、差距总览

| 维度 | 确认表需求 | 当前系统状态 | 差距级别 |
|------|-----------|-------------|---------|
| 时间规则引擎 | 回流焊→水洗 <4h、锡膏暴露 <24h（Alert） | 仅烘烤有时长控制，无全局引擎 | 🔴 高 |
| 豁免权限层级 | 厂长级别才能豁免 | quality/admin 可豁免，无厂长角色 | 🔴 高 |
| 首件签字机制 | 唯一需要独立签字的环节 | 基于权限判定，无明确签字记录 | 🔴 高 |
| **炉温程式记录** | 程式名称、一致性校验 | **无程式字段或校验** | 🔴 高 |
| **末件检查** | 生产结束前验证 | **FAI 仅支持首件** | 🔴 高 |
| **转拉前检查完整性** | 程式/夹具/辅料检查 | **Readiness 缺少程式/夹具/辅料** | 🟡 中 |
| **换料审核流程** | 审核人/时间/结果 | **仅记录原因，无审核字段** | 🟡 中 |
| 准备环节表单 | 8个表单，含温度/刮刀/夹具等 | 仅支持钢网/锡膏/物料/设备 | 🟡 中 |
| 设备数采接口 | 温度测量、生产数据来自设备 | 主要人工采集 | 🟡 中 |
| 补录控制 | 几乎全部不允许补录 | 无明确补录限制 | 🟡 中 |
| 随线流程表 | 取消原工艺流程表，改为过数扫描 | 无此设计 | 🟢 低 |

---

## 二、详细差距分析

### 2.1 时间规则引擎（🔴 高优先级）

**确认表需求：**
- 回流焊完成 → 水洗工艺：< 4h，超时**提醒（Alert）**
- 锡膏暴露时间：< 24h，超时**提醒（Alert）**
- 异常豁免需**厂长级别**授权

**当前系统：**
- `mes/bake` 模块有 `durationHours` 时长控制
- 无通用的"工序间超时监控"引擎
- 无 Alert 推送机制
- 未见水洗工序/规则

**差距：**
1. 缺少时间规则配置模型（TimeRule）
2. 缺少超时监控后台任务（TimeRuleMonitor）
3. 缺少 Alert 通知通道（NotificationChannel）

**证据：**
- 烘烤记录：`apps/server/src/modules/mes/bake/routes.ts`（有时长，无规则引擎）

---

### 2.2 豁免权限层级（🔴 高优先级）

**确认表需求：**
- 时间规则超限豁免：**厂长（Factory Manager）**

**当前系统：**
- 角色：admin、quality、line_leader、operator
- 豁免权限：`readiness:override`、`quality:disposition`
- 无"厂长"角色定义

**差距：**
1. 缺少 `factory_manager` 角色
2. 缺少 `time_rule:override` 权限点
3. 豁免记录需增加"豁免级别"字段

---

### 2.3 首件签字机制（🔴 高优先级）

**确认表需求：**
- 首件检查是**唯一需要独立签字**的环节
- 其他表单用系统账号替代物理签字

**当前系统：**
- FAI 模块支持 `PASS/FAIL` 判定
- 有 `decidedBy`/`decidedAt` 字段，但无显式签字强制
- 判定由拥有 `run:authorize` 权限的用户执行

**差距：**
1. FAI 表需增加签字字段：`signedBy`、`signedAt`、`signatureRemark`
2. 需支持签字前的二次身份验证（可选）
3. 需增加签字审计日志
4. 签字逻辑未固化为必须步骤

**证据：**
- FAI：`apps/server/src/modules/mes/fai/routes.ts`

---

### 2.4 炉温程式记录（🔴 高优先级）【新增】

**确认表需求：**
- QR-Pro-105 炉温程式使用记录表
- 程式名称、使用人、确认人
- 需与工艺路由定义的程式一致

**当前系统：**
- 无程式字段或校验
- 无温区曲线记录

**差距：**
1. 需增加 `ReflowProfile` 模型（程式名称、温区参数）
2. 需在 Routing 中定义期望程式（expectedProfile）
3. 需在生产前校验程式一致性
4. 需记录实际使用的程式

**设计建议：**
```prisma
model ReflowProfile {
  id          String   @id
  name        String   // 程式名称
  zones       Json     // 温区参数 [{zone: 1, temp: 180}, ...]
  productId   String?  // 关联产品
  version     String   // 程式版本
}

model ReflowProfileUsage {
  id          String   @id
  runId       String
  profileId   String
  usedBy      String   // 使用人
  confirmedBy String?  // 确认人
  usedAt      DateTime
  matchResult String   // MATCH | MISMATCH
}
```

---

### 2.5 末件检查机制（🔴 高优先级）【新增】

**确认表需求：**
- QR-Pro-05 首**末**件检查记录表
- 生产结束前需要进行末件验证

**当前系统：**
- FAI 仅支持首件检查
- 无末件检查概念

**差距：**
1. 需扩展 Inspection 模型支持 `type: FIRST | LAST`
2. 需在 Run 完工前触发末件检查（如果配置要求）
3. 末件检查可复用首件检查的项目模板

**设计建议：**
```prisma
model Inspection {
  // ... 现有字段

  type        InspectionType  @default(FIRST) // FIRST | LAST
}

enum InspectionType {
  FIRST   // 首件
  LAST    // 末件
}
```

**流程变更：**
- Run 状态从 `IN_PROGRESS` → `COMPLETED` 前，检查是否需要末件
- 如果 `requiresLastArticleInspection = true`，则必须创建并通过末件检查

---

### 2.6 转拉前检查完整性（🟡 中优先级）【新增】

**确认表需求：**
- QR-Pro-133 SMT 转拉前检查项目
- 烘烤/物料/辅料/**程式**/**夹具**检查项

**当前系统：**
- Readiness 检查覆盖：STENCIL、SOLDER_PASTE、EQUIPMENT、MATERIAL
- 缺失：程式、夹具、辅料

**差距：**
1. 需扩展 ReadinessCheckType 增加：PROGRAM、FIXTURE、AUXILIARY
2. 需定义程式检查逻辑（与 ReflowProfile 联动）
3. 需定义夹具检查逻辑（与 TPM 联动）
4. 需定义辅料检查逻辑（如助焊剂、清洗剂等）

**设计建议：**
```typescript
enum ReadinessCheckType {
  // 现有
  STENCIL,
  SOLDER_PASTE,
  EQUIPMENT,
  MATERIAL,

  // 新增
  PROGRAM,        // 程式一致性
  FIXTURE,        // 夹具状态（TPM）
  AUXILIARY,      // 辅料检查
  STENCIL_CLEAN,  // 钢网清洗
  STENCIL_USAGE,  // 钢网使用次数/张力
  SCRAPER,        // 刮刀点检
  TEMPERATURE,    // 温度测量
}
```

**证据：**
- 就绪门禁：`apps/server/src/modules/mes/readiness/service.ts`

---

### 2.7 换料审核流程（🟡 中优先级）【新增】

**确认表需求：**
- QR-Mac-022 SMT 生产换料记录表
- 换料时间、站位、零件编码、包装数量、**审核**

**当前系统：**
- Loading replace 记录 `reason`、`packageQty`
- 无审核字段与流程约束

**差距：**
1. 需增加审核字段：`auditedBy`、`auditedAt`、`auditResult`
2. 需定义换料审核流程（可选：自动/人工）
3. 需考虑换料后的重新校验逻辑

**设计建议：**
```prisma
model LoadingRecord {
  // ... 现有字段

  // 审核相关（新增）
  auditRequired  Boolean   @default(false)
  auditedBy      String?
  auditedAt      DateTime?
  auditResult    String?   // APPROVED | REJECTED
  auditRemark    String?
}
```

**证据：**
- 上料防错：`apps/server/src/modules/mes/loading/service.ts`

---

### 2.8 准备环节表单覆盖（🟡 中优先级）

**确认表需求（8个表单）：**

| 表单 | 当前支持 | 差距 | 证据 |
|------|---------|-----|------|
| QR-Pro-057 产品烘烤记录 | ⚠️ 有记录接口，未接入就绪检查 | 流程门禁未连接 | `mes/bake/routes.ts` |
| QR-Pro-013 锡膏使用记录 | ⚠️ 有记录，无时间规则与门禁 | 规则与门禁缺失 | `mes/solder-paste/routes.ts` |
| QR-Pro-073 温度测量记录 | ⚠️ 有 ColdStorageTemperatureRecord，未进入门禁 | 数据有入口，未用于规则判断 | `mes/solder-paste/routes.ts` |
| QR-Pro-089 钢网点检记录 | ⚠️ 仅有状态检查，无次数/张力 | 计数与点检字段缺口 | `LineStencil` 模型 |
| QR-Pro-130 钢网清洗记录 | ❌ 无专用记录 | 完全缺口 | - |
| QR-Mac-144 刮刀点检记录 | ❌ 无专用记录 | 完全缺口 | - |
| QR-Mac-155 夹具维护记录 | ❌ 仅有设备 TPM，无夹具实体/寿命模型 | 夹具层缺口 | - |
| QR-Pro-133 转拉前检查 | ⚠️ 覆盖不完整（程式/夹具/辅料缺失） | 见 2.6 | `readiness/service.ts` |

---

### 2.9 补录控制（🟡 中优先级）

**确认表需求：**
- 几乎所有表单**不允许补录**
- 仅"夹具维护记录"允许补录

**当前系统：**
- DataCollectionRecord 无补录限制字段
- 接口层未限制补录/回填窗口
- 可随时创建/更新记录

**差距：**
1. 需在 DataCollectionSpec 中增加 `allowBackfill: Boolean`
2. 需在 API 层校验：若 `allowBackfill=false` 且超过时间窗口，则拒绝
3. 需要补录策略与审计规则

---

### 2.10 其他差距（🟢 低优先级）

| 表单 | 当前状态 | 差距 |
|------|---------|-----|
| QR-Mac-238 AOI 每天开机点检 | 无对应接口 | 完全缺口，需 TPM 集成 |
| QR-Pro-034 生产异常报告 | 无异常报告接口 | 缺口，需与 TPM 集成 |
| QR-Mac-134 X-ray 检查记录表 | 无接口 | 完全缺口 |
| QR-IQC-01 不良物料评审报告 | 无 IQC 流程 | 完全缺口 |
| 生产数据记录表 | 无设备数采接口 | 缺口 |
| 产品出/入数记录表 | 仅有 Run/Unit 统计 | 仅部分覆盖 |

---

## 三、设计建议

### 3.1 时间规则引擎设计

```
┌─────────────────────────────────────────────────────────┐
│                    TimeRule Engine                       │
├─────────────────────────────────────────────────────────┤
│  TimeRule (配置)                                         │
│  ├─ id, name, description                               │
│  ├─ triggerEvent: "REFLOW_COMPLETE" | "PASTE_OPEN" | ...│
│  ├─ targetEvent: "WASH_START" | "PASTE_USE" | ...       │
│  ├─ timeLimitMinutes: 240 (4h) | 1440 (24h)             │
│  ├─ alertMode: "ALERT" | "BLOCK"                        │
│  └─ overridePermission: "factory_manager"               │
├─────────────────────────────────────────────────────────┤
│  TimeRuleInstance (运行时)                               │
│  ├─ ruleId, unitId/runId                                │
│  ├─ startedAt (触发时间)                                 │
│  ├─ expiresAt (到期时间)                                 │
│  ├─ status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "WAIVED"│
│  └─ waivedBy, waivedAt, waiverReason                    │
├─────────────────────────────────────────────────────────┤
│  TimeRuleMonitor (后台任务)                              │
│  └─ 每分钟扫描 ACTIVE 实例，超时则发 Alert               │
└─────────────────────────────────────────────────────────┘
```

**关键 API：**
- `POST /api/time-rules` - 配置时间规则
- `POST /api/time-rules/:id/instances` - 创建运行实例（由事件触发）
- `POST /api/time-rules/instances/:id/complete` - 完成实例
- `POST /api/time-rules/instances/:id/waive` - 豁免（需厂长权限）

---

### 3.2 权限体系扩展

```
角色层级：
├─ factory_manager (厂长)
│   └─ 权限：time_rule:override, run:authorize:override, *
├─ quality (质量)
│   └─ 权限：quality:disposition, readiness:override
├─ line_leader (组长)
│   └─ 权限：run:authorize, fai:sign, loading:audit
├─ operator (操作员)
│   └─ 权限：loading:operate, track:operate
```

**新增权限点：**
- `time_rule:override` - 豁免时间规则（仅厂长）
- `fai:sign` - 首件/末件签字
- `loading:audit` - 换料审核
- `backfill:approve` - 审批补录（若启用）

---

### 3.3 首件/末件签字增强

**Inspection 模型扩展：**
```prisma
model Inspection {
  // ... 现有字段

  // 类型（新增）
  type            InspectionType @default(FIRST)

  // 签字相关
  signedBy        String?   // 签字人 userId
  signedAt        DateTime? // 签字时间
  signatureRemark String?   // 签字备注

  // 审计
  signatureAuditLog Json? // 签字操作日志
}

enum InspectionType {
  FIRST   // 首件
  LAST    // 末件
}
```

**API 增强：**
- `POST /api/fai/:id/sign` - 首件签字（需二次验证）
- `POST /api/lai/:id/sign` - 末件签字
- 签字后自动触发相应门禁（首件→Run授权，末件→Run完工）

---

### 3.4 炉温程式记录设计【新增】

```prisma
model ReflowProfile {
  id          String   @id @default(cuid())
  name        String   // 程式名称
  zones       Json     // 温区参数
  productId   String?  // 关联产品
  version     String   // 程式版本
  createdAt   DateTime @default(now())
}

model ReflowProfileUsage {
  id          String   @id @default(cuid())
  runId       String
  profileId   String
  profile     ReflowProfile @relation(fields: [profileId], references: [id])
  usedBy      String   // 使用人
  confirmedBy String?  // 确认人
  usedAt      DateTime @default(now())
  matchResult String   // MATCH | MISMATCH
}
```

**API：**
- `GET /api/reflow-profiles` - 列出程式
- `POST /api/runs/:runNo/reflow-profile` - 记录程式使用
- 在 Readiness 中增加 PROGRAM 检查项

---

### 3.5 转拉前检查扩展【新增】

**ReadinessCheckType 扩展：**
```typescript
enum ReadinessCheckType {
  // 现有
  STENCIL,
  SOLDER_PASTE,
  EQUIPMENT,
  MATERIAL,

  // 新增
  PROGRAM,        // 程式一致性（与 ReflowProfile 联动）
  FIXTURE,        // 夹具状态（与 TPM 联动）
  AUXILIARY,      // 辅料检查
  STENCIL_CLEAN,  // 钢网清洗
  STENCIL_USAGE,  // 钢网使用次数/张力
  SCRAPER,        // 刮刀点检
  TEMPERATURE,    // 温度测量
}
```

**检查逻辑：**
- PROGRAM：读取 RoutingStep 的 expectedProfile，比对实际加载的程式
- FIXTURE：调用 TPM 接口查询夹具状态
- AUXILIARY：检查辅料清单是否齐全

---

### 3.6 换料审核设计【新增】

```prisma
model LoadingRecord {
  // ... 现有字段

  // 审核相关（新增）
  auditRequired  Boolean   @default(false)  // 是否需要审核
  auditedBy      String?                    // 审核人
  auditedAt      DateTime?                  // 审核时间
  auditResult    String?                    // APPROVED | REJECTED
  auditRemark    String?                    // 审核备注
}
```

**API：**
- `POST /api/loading/:id/audit` - 审核换料记录
- 审核通过后，换料才生效

---

### 3.7 准备环节数据采集扩展

**采集数据结构：**
```typescript
// 钢网使用次数记录
interface StencilUsageData {
  thickness: number;       // 厚度
  singleCount: number;     // 单次使用次数
  cumulativeCount: number; // 累计使用次数
  tension: number;         // 张力值
  damaged: boolean;        // 是否损坏
}

// 刮刀点检记录
interface ScraperCheckData {
  spec: string;            // 规格
  singleCount: number;
  cumulativeCount: number;
  edgeCondition: "OK" | "NG";  // 刀口状态
  flatness: "OK" | "NG";       // 平整度
}

// 夹具状态记录
interface FixtureCheckData {
  fixtureId: string;       // 夹具编号
  lifeRemaining: number;   // 剩余寿命（次数）
  maintenanceItems: string[];  // 维护项
  tpmStatus: string;       // TPM 状态
}
```

---

### 3.8 补录控制设计

**DataCollectionSpec 扩展：**
```prisma
model DataCollectionSpec {
  // ... 现有字段

  allowBackfill      Boolean @default(false)  // 是否允许补录
  backfillWindowMins Int?                     // 补录时间窗口（分钟）
}
```

**校验逻辑：**
```typescript
function validateBackfill(spec, recordTime, now) {
  if (!spec.allowBackfill) {
    if (now - recordTime > spec.backfillWindowMins * 60 * 1000) {
      throw new Error("该记录不允许补录");
    }
  }
}
```

---

## 四、实施路径建议

### Phase 1：核心门禁增强（1-2周）
1. [ ] 扩展权限体系，增加 `factory_manager` 角色
2. [ ] 增强 FAI 签字机制（signedBy/signedAt）
3. [ ] 实现补录控制逻辑
4. [ ] 扩展 Inspection 支持末件检查

### Phase 2：时间规则引擎（2-3周）
1. [ ] 设计 TimeRule/TimeRuleInstance 模型
2. [ ] 实现 TimeRuleMonitor 后台任务
3. [ ] 对接通知系统（Alert）
4. [ ] 实现回流焊→水洗、锡膏暴露两条规则

### Phase 3：准备环节扩展（2-3周）
1. [ ] 扩展 ReadinessCheckType（PROGRAM/FIXTURE/AUXILIARY）
2. [ ] 实现炉温程式记录（ReflowProfile/ReflowProfileUsage）
3. [ ] 实现钢网清洗、刮刀点检采集 API
4. [ ] 实现换料审核流程

### Phase 4：设备集成与 TPM 对接（按需）
1. [ ] 设计设备数采网关
2. [ ] 对接贴片机数据采集
3. [ ] 对接温度监控设备
4. [ ] 对接 TPM 系统（夹具/AOI点检/异常报告）

---

## 五、关键文件清单

### 证据文件（现有实现）

| 模块 | 文件路径 |
|-----|---------|
| 就绪门禁 | `apps/server/src/modules/mes/readiness/service.ts` |
| 上料防错 | `apps/server/src/modules/mes/loading/service.ts` |
| FAI | `apps/server/src/modules/mes/fai/routes.ts` |
| OQC | `apps/server/src/modules/mes/oqc/routes.ts` |
| 烘烤记录 | `apps/server/src/modules/mes/bake/routes.ts` |
| 锡膏/冷藏温度 | `apps/server/src/modules/mes/solder-paste/routes.ts` |
| 缺陷/返修 | `apps/server/src/modules/mes/defect/routes.ts` |
| 数据采集规范 | `apps/server/src/modules/mes/data-collection-spec/routes.ts` |

### 待改动文件

| 改动类型 | 文件路径 |
|---------|---------|
| Schema | `packages/db/prisma/schema/schema.prisma` |
| 权限定义 | `apps/server/src/modules/auth/permissions.ts` |
| FAI 服务 | `apps/server/src/modules/mes/fai/service.ts` |
| Readiness 服务 | `apps/server/src/modules/mes/readiness/service.ts` |
| Loading 服务 | `apps/server/src/modules/mes/loading/service.ts` |
| 时间规则（新） | `apps/server/src/modules/mes/time-rule/` |
| 炉温程式（新） | `apps/server/src/modules/mes/reflow-profile/` |
| 规格文档 | `domain_docs/mes/spec/data_collection/01_data_collection_specs.md` |
| 流程文档 | `domain_docs/mes/spec/process/03_smt_flows.md` |

---

## 六、验证方案

1. **单元测试**：
   - TimeRuleMonitor 超时检测逻辑
   - 补录校验逻辑
   - 换料审核状态机

2. **集成测试**：
   - 模拟回流焊→水洗超时场景，验证 Alert 触发
   - 模拟首件/末件签字流程
   - 模拟程式一致性校验

3. **E2E 测试**：
   - 完整 SMT 流程走通（准备→上料→首件→生产→末件→完工）
   - 验证所有门禁点

---

## 七、结论

当前系统已经覆盖了"上料防错 + FAI + OQC + Track 追溯"的核心主链路。

采集确认表中大量"准备类/设备类/质量类"表单仍处于：
- **缺失**：炉温程式、末件检查、钢网清洗、刮刀点检、夹具维护
- **仅有记录接口而未进入门禁**：烘烤、锡膏、温度测量
- **覆盖不完整**：转拉前检查（程式/夹具/辅料缺失）、换料记录（无审核）

若需与确认表保持一致，必须补齐：
1. 时间规则提醒与豁免机制
2. 首件/末件签字放行
3. 炉温程式一致性校验
4. 转拉前检查完整性
5. 换料审核流程
6. 寿命/点检记录
7. 设备数采接入与异常闭环
