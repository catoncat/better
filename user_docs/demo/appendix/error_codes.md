# 错误码速查表

> 常见错误码及其快速恢复方法。

---

## 上料阶段

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| RUN_NOT_FOUND | Run 不存在 | 确认 runNo 正确 |
| RUN_NOT_IN_PREP | Run 非 PREP 状态 | 需新建 Run |
| SLOT_MAPPING_MISSING | 站位缺少物料映射 | 补充映射后重试 |
| LOADING_ALREADY_STARTED | 已开始上料 | 继续上料或走清理流程 |
| SLOT_LOCKED | 站位已锁定 | 使用 engineer 账号解锁 |
| MATERIAL_MISMATCH | 物料不匹配 | 扫正确物料 |
| MATERIAL_LOT_NOT_FOUND | 物料批次不存在 | 检查条码或预注册批次 |
| MATERIAL_LOT_AMBIGUOUS | 条码不唯一 | 修正批次或清理数据 |
| SLOT_ALREADY_LOADED | 站位已上料 | 使用换料流程 |
| BARCODE_PARSE_ERROR | 条码格式错误 | 检查格式：`物料编码\|批次号` |

---

## 就绪检查阶段

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| READINESS_NOT_PASSED | 就绪检查未通过 | 修复或豁免失败项 |
| ROUTE_NOT_READY | 路由版本不可用 | 检查路由状态 |
| LOADING_NOT_COMPLETE | 上料未完成 | 完成所有站位上料 |
| PREP_CHECK_FAILED | 准备检查项失败 | 录入准备记录或豁免 |

---

## FAI 阶段

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| FAI_ALREADY_EXISTS | 已有未完成 FAI | 完成或取消现有 FAI |
| INSUFFICIENT_UNITS | Unit 数量不足 | 生成足够 Unit |
| FAI_NOT_INSPECTING | FAI 未在检验中 | 先启动 FAI |
| FAI_TRIAL_STEP_NOT_ALLOWED | 非首工序不允许试产 | 选择首工序过站 |
| FAI_NOT_SIGNED | FAI 未签字 | 完成 FAI 签字 |

---

## 授权阶段

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| FAI_GATE_BLOCKED | FAI 未 PASS | 完成 FAI 且 PASS |
| INVALID_RUN_STATUS | Run 状态不允许授权 | 确认 Run 为 PREP |

---

## 执行阶段

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| RUN_NOT_AUTHORIZED | Run 未授权 | 先授权 |
| UNIT_NOT_FOUND | Unit 不存在 | 先生成 Unit |
| UNIT_ALREADY_IN_STATION | Unit 已在站 | 先 TrackOut |
| UNIT_NOT_IN_STATION | Unit 不在站 | 先 TrackIn |
| STATION_NOT_IN_ROUTE | 站点不在路由中 | 检查路由配置 |
| REQUIRED_DATA_MISSING | 必填数据缺失 | 补全采集项 |
| DATA_VALIDATION_FAILED | 数据校验失败 | 修正数据值 |
| DISPOSITION_REQUIRED | 失败 Unit 未处置 | 先处置 |
| STEP_ORDER_VIOLATION | 工序顺序错误 | 按路由顺序过站 |

---

## OQC/MRB 阶段

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| OQC_NOT_FOUND | OQC 任务不存在 | 检查是否触发 OQC |
| OQC_ALREADY_COMPLETED | OQC 已完成 | 无需再次操作 |
| MRB_NOT_ALLOWED | 不允许 MRB 决策 | 确认 Run 为 ON_HOLD |

---

## 时间规则

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| TIME_RULE_EXPIRED | 时间规则已超时 | 豁免或更换物料 |
| TIME_RULE_WAIVE_NOT_ALLOWED | 无豁免权限 | 使用有权限的账号 |

---

## 维修相关

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| ENTITY_IN_MAINTENANCE | 实体正在维修 | 等待维修完成或更换实体 |
| MAINTENANCE_NOT_VERIFIED | 维修未验证 | 完成维修验证 |

---

## 通用错误

| 错误码 | 含义 | 快速恢复 |
|--------|------|----------|
| UNAUTHORIZED | 未授权/未登录 | 登录或使用有权限的账号 |
| FORBIDDEN | 权限不足 | 切换到有权限的账号 |
| NOT_FOUND | 资源不存在 | 检查 ID 或参数 |
| VALIDATION_ERROR | 参数校验失败 | 检查输入参数 |

---

## 返回

- [演示指南首页](../README.md)
- [SMT 异常处理](../smt/05_exception.md)
- [DIP 异常处理](../dip/02_exception.md)
