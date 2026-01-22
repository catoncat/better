# MES 配置模板（SMT 确认表落地）

> 目的：将 SMT 确认表的落地口径固化为“可执行配置模板”，避免硬编码与口径漂移。
> 策略：混合模式（仓库模板为默认值，允许落库覆盖并保留审计）。

## 1. 目录结构（推荐）

```
config/
  README.md
  02_db_override_schema.md
  templates/
    prep_item_policy.template.yaml
    time_rule_config.template.yaml
    waive_permission_matrix.template.yaml
  samples/
    smt_a_prep_item_policy.yaml
    smt_a_time_rule_config.yaml
    smt_a_waive_permission_matrix.yaml
```

- `templates/*` 为默认模板（随版本管理，便于评审与回滚）。
- 落库配置可以覆盖模板，但需保留审计与回滚能力。
- 覆盖落库规范见：`domain_docs/mes/spec/config/02_db_override_schema.md`

## 2. 使用约定（仅文档，不实现）

- 规则默认从 `templates/*` 加载。
- 现场变更通过配置覆盖（DB 或配置服务）生效。
- 所有覆盖必须记录：变更人、时间、原因、影响范围。

## 3. 关联规范

- 设计依据：`domain_docs/mes/spec/process/compair/smt_gap_design_suggestions.md`
- 任务落地：`domain_docs/mes/plan/smt_gap_task_breakdown.md`

## 4. 配置模板说明

- `prep_item_policy.template.yaml`：准备项策略（recordRequired/confirmMode/dataSource/waive）
- `time_rule_config.template.yaml`：时间规则（scope/事件/阈值/豁免）
- `waive_permission_matrix.template.yaml`：豁免权限映射（角色 -> 权限）

## 5. 样例配置

- `samples/smt_a_prep_item_policy.yaml`：SMT-A 准备项策略样例
- `samples/smt_a_time_rule_config.yaml`：SMT-A 时间规则样例
- `samples/smt_a_waive_permission_matrix.yaml`：SMT-A 豁免权限样例
