# SMT 差距系统开发任务分解

> 状态：**Phase 3 已完成**（设备数采为可选）
> 依据：`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
> 更新时间：2026-01-24
> 目标：将设计建议转化为可执行的开发任务，明确优先级与依赖关系

---

## 0. 实施约束（已确认）

- 非门禁项**记录必须存在**；有可靠自动数据源可自动确认，否则必须人工确认
- 豁免权限归属**厂长角色**，明确授予 `prep:waive`/`time_rule:override` 权限
- 回流焊/AOI → 水洗 4h 规则**仅适用于配置水洗工序的路由/产品**；无水洗节点不触发
- 时间规则为提醒 + 可豁免（软门禁），不作为强阻断
- 配置落地采用**混合策略**：仓库内模板 + 落库覆盖（需审计）
- 准备项记录必须绑定产线；门禁证据以 **Run 级别关联** 为目标（需补 runId/routeStepId 等字段）
- `PREP_FIXTURE` 暂只做寿命检查，TPM 相关字段（维护项/维护人）后续对接

---

## 1. 任务清单

### 1.1 准备项管理

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T1.1 | 扩展 ReadinessCheckType（PREP_BAKE/PASTE/STENCIL_*/SCRAPER/FIXTURE） | ✅ | - | Schema + Enum |
| T1.2 | 豁免机制 API（waive + waivedBy/waiveReason） | ✅ | T1.1 | 复用 READINESS_OVERRIDE |
| T1.3 | 准备项看板 UI | ✅ | T1.1, T1.2 | 复用 Run 详情页 Readiness 卡片 |

**As-built**：
- T1.1: `packages/db/prisma/schema/schema.prisma` (runId/routingStepId in records)
- T1.2: `apps/server/src/modules/mes/readiness/routes.ts`
- T1.3: Run 详情页已集成

### 1.2 FAI 签字

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T1.4 | FAI 签字字段（signedBy/signedAt/signatureRemark） | ✅ | - | Schema + API |
| T1.5 | 签字门禁逻辑（Run 授权前必须检查首件签字） | ✅ | T1.4 | 不写 Readiness |

**As-built**：
- T1.4: Inspection 模型 + sign API
- T1.5: Run authorize 流程

### 1.3 时间规则引擎

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T2.1 | TimeRuleDefinition + TimeRuleInstance 模型设计 | ✅ | - | 状态：ACTIVE/COMPLETED/EXPIRED/WAIVED |
| T2.2 | 规则监控后台任务（Cron Job） | ✅ | T2.1 | 每分钟扫描 + Alert + 豁免 |
| T2.3 | 锡膏暴露规则（24h） | ✅ | T2.1, T2.2 | 触发：锡膏发出 |
| T2.4 | 水洗时间规则（4h） | ✅ | T2.1, T2.2 | 仅配置水洗工序的路由 |

**As-built**：
- T2.1: `TimeRuleDefinition` + `TimeRuleInstance` 模型
- T2.2: `apps/server/src/modules/mes/time-rule/cron.ts`
- T2.3/T2.4: 规则配置 + 测试

#### 1.3.1 Time Rule 事件流（Plan A / DB 事件表）

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T2.9 | 事件表（Event）模型 + 索引 | ✅ | T2.1 | 支持状态/重试/保留期 |
| T2.10 | 事件发射（TrackIn/TrackOut/锡膏使用） | ⬜ | T2.9 | 事件码：TRACK_IN/OUT、SOLDER_PASTE_USAGE_CREATE |
| T2.11 | 事件处理器（30s 轮询） | ⬜ | T2.9 | 幂等 + 重试（10 次，指数退避） |
| T2.12 | TimeRule 触发改为事件驱动 | ⬜ | T2.10, T2.11 | 取消业务硬编码创建/完成 |
| T2.13 | 事件保留与清理任务（30 天） | ⬜ | T2.11 | 过期清理 + 失败归档 |

### 1.4 炉温程式

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T2.5 | ReflowProfile 模型（程式名称、温区参数、版本） | ✅ | - | 含 ReflowProfileUsage |
| T2.6 | 程式一致性校验（BLOCK） | ✅ | T2.5 | Routing 定义 expectedProfile |

**As-built**：
- T2.5: `ReflowProfile` + `ReflowProfileUsage` 模型
- T2.6: Readiness PROGRAM 检查项

### 1.5 钢网/刮刀寿命

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T2.7 | 钢网清洗记录 | ✅ | - | StencilCleaningRecord + API + UI |
| T2.8 | 刮刀点检记录 | ✅ | - | SqueegeeUsageRecord + API + UI |

**As-built**：
- T2.7: `/mes/stencil-cleaning`
- T2.8: `/mes/squeegee-usage`

### 1.6 维修表单

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T3.1 | 维修表单（MaintenanceRecord） | ✅ | - | 支持 FIXTURE/STENCIL/SQUEEGEE/EQUIPMENT |

**As-built**：
- 模型: `MaintenanceRecord` (MaintenanceEntityType, MaintenanceType, MaintenanceStatus)
- API: list/get/create/update/complete/verify
- UI: `/mes/maintenance-records`

### 1.7 设备数采（可选）

| ID | 任务 | 状态 | 依赖 | 备注 |
|----|------|------|------|------|
| T3.2 | 数采网关设计 | ⬜ | - | 架构文档 + POC，视现场条件 |
| T3.3 | 自动数据源接入 | ⬜ | T3.2 | 幂等/去重 + dataSource=DEVICE 自动确认 |

---

## 2. 验收标准

### Phase 1 验收（✅ 已通过）
- [x] Readiness 支持所有 PREP_* 检查类型
- [x] 豁免 API 可用，记录完整
- [x] 首件必须签字后才能授权 Run
- [x] 准备项看板可展示所有项状态
- [x] 非门禁项记录必达；自动/人工确认策略可见且可审计

### Phase 2 验收（✅ 已通过）
- [x] 锡膏暴露超 24h 自动 Alert
- [x] 水洗时间规则按路线生效
- [x] 炉温程式校验通过才能继续
- [x] 钢网清洗/刮刀点检记录可录入

### Phase 2.1 验收（事件驱动）
- [ ] 事件表落库并可追溯（状态/重试/错误）
- [ ] 规则实例由事件触发创建/完成（无硬编码触发）
- [ ] 30s 轮询可稳定处理事件，失败可重试
- [ ] 事件 30 天保留 + 清理任务生效

### Phase 3 验收
- [x] 维修记录与 Readiness 联动
- [ ] （可选）设备数据自动写入

---

## 3. 参考文档

- `domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
- `domain_docs/mes/spec/config/templates/prep_item_policy.template.yaml`
- `domain_docs/mes/spec/config/02_db_override_schema.md`

状态图例：⬜ 待开发 / 🔄 进行中 / ✅ 已完成
