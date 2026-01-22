# SMT 流程深度分析报告

> 日期: 2026-01-19
> 范围: 台山利华电子 SMT 产线真实流程与 MES 系统能力对比
> 输出: 深度差距分析 + 字段级映射 + 改进建议 + 实施路线

---

## 第一章：执行摘要

### 1.1 报告目的与范围

- 还原客户 SMT 真实工作流的操作步骤、责任人、时间约束与表单数据。
- 对照现有 MES 流程与实现能力，识别功能、数据、流程差距。
- 提出分阶段、可实施的改进建议与路线图。

资料来源:
- `compair/smt_flow_user.md`
- `compair/smt_flow_checkpoint.md`
- `compair/smt_forms/*.md`
- `spec/process/03_smt_flows.md`
- `spec/impl_align/03_smt_align.md`
- `packages/db/prisma/schema/schema.prisma`

### 1.2 核心发现汇总

- 客户流程以表单驱动为主，追溯颗粒度细，包含多类时间约束与签字确认（单签）。
- 现有系统的流程框架完整（工单、Run、FAI、TrackIn/Out、不良、MRB、OQC），但多数表单的字段级记录尚未映射或未实现 UI 采集。
- 关键差距集中在时间窗口控制、辅料生命周期、设备点检、签字确认与异常报告电子化。

### 1.3 覆盖率与差距矩阵

口径说明:
- 完整: 系统已具备对应模型与流程入口，可直接承载关键字段。
- 部分: 系统可通过泛化模型承载部分字段，但缺少专用字段或规则。
- 缺失: 无模型、无流程入口或无约束逻辑。

| 维度 | 现状 | 说明 |
| --- | --- | --- |
| 工单与批次管理 | 完整 | WorkOrder/Run 流程已对齐 |
| 上料防错 | 完整 | Loading 验证与锁定已对齐 |
| 首件检验 | 部分 | FAI 有数据模型，签字走单签字段，缺细项标准落地 |
| SPI/AOI 设备数据 | 部分 | 有 InspectionResultRecord，但未覆盖日常点检与规则 |
| 锡膏生命周期 | 部分 | 有状态记录与绑定，但缺时间窗控制与回温/搅拌流程 |
| 钢网/刮刀寿命 | 部分/缺失 | 有钢网状态记录，但无使用次数与刮刀管理 |
| 烘烤记录 | 缺失 | 无专用模型与流程入口 |
| 炉温程式 | 缺失 | 无记录与校验机制 |
| 换料记录 | 部分 | LoadingRecord 可覆盖部分字段，但缺包装数量、审核 |
| 日常 QC 统计 | 缺失 | Defect 有基础，但缺日报统计结构 |

### 1.4 建议优先级矩阵

优先级评估维度:
- 合规追溯影响（高/中/低）
- 现场执行阻断程度（高/中/低）

| 优先级 | 主题 | 影响 | 说明 |
| --- | --- | --- | --- |
| P1 | 时间窗口与关键追溯 | 高 | 直接影响质量追溯与合规 |
| P2 | 设备/工艺稳定性 | 中 | 影响过程可控性与监控能力 |
| P3 | 维护与优化 | 低 | 提升管理与审计便利 |

---

## 第二章：客户工作流程全景图

### 2.1 四阶段工艺流程时间线

1. 准备阶段
   - 钢网、锡膏、物料、设备准备
   - 转拉前检查与确认
2. 上料阶段
   - 站位表加载
   - 扫码逐行验证与锁定
3. 首件阶段
   - 首件贴装与检测
   - 不合格回路（调整后重测）
4. 批量阶段
   - 监控 OEE/工艺/质量/物料
   - 数据分析与决策闭环
   - 完工转 DIP/测试

### 2.2 阶段分解表（活动、时间约束、表单、人员）

| 阶段 | 关键活动 | 时间约束 | 主要表单 | 责任人 |
| --- | --- | --- | --- | --- |
| 准备 | 钢网/锡膏/物料/设备准备 | 转拉前半天完成 | QR-Pro-133, QR-Pro-089, QR-Pro-013 | 组长/授权人员 |
| 上料 | 站位表校验、扫码防错 | 上料过程中实时校验 | QR-Pro-121 | 操作员/QC |
| 首件 | SPI/回流/AOI/首件确认 | 印锡到焊接小于 4h | QR-Pro-05, QR-Mac-134 | 生产/技术/质量 |
| 批量 | 设备/工艺/质量/物料监控 | 过程实时监控 | 生产数据, 换料, QC 报表 | 生产/QC |

---

## 第三章：逐工序节点详细分析

以下按客户真实工序顺序，逐节点对比。

### 3.1 产品烘烤记录 (QR-Pro-057)

**客户做什么**
- 记录 PCB/BGA 等烘烤温度、时长、数量、入炉/出炉时间与负责人。
- 烘烤过程与工序准备强绑定。

**我们能做什么**
- 可通过 DataCollectionSpec/DataValue 作为人工记录载体。
- 无专用烘烤记录模型与 UI 表单。

**差距分析**
- 缺失标准字段结构与审核签名。
- 无烘烤与工单/Run 的自动关联规则。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 产品名称/物料 P/N | QR-Pro-057 | WorkOrder.productCode 或 DataValue | 无专用字段 |
| 烘烤温度/时长 | QR-Pro-057 | DataValue | 需定义数据规范 |
| 入炉/出炉时间与责任人 | QR-Pro-057 | DataValue/Track.meta | 无统一 UI |
| 确认者 | QR-Pro-057 | Inspection.decidedBy | 无对口流程 |

**改进建议**
- 新增 BakeRecord 模型与 UI，绑定 Run 与物料批次。
- 引入烘烤时间规则校验与报警。

---

### 3.2 锡膏管理 (QR-Pro-013 + QR-Pro-073)

**客户做什么**
- 记录锡膏收料、有效期、解冻/回温/搅拌、领用/回收、使用人。
- 冰箱温度每日两次记录并形成趋势图。

**我们能做什么**
- 已有 SolderPasteStatusRecord 记录 thawedAt/stirredAt/expiresAt。
- LineSolderPaste 支持线上当前锡膏绑定。
- 无温度记录与回温时间窗口规则。

**差距分析**
- 无冰箱温度记录模型与趋势图。
- 无 24h 暴露或回温/搅拌流程锁定。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 锡膏序号/批次 | QR-Pro-013 | SolderPasteStatusRecord.lotId | 缺收料数量字段 |
| 解冻/回温/搅拌时间 | QR-Pro-013 | thawedAt/stirredAt | 无时间窗校验 |
| 领用/回收时间 | QR-Pro-013 | meta 或 DataValue | 无流程入口 |
| 冰箱温度 | QR-Pro-073 | 无 | 缺模型 |

**改进建议**
- 增加 SolderPasteUsage 记录表与冷藏温度记录。
- 引入 24h 暴露锁定与告警逻辑。

---

### 3.3 钢网管理 (QR-Pro-089 + QR-Pro-130)

**客户做什么**
- 记录钢网厚度、单次/累计印刷次数、张力、损坏检查与更换时间。
- 钢网清洗与维护记录。

**我们能做什么**
- StencilStatusRecord 可记录张力与清洗时间。
- LineStencil 可记录当前绑定与更换。

**差距分析**
- 无使用次数/寿命阈值管理。
- 钢网清洗记录缺失结构化字段。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 钢网编号/厚度 | QR-Pro-089 | StencilStatusRecord.stencilId | 缺厚度字段 |
| 单次/累计印刷次数 | QR-Pro-089 | 无 | 缺模型 |
| 张力检测 | QR-Pro-089 | tensionValue | 可用但未对接 |
| 清洗日期/操作员 | QR-Pro-130 | lastCleanedAt/meta | 无 UI |

**改进建议**
- 新增 StencilUsage 记录，维护累计次数与寿命阈值。
- 增加清洗记录表单与自动提醒。

---

### 3.4 刮刀管理 (QR-Mac-144)

**客户做什么**
- 记录刮刀单次/累计使用次数、检查项与更换时间。

**我们能做什么**
- 无专用模型。
- 可通过 DataCollectionSpec 作为临时记录。

**差距分析**
- 缺刮刀生命周期管理与预警。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 刮刀编号/规格 | QR-Mac-144 | 无 | 缺模型 |
| 使用次数/寿命 | QR-Mac-144 | 无 | 缺模型 |
| 点检结果/负责人 | QR-Mac-144 | 无 | 缺流程入口 |

**改进建议**
- 新增 SqueegeeUsage 模型与周检提醒规则。

---

### 3.5 转拉前检查 (QR-Pro-133)

**客户做什么**
- 组长提前半天检查烘烤、物料、辅料、程式、钢网/刮刀/夹具等。
- 记录需要/不需要与 OK/N/A 结果。

**我们能做什么**
- Run ReadinessCheck/ReadinessCheckItem 支持预检查与正式检查。
- 可记录 itemType/itemKey/状态与豁免原因。

**差距分析**
- 缺明确的检查项模板与字段结构。
- 缺检查人/复核人签名链路。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 检查项目清单 | QR-Pro-133 | ReadinessCheckItem | 缺模板 |
| 需要/不需要 | QR-Pro-133 | 无 | 缺字段 |
| OK/N/A | QR-Pro-133 | ReadinessCheckItem.status | 需映射规则 |
| 确认人 | QR-Pro-133 | ReadinessCheck.checkedBy | 缺复核 |

**改进建议**
- 增加标准化检查项模板和签字字段。

---

### 3.6 上料防错 (QR-Pro-121)

**客户做什么**
- 站位表逐行对照、扫码验证、错误锁定与重试。

**我们能做什么**
- LoadingRecord、RunSlotExpectation、FeederSlot 支持扫码验证、锁定与记录。
- API 已对齐 (`/api/loading/verify`)。

**差距分析**
- 缺对照表字段中的“单耗/共用料”标识。
- 缺加载站位表版本管理与签字。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 站位与零件 P/N | QR-Pro-121 | SlotMaterialMapping | 可用 |
| 单耗/共用料 | QR-Pro-121 | 无 | 缺字段 |
| 上机确认 | QR-Pro-121 | LoadingRecord.loadedBy | 缺签字字段 |

**改进建议**
- 扩展 SlotMaterialMapping.meta 或新增字段支持共用料标识。
- 加入站位表版本与确认流程。

---

### 3.7 换料记录 (QR-Mac-022)

**客户做什么**
- 记录换料时间、位置、零件编码、包装数量、设备、审核。

**我们能做什么**
- LoadingRecord 记录 slot、materialLot、materialCode、loadedAt、loadedBy。

**差距分析**
- 缺包装数量、审核人、设备号等字段。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 换料时间/位置 | QR-Mac-022 | LoadingRecord.loadedAt/slotId | 可用 |
| 零件编码 | QR-Mac-022 | materialCode | 可用 |
| 包装数量 | QR-Mac-022 | 无 | 缺字段 |
| 审核人 | QR-Mac-022 | 无 | 缺字段 |

**改进建议**
- 扩展 LoadingRecord.meta 并提供换料表单 UI。

---

### 3.8 首末件检查 (QR-Pro-05)

**客户做什么**
- 首件与末件覆盖多工序检查，包含 IPC-A-610 标准与 CPK 指标。
- 生产/技术/质量多方确认。

**我们能做什么**
- Inspection/InspectionItem 可记录首件检查项与结果。
- FAI 流程已对齐。

**差距分析**
- 缺末件检查的独立节点与确认字段。
- 缺检查项模板与质量标准模板。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 检查项与标准 | QR-Pro-05 | InspectionItem.itemName/itemSpec | 需模板 |
| 结果与责任人 | QR-Pro-05 | InspectionItem.result/inspectedBy | 可用 |
| 签字确认 | QR-Pro-05 | Inspection.signedBy/signedAt | 单签可用 |

**改进建议**
- 增加末件检查类型与检查项模板（签字走单签字段）。

---

### 3.9 AOI 每日点检 (QR-Mac-238)

**客户做什么**
- 每日开机点检记录样品、版本、程序与结果。

**我们能做什么**
- InspectionResultRecord 接收 AOI 结果，但无每日点检表。

**差距分析**
- 缺日常点检模板与故障反馈流程。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 点检样品型号/版本 | QR-Mac-238 | 无 | 缺模型 |
| 点检结果 | QR-Mac-238 | InspectionResultRecord.result | 不匹配 |
| QC 反馈 | QR-Mac-238 | 无 | 缺流程 |

**改进建议**
- 新增 EquipmentDailyCheck 表单与异常闭环。

---

### 3.10 炉温程式记录 (QR-Pro-105)

**客户做什么**
- 记录产品与炉温程式映射、使用人、确认人。

**我们能做什么**
- 当前无炉温程式记录模型。

**差距分析**
- 缺炉温程式与产品绑定记录。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 炉温程式名称 | QR-Pro-105 | 无 | 缺模型 |
| 使用人/确认人 | QR-Pro-105 | 无 | 缺字段 |

**改进建议**
- 新增 ReflowProfileUsage 模型与审批字段。

---

### 3.11 时间窗口控制（印锡到焊接小于 4h, 锡膏暴露小于 24h）

**客户做什么**
- 对关键工序时间间隔设置硬约束。

**我们能做什么**
- TrackIn/TrackOut 记录时间。
- SolderPasteStatusRecord 记录 thawedAt。

**差距分析**
- 缺时间窗规则引擎与阻断逻辑。
- 缺违规标记与例外审批机制。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 印锡时间 | 工艺流程表 | Track.inAt | 无约束 |
| 回流焊时间 | 工艺流程表 | Track.outAt | 无约束 |
| 锡膏暴露时间 | QR-Pro-013 | SolderPasteStatusRecord.thawedAt | 无 24h 规则 |

**改进建议**
- 新增 TimeWindowPolicy +违规判定与审批机制。

---

### 3.12 每日 QC 检验 (QR-Ins-02)

**客户做什么**
- 记录缺陷类型、时间段、统计与纠正措施。

**我们能做什么**
- Defect 记录单件缺陷，但无日报结构。

**差距分析**
- 缺日报汇总与缺陷趋势统计。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 缺陷类型/数量 | QR-Ins-02 | Defect.code/qty | 无日报结构 |
| 缺陷率/统计 | QR-Ins-02 | 无 | 缺统计表 |
| 纠正措施 | QR-Ins-02 | Defect.meta | 无流程 |

**改进建议**
- 新增 DailyQcReport 模型与统计逻辑。

---

### 3.13 生产异常报告 (QR-Pro-034)

**客户做什么**
- 记录停机/影响、异常描述、纠正措施与确认。

**我们能做什么**
- Defect/Disposition 可记录个别不良。
- AuditEvent 可记录系统操作。

**差距分析**
- 缺异常事件级别的独立报告模型。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 停机时间与影响 | QR-Pro-034 | 无 | 缺模型 |
| 异常描述与措施 | QR-Pro-034 | Defect.meta | 无结构 |
| 确认签字 | QR-Pro-034 | 无 | 缺字段 |

**改进建议**
- 新增 ProductionExceptionReport 与审批流。

---

### 3.14 维修记录 (QR-Pro-012)

**客户做什么**
- 记录返修原因、措施、结果与责任人。

**我们能做什么**
- Defect/Disposition/ReworkTask 模型支持返修任务流转。

**差距分析**
- 缺返修表单字段与操作记录。
- 当前样例为空，字段需确认。

**字段级对比表**

| 客户字段 | 客户表单 | 系统字段/模型 | 差距 |
| --- | --- | --- | --- |
| 返修原因/措施 | QR-Pro-012 | Disposition.reason | 缺结构 |
| 返修结果 | QR-Pro-012 | ReworkTask.status | 缺记录 |
| 责任人/签字 | QR-Pro-012 | doneBy | 缺签字 |

**改进建议**
- 明确 QR-Pro-012 字段后补齐 RepairRecord 模型。

---

## 第四章：系统数据模型差距汇总

### 4.1 辅料管理模型缺失表

| 辅料 | 客户要求 | 系统现状 | 差距 |
| --- | --- | --- | --- |
| 锡膏 | 生命周期记录 + 温度监控 | 有状态记录，无温控 | 缺温控与时间窗 |
| 钢网 | 使用次数/寿命 | 有状态记录 | 缺寿命计数 |
| 刮刀 | 使用次数/寿命 | 无 | 缺模型 |
| 夹具 | 使用寿命/维护 | 无 | 缺模型 |

### 4.2 时间控制点实现差距表

| 时间控制点 | 客户要求 | 系统现状 | 差距 |
| --- | --- | --- | --- |
| 印锡到焊接 < 4h | 强制约束 | 仅记录时间 | 缺规则引擎 |
| 锡膏暴露 < 24h | 强制约束 | 记录 thawedAt | 缺锁定/告警 |
| 转拉前检查提前完成 | 过程要求 | 无校验 | 缺流程约束 |

### 4.3 签字确认机制差距表

| 场景 | 客户要求 | 系统现状 | 差距 |
| --- | --- | --- | --- |
| 首件确认 | 首件签字（单签） | signedBy/signedAt 单签 | 已覆盖 |
| 转拉前检查 | 组长审核（单签） | checkedBy 单签 | 已覆盖 |
| 生产异常 | 异常确认 | 无 | 缺审批 |

---

## 第五章：系统化改进建议

### 5.1 P1 高优先级（影响追溯合规）

1. 烘烤记录管理（BakeRecord）
2. 锡膏 24h 暴露锁定与报警
3. 钢网使用次数寿命管理（6 万次阈值）
4. FAI 签字与末件检查
5. 印锡到焊接 4h 窗口控制

### 5.2 P2 中优先级（增强监控能力）

1. 设备每日点检表单（AOI/SPI）
2. 炉温程式记录与校验
3. 换料记录表单扩展（包装数量/审核）
4. 日常 QC 报表统计与趋势
5. 生产异常报告电子化

### 5.3 P3 低优先级（Nice to have）

1. 刮刀寿命管理
2. 钢网清洗记录表单
3. 夹具维护记录
4. 生产数据记录表电子化

---

## 第六章：实施路线图

### 阶段一：核心时间控制（2 周）
- 时间窗口规则引擎
- 锡膏 24h 暴露锁定
- 印锡到焊接 4h 检查

### 阶段二：辅料生命周期（2 周）
- 锡膏使用记录与温控
- 钢网寿命管理与清洗记录
- 刮刀使用记录

### 阶段三：表单电子化（2 周）
- 转拉前检查
- 换料记录
- 烘烤记录

### 阶段四：质量闭环增强（1 周）
- 日常 QC 报表
- AOI 点检
- 生产异常报告

---

## 第七章：具体实施方案（整合版）

### 7.1 实施前置确认（必须完成）

1. 表单字段校准与版本确认  
   - 对 `smt_forms/*.md` 逐一确认字段是否齐全、版本是否最新。  
   - 补齐 `QR-Pro-012` 维修记录表字段定义。  
2. 数据来源确认  
   - 设备数据来源是否可通过集成上报（SPI/AOI/X-ray/回流焊/冰箱温度）。  
   - 需要人工录入的字段清单与责任岗位。  
3. 时间窗口规则基准  
   - “印锡→焊接 < 4h”与“锡膏暴露 < 24h”的起止事件定义。  
   - 违规处理方式（锁定、告警、豁免审批）。  

### 7.2 工作包拆分与交付物

| 工作包 | 范围 | 关键依赖 | 交付物 |
| --- | --- | --- | --- |
| WP-1 时间窗口规则 | 印锡→焊接 4h，锡膏暴露 24h | Track 时间戳、锡膏使用记录 | 规则服务 + 违规日志 + 告警策略 |
| WP-2 烘烤记录 | QR-Pro-057 字段落地 | MaterialLot / Run 关联规则 | BakeRecord 模型 + UI 表单 |
| WP-3 锡膏生命周期 | QR-Pro-013 + QR-Pro-073 | SolderPasteStatusRecord | 使用记录 + 冷藏温度记录 |
| WP-4 钢网/刮刀寿命 | QR-Pro-089 + QR-Mac-144 | LineStencil / StencilStatusRecord | 使用记录 + 寿命阈值 + 点检 |
| WP-5 转拉前检查 | QR-Pro-133 | ReadinessCheck/Item | 检查项模板 + 单签确认 |
| WP-6 FAI 签字与末件 | QR-Pro-05 | Inspection/InspectionItem | 单签字 + 末件检查类型 |
| WP-7 设备点检 | QR-Mac-238 | 设备台账/集成来源 | EquipmentDailyCheck 表单 |
| WP-8 炉温程式 | QR-Pro-105 | 设备集成或人工录入 | ReflowProfileUsage 记录 |
| WP-9 换料记录增强 | QR-Mac-022 | LoadingRecord | 包装数量、审核人、查询 |
| WP-10 质量与异常 | QR-Ins-02 + QR-Pro-034 | Defect/Disposition | 日报统计 + 异常报告 |

说明:
- WP-1/WP-2/WP-3/WP-4/WP-6 为 P1 核心交付。
- WP-5/WP-7/WP-8/WP-9 为 P2。
- WP-10 及夹具维护为 P3。

### 7.3 分阶段实施计划（整合）

阶段 0: 资料对齐与字段确认（1 周）
- 统一表单字段版本与缺失项补齐
- 定义时间窗口规则起止事件与违规策略

阶段 1: P1 核心追溯（2-3 周）
- 时间窗口规则引擎
- 烘烤记录、锡膏生命周期、钢网寿命
- FAI 签字与末件检查

阶段 2: P2 过程监控（2-3 周）
- 转拉前检查模板化
- 设备点检、炉温程式记录
- 换料记录增强

阶段 3: P3 质量闭环与维护（1-2 周）
- 日常 QC 报表
- 生产异常报告
- 夹具维护记录

### 7.4 验收标准（P1 关键项）

| 事项 | 验收标准 |
| --- | --- |
| 时间窗口规则 | 超时自动标记并阻断（或需豁免审批） |
| 烘烤记录 | 记录完整字段 + 可关联 Run/物料批次 |
| 锡膏暴露 | 有效期与暴露时间可追溯并可告警 |
| 钢网寿命 | 累计次数可追踪，超阈值不可使用 |
| FAI 签字 | 签字人可追溯（单签） |

### 7.5 风险与依赖

- 设备数据接口缺失导致无法自动采集（需人工表单兜底）。  
- 时间窗口规则起止事件在现场易有争议，需要业务确认。  
- 签字流程可能影响节拍，需要明确权限与豁免规则。  

### 7.6 待补资料清单

- `QR-Pro-012` 维修记录完整字段与示例。  
- 设备点检与炉温程式是否有现成系统可对接。  
- 换料审核流程是否必须双人确认。  

---

## 附录 A：21 个客户表单与系统功能映射表

| 表单 | 目的 | 关键字段 | 系统映射 | 覆盖度 |
| --- | --- | --- | --- | --- |
| QR-Pro-057 | 产品烘烤记录 | 温度/时长/入出炉/确认 | DataCollectionSpec/DataValue | 缺失 |
| QR-Pro-013 | 锡膏使用记录 | 解冻/领用/回收/使用人 | SolderPasteStatusRecord | 部分 |
| QR-Pro-073 | 冰箱温度记录 | AM/PM 温度与人员 | 无 | 缺失 |
| QR-Pro-089 | 钢网使用次数点检 | 次数/寿命/张力 | StencilStatusRecord | 部分 |
| QR-Pro-130 | 钢网清洗记录 | 清洗日期/人员 | StencilStatusRecord.lastCleanedAt | 部分 |
| QR-Mac-144 | 刮刀使用记录 | 使用次数/寿命/点检 | 无 | 缺失 |
| QR-Mac-155 | 夹具维护记录 | 维护检查/寿命 | 无 | 缺失 |
| QR-Pro-133 | 转拉前检查 | 检查项/OK/N.A. | ReadinessCheck/Item | 部分 |
| QR-Pro-121 | 上机对照表 | 站位/P.N./确认 | SlotMaterialMapping/LoadingRecord | 部分 |
| QR-Mac-022 | 换料记录 | 时间/站位/包装/审核 | LoadingRecord | 部分 |
| QR-Pro-05 | 首末件检查 | 检查项/标准/判定 | Inspection/InspectionItem | 部分 |
| QR-Mac-238 | AOI 点检 | 样品/版本/结果 | 无 | 缺失 |
| QR-Pro-105 | 炉温程式记录 | 程式/使用者 | 无 | 缺失 |
| QR-Ins-02 | 每日 QC 报表 | 缺陷统计/纠正 | Defect | 缺失 |
| QR-Pro-034 | 生产异常报告 | 停机/影响/措施 | Defect/AuditEvent | 部分 |
| QR-Pro-012 | 维修记录 | 返修原因/措施 | Disposition/ReworkTask | 部分 |
| QR-Mac-134 | X-ray 检查 | 原因/结果/审核 | InspectionResultRecord | 部分 |
| 工艺-时间-检测流程表 | 全流程节点时间 | 时间与节点 | Track/Inspection | 部分 |
| 生产数据记录表 | 产量/时间/损耗 | Track/DataValue | 部分 |
| 产品出入数记录表 | 入库数量统计 | 数量/签收 | Run/Unit | 部分 |
| QR-IQC-01 | 不良物料评审 | 缺陷/原因/围堵/处置 | MaterialLot.iqcResult/Defect | 部分 |

说明:
- “部分”代表已有数据模型但缺少字段或 UI 支持。
- “缺失”代表无模型或无流程入口。

---

## 附录 B：数据模型变更清单（建议）

建议新增/扩展模型:

1. BakeRecord
   - runId, materialCode, bakeTemp, bakeDuration, inAt, outAt, operatorId, approvedBy
2. SolderPasteUsage
   - lotId, thawedAt, warmedAt, stirredAt, usedAt, returnedAt, operatorId
3. ColdStorageTemperatureLog
   - deviceId, measuredAt, temperature, operatorId, reviewerId
4. StencilUsage
   - stencilId, printCount, cumulativeCount, tensionValues, checkedBy, replacedAt
5. SqueegeeUsage
   - squeegeeId, printCount, cumulativeCount, checkedBy, replacedAt
6. PreRunChecklistTemplate + PreRunChecklistItem
   - checklist template + run-specific records
7. ReflowProfileUsage
   - profileName, productCode, runId, usedBy, confirmedBy
8. DailyQcReport
   - date, line, defectSummary, defectRate, correctiveAction
9. ProductionExceptionReport
   - runId, downtime, impact, description, correctiveAction, confirmedBy
10. RepairRecord
   - defectId, action, result, repairedBy, verifiedBy
11. TimeWindowPolicy
   - policyType, startEvent, endEvent, maxDuration, violationAction

---

## 验证清单

- 结构: 6 章 + 附录完整
- 14 个节点逐一覆盖并含字段级对比
- 21 个表单全部映射
- 改进建议有优先级与路线图
