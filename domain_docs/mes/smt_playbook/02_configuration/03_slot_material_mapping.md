# 站位物料映射

## 1. 目标
把“站位（FeederSlot）”与“期望物料（Material）”绑定，形成上料防错的规则来源。

## 2. 数据如何产生
- 来源：工程师在 `/mes/loading/slot-config` → “物料映射”维护。
- 一条映射代表：在某个站位上，针对某产品/路由，应上哪一个物料。

## 3. 关键字段含义
| 字段 | 含义 | 示例 |
|---|---|---|
| `slotId` | 站位 ID（FeederSlot id，非站位码） | cmkxxxxxx |
| `materialCode` | 物料编码 | 5212090001 |
| `productCode` | 产品编码（可选） | MB-A |
| `routingId` | 路由（可选） | SMT-主板A-标准路由 |
| `priority` | 优先级（小优先） | 1 |
| `isAlternate` | 是否替代料 | false |
| `unitConsumption` | 单机用量 | 1 |
| `isCommonMaterial` | 通用料标记 | false |

> **注意**：创建/更新映射使用 `slotId`（站位 ID）。站位码（如 2F-46）为 UI 展示字段 `slotCode`。

## 4. 规则匹配逻辑（简化）
当加载站位表时，系统会：
1) 取当前批次的 `productCode` 与 `routingId`
2) 在映射中选择“最具体”的规则（同时匹配产品+路由优先）
3) 以 `priority` 选主料（`isAlternate=false`），其余作为替代料

## 5. 与真实表单的对应
在 **SMT物料上机对照表（QR‑Pro‑121）** 中：
- “站位”对应 `slotCode`（站位码）
- “零件 P/N”对应 `materialCode`
- “单耗/共用料”分别对应 `unitConsumption` / `isCommonMaterial`

## 6. 典型配置示例
| 站位 | 物料编码 | 产品 | 路由 | 优先级 | 替代料 |
|---|---|---|---|---|---|
| 2F-46 | 5212090001 | MB-A | SMT-主板A | 1 | 否 |
| 2F-46 | 5212090001B | MB-A | SMT-主板A | 2 | 是 |
| 1R-14 | 5212098001 | MB-A | SMT-主板A | 1 | 否 |

## 7. 管理建议
- 尽量保证每个站位至少有一条主料映射。
- 替代料应有清晰的审批规则（在系统中体现为 `isAlternate=true`）。
- 如果同一站位对不同产品有不同物料，应使用 `productCode` 进行区分。
