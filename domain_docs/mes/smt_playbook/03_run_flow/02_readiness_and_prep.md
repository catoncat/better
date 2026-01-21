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
系统支持的 Readiness 项（Run.meta.readinessChecks.enabled）：
- STENCIL（钢网）
- SOLDER_PASTE（锡膏）
- EQUIPMENT（设备）
- MATERIAL（物料齐套）
- ROUTE（路由版本可用）
- LOADING（上料完成）

## 5. 数据如何产生
| 检查项 | 数据来源 | 产生方式 | 备注 |
|---|---|---|---|
| STENCIL | 线体钢网绑定 + 状态记录 | 配置/接口写入 | 需与产线绑定 |
| SOLDER_PASTE | 锡膏状态记录 | 扫码/接口写入 | 可关联批次 |
| EQUIPMENT | 设备状态记录 | TPM/接口同步 | 设备状态正常 |
| MATERIAL | 物料齐套检查 | 物料主数据 + BOM | 规则需配置 |
| ROUTE | 路由版本 | 路由编译 | READY 才可用 |
| LOADING | 上料期望 + 上料记录 | 加载站位表 + 扫码 | 全部 LOADED 才通过 |

## 6. 数据如何管理
- Readiness 检查结果记录在系统历史表中，可追溯。
- 若某项失败，Run 仍保持 PREP 状态，需要整改后重新检查。
- Run 授权时会强制触发一次 Formal Readiness 检查（如果未做）。

## 7. 真实例子（中文）
批次 `RUN-WO-20250526-001-01`：
- ROUTE：路由版本 READY OK
- STENCIL：钢网已绑定并状态合规 OK
- SOLDER_PASTE：锡膏批次扫码未过期 OK
- EQUIPMENT：贴片机状态 normal OK
- MATERIAL：物料齐套 OK
- LOADING：尚未完成 NO

结论：就绪检查未通过，不能进入上料/授权。

## 8. 演示数据生成建议
- 准备至少 1 个失败案例（例如 LOADING 未完成或 STENCIL 缺失）。
- 准备至少 1 个通过案例，确保后续可进入上料与 FAI。

## 9. 验证步骤（预览）
- 在 `/mes/runs/:runNo/readiness/check` 检查返回项，逐一核对。
- 在 Run 授权时验证：若未做就绪检查，系统会自动触发。

详细验证见 `05_validation/02_run_and_execution_validation.md`。
