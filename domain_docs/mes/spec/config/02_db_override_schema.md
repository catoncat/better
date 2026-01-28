# 配置覆盖（DB Override）设计说明

> 目的：支持现场快速调整配置，同时保留审计与回滚能力。
> 范围：仅描述配置覆盖的数据模型与规则，不涉及实现。

## 1. 配置覆盖策略

- 默认配置来自仓库模板：`domain_docs/mes/spec/config/templates/*`
- DB 覆盖只对指定 scope 生效，并记录审计与变更原因
- 回滚通过“撤销当前覆盖”或“激活历史覆盖版本”完成

## 2. 数据模型建议

### 2.1 ConfigOverride

建议字段：
- `id`：唯一标识
- `configType`：`PREP_ITEM_POLICY` | `TIME_RULE_CONFIG` | `WAIVE_PERMISSION_MATRIX`
- `scopeType`：`GLOBAL` | `LINE` | `ROUTE` | `PRODUCT`
- `scopeRef`：对应的编码（如 `SMT-A` / `SMT-BOT-标准路由` / `5223029018`）
- `status`：`DRAFT` | `ACTIVE` | `ARCHIVED`
- `payloadJson`：覆盖内容（JSON 或 YAML 转 JSON）
- `templateVersion`：模板版本号（用于追溯基线）
- `checksum`：覆盖内容哈希
- `createdBy` / `createdAt`
- `updatedBy` / `updatedAt`
- `approvedBy` / `approvedAt`
- `changeReason`
- `rollbackOf`：指向被回滚的覆盖 id
- `effectiveFrom` / `effectiveTo`

### 2.2 ConfigOverrideAudit（或复用现有审计日志）

建议字段：
- `overrideId`
- `action`：`CREATE` | `UPDATE` | `APPROVE` | `ACTIVATE` | `ROLLBACK` | `ARCHIVE`
- `actorId`
- `actorRole`
- `diffJson`
- `reason`
- `createdAt`

## 3. 合并与优先级规则

1) 先加载模板（repo 内默认值）
2) 按 scope 覆盖（从弱到强）：`GLOBAL` → `LINE` → `ROUTE` → `PRODUCT`
3) 同 scope 多条覆盖时：仅允许 1 条 `ACTIVE`，或按 `updatedAt` 最新优先

## 4. 校验规则（示例）

- `itemCode` 必须在 `ReadinessCheckType` 中存在
- `confirmMode=AUTO` 时 `dataSource` 必须为可靠数据源（SYSTEM/DEVICE）
- `startEvent` / `endEvent` 必须为已定义事件枚举
- `scopeRef` 必须存在（对应产线/路由/产品）

## 5. 变更流程建议

- `DRAFT` → 审批 → `ACTIVE`
- 任何 `ACTIVE` 变更需记录 diff 与原因
- 回滚：将当前 `ACTIVE` 标为 `ARCHIVED`，恢复上一个 `ACTIVE`

## 6. 权限建议

- 配置变更：`system:config` 或独立的 `config:manage`
- 配置审批：`system:config` + 质量角色复核（可选）
- 豁免执行权限仍由 `readiness:override` 控制

## 7. 参考

- 设计依据：`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
- 模板目录：`domain_docs/mes/spec/config/templates/`
- 样例配置：`domain_docs/mes/spec/config/samples/`
