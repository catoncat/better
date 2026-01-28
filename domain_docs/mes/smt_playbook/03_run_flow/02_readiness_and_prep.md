# 准备流程与就绪检查（Readiness）

## 1. 目的
明确 SMT 产线“准备流程”与系统就绪检查项的关系，说明每项检查数据如何产生、如何管理。

## 2. 流程位置（对应 SMT 流程图）
- `产线准备` → `就绪检查通过?` → `上料防错`

## 3. 准备流程分解（现场语境）
来自流程图（smt_flow_user）：
- 钢网准备：钢网编号、版本验证、张力检测
- 锡膏管理：扫码追溯、回温时间、搅拌记录、有效期
- 物料备料：车间库扫码、Feeder 准备、物料核对
- 设备准备：贴片程序加载、设备参数设置、吸嘴准备

## 4. 系统就绪检查项
系统支持的 Readiness 项（Line.meta.readinessChecks.enabled，通过 `/api/lines/:lineId/readiness-config` 配置）：

### 4.1 基础检查项
| 检查项 | 说明 | 数据来源 |
|--------|------|----------|
| STENCIL | 钢网状态 | 线体钢网绑定 + 状态记录 |
| SOLDER_PASTE | 锡膏状态 | 锡膏批次扫码/状态记录 |
| EQUIPMENT | 设备状态 | TPM/设备接口同步 |
| MATERIAL | 物料齐套 | 物料主数据 + BOM |
| ROUTE | 路由版本 | 路由编译状态 = READY |
| LOADING | 上料完成 | 上料期望 + 上料记录 |

### 4.2 准备项检查（PREP_*）
| 检查项 | 说明 | 数据来源 |
|--------|------|----------|
| PREP_BAKE | PCB 烘烤确认 | BakeRecord（烘烤记录） |
| PREP_PASTE | 锡膏准备（使用记录） | SolderPasteUsageRecord（锡膏使用记录） |
| PREP_STENCIL_USAGE | 钢网使用准备 | StencilUsageRecord + 寿命检查 |
| PREP_STENCIL_CLEAN | 钢网清洗准备 | StencilCleaningRecord |
| PREP_SCRAPER | 刮刀点检准备 | SqueegeeUsageRecord（表面/刀口/平整度必填） |
| PREP_FIXTURE | 夹具寿命准备 | FixtureUsageRecord + 寿命检查 |
| PREP_PROGRAM | 炉温程式检查（期望程式可用） | ReflowProfile（期望程式 ACTIVE） |

### 4.3 时间规则检查
| 检查项 | 说明 | 数据来源 |
|--------|------|----------|
| TIME_RULE | 时间规则状态 | TimeRuleInstance 状态检查 |

详见 `08_time_rules.md`。

### 4.4 检查类型（PRECHECK / FORMAL）
- **PRECHECK**：预警用途，不阻塞授权；Run 详情页在 PREP 状态会自动触发以刷新结果。
- **FORMAL**：阻塞用途；Run 授权时会自动触发一次 FORMAL（如尚未执行），也可通过接口手动触发。

## 5. 数据如何产生
| 检查项 | 数据来源 | 产生方式 | 备注 |
|---|---|---|---|
| STENCIL | 线体钢网绑定 + 状态记录 | 配置/接口写入 | 需与产线绑定 |
| PREP_STENCIL_CLEAN | StencilCleaningRecord | 手工录入 `/mes/stencil-cleaning` | 用于门禁：要求存在清洗记录 |
| PREP_STENCIL_USAGE | StencilUsageRecord | 手工录入 | 使用记录 + 寿命检查 |
| SOLDER_PASTE | 锡膏状态记录 | 扫码/接口写入 | 可关联批次 |
| PREP_PASTE | SolderPasteUsageRecord | 手工录入 `/mes/solder-paste-usage` | 以使用记录为准 |
| EQUIPMENT | 设备状态记录 | TPM/接口同步 | 设备状态正常 |
| MATERIAL | 物料齐套检查 | 物料主数据 + BOM | 规则需配置 |
| ROUTE | 路由版本 | 路由编译 | READY 才可用 |
| LOADING | 上料期望 + 上料记录 | 加载站位表 + 扫码 | 全部 LOADED 才通过 |
| PREP_SCRAPER | SqueegeeUsageRecord | 手工录入 `/mes/squeegee-usage` | 表面/刀口/平整度必填 |
| PREP_BAKE | BakeRecord | 手工录入 | PCB 烘烤确认 |
| PREP_FIXTURE | FixtureUsageRecord | 手工/扫码录入 | 寿命超限则 FAIL |
| PREP_PROGRAM | ReflowProfile | 路由期望程式存在且 ACTIVE | 当前未校验实际设备程式 |
| TIME_RULE | TimeRuleInstance | Cron 扫描 + 事件驱动 | 超时则 FAIL |

## 6. 豁免机制

### 6.1 概述
当某个准备项检查失败但生产需要继续时，具有相应权限的角色可以进行豁免（Waive）操作。豁免记录将保留完整的审计追踪。

### 6.2 豁免权限
| 权限 | 说明 | 典型角色 |
|------|------|----------|
| `readiness:override` | 豁免准备项/时间规则检查 | 质量工程师（默认） |

### 6.3 豁免 API
```
POST /api/runs/:runNo/readiness/items/:itemId/waive

Request:
{
  "reason": "紧急生产需求，锡膏批次已确认可用"
}

Response:
{
  "id": "item-id",
  "status": "WAIVED",
  "waivedBy": "user-id",
  "waivedAt": "2026-01-27T10:00:00Z",
  "waiveReason": "紧急生产需求，锡膏批次已确认可用"
}
```

### 6.4 豁免记录字段
| 字段 | 类型 | 说明 |
|------|------|------|
| waivedBy | String | 豁免人用户 ID |
| waivedAt | DateTime | 豁免时间 |
| waiveReason | String | 豁免原因（必填） |

### 6.5 豁免规则
- 豁免原因必须填写，不能为空
- 豁免后检查项状态变为 `WAIVED`，不再阻塞授权
- 豁免操作会记录操作日志
- 当前系统未限制不可豁免项；如需限制，需在策略/权限层补齐

## 7. 数据如何管理
- Readiness 检查结果记录在系统历史表中，可追溯。
- 若某项失败，Run 仍保持 PREP 状态，需要整改后重新检查。
- Run 授权时会强制触发一次 Formal Readiness 检查（如果未做）。
- Run 详情页自动触发 PRECHECK 仅用于预警，不替代正式检查。
- 豁免记录保留在 ReadinessCheckItem 中，可追溯豁免人和原因。

## 8. 真实例子（中文）
批次 `RUN-WO-20250526-001-01`：
- ROUTE：路由版本 READY OK
- STENCIL：钢网已绑定并状态合规 OK
- SOLDER_PASTE：锡膏批次扫码未过期 OK
- EQUIPMENT：贴片机状态 normal OK
- MATERIAL：物料齐套 OK
- LOADING：尚未完成 NO
- PREP_SCRAPER：刮刀点检 OK（表面/刀口/平整度全部通过）
- TIME_RULE：锡膏暴露时间 18h（未超限） OK

结论：就绪检查未通过（LOADING 失败），不能进入上料/授权。

## 9. 演示数据生成建议
- 准备至少 1 个失败案例（例如 LOADING 未完成或 STENCIL 缺失）。
- 准备至少 1 个通过案例，确保后续可进入上料与 FAI。
- 准备 1 个豁免案例，验证豁免流程和权限控制。

## 10. 验证步骤（预览）
- 可先执行 `/mes/runs/:runNo/readiness/precheck` 获取预警结果。
- 在 `/mes/runs/:runNo/readiness/check` 获取 Formal 检查结果并核对。
- 在 Run 授权时验证：若未做就绪检查，系统会自动触发。
- 验证豁免 API 权限控制和记录写入。

详细验证见 `05_validation/02_run_and_execution_validation.md`。
