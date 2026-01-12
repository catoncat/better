> **⚠️ 已过期 / OBSOLETE**
>
> 本评审报告生成于 M2 早期阶段。报告中列出的"缺失"项现已在 M2 完成实现：
> - ✅ 状态定义：三级状态机（WO/Run/Unit）已完整实现
> - ✅ TrackIn/TrackOut：单件追溯核心已实现
> - ✅ 不良处置：REWORK/SCRAP/HOLD 全流程已实现
> - ✅ OQC 抽检：触发条件、抽样算法、MRB 决策流程已完成
> - ✅ 异常处理闭环：record/handle/review 三步闭环已实现
>
> **As-Built 参考**：`domain_docs/mes/plan/phase2_tasks.md`（状态：已完成）
>
> **清理日期**：2026-01-12（任务 3.1.3）

---

SMT 流程图评审报告

一、流程概览对比

| 维度     | SMT 流程图 (草稿)   | MES 系统规范                             |
|----------|---------------------|------------------------------------------|
| 起点     | "SMT工单下达"       | ERP/APS Work Order Release → WO=RECEIVED |
| 准备阶段 | 钢网/锡膏/物料/设备 | Line readiness check                     |
| 首件     | 首件确认流程        | FAI task (FAI=PENDING)                   |
| 批量生产 | 监控维度(数采)      | Batch Execution (Routing Engine)         |
| 终点     | "转入DIP/测试工序"  | Unit complete → OQC → Closure            |

---
二、逻辑缺陷分析

2.1 缺少状态定义 ⚠️

问题：SMT 流程图只描述了活动流，没有明确的状态转换定义。

对比 MES：
- 工单：RECEIVED → RELEASED → IN_PROGRESS → COMPLETED
- 批次：PREP → AUTHORIZED → IN_PROGRESS → COMPLETED
- 单件：QUEUED → IN_STATION → DONE/OUT_FAILED
                                                                                               建议：在流程图中增加状态标注，例如：
Start(["SMT工单下达<br>WO=RECEIVED"]) --> A["SMT产线准备<br>RUN=PREP"]

2.2 异常处理闭环不完整 ⚠️

问题：上料防错中的 B8["异常处理"] 只回到 B2（扫码验证），没有考虑：
- 异常升级机制
- 异常记录归档
- 多次失败后的锁定策略

对比 MES：
POK -- No --> PEX[Exception record/handle/review] --> P
MES 规范中异常处理包含"record/handle/review"三步闭环。

建议：
B7 --> B8["异常处理<br>• 异常记录<br>• 原因分析<br>• 审核确认"]
B8 --> B9{重试次数?}
B9 -- <3次 --> B2
B9 -- >=3次 --> B10[人工介入/升级]

2.3 首件失败处理过于简化 ⚠️

问题：首件不合格只有一条路径 F["参数调整"] --> C1。

缺失：
- 不合格原因分类记录
- 连续失败的升级机制
- 物料/设备异常的分支处理

对比 MES：
FOK -- No --> ADJ[Parameter adjustment/cause record] --> F1
MES 明确要求"cause record"（原因记录）。

2.4 批量生产缺少不良品处理 ❌

问题：G_Sub [监控维度] 子流程是线性的，没有任何异常分支。

缺失：
- 不良品发现后的处理流程（返修/报废/隔离）
- 质量超标时的停线决策
- AOI/SPI 不良的反馈闭环

对比 MES：
RES -- FAIL --> NG[Record defect]
NG --> DISP{Disposition?}
DISP -- REWORK --> RW[Rework task/action]
DISP -- SCRAP --> SC[Scrap confirmation/record]
DISP -- HOLD --> HOLD[Hold isolation]

建议：增加质量判定分支：
G4 --> QC{质量判定}
QC -- 合格 --> H
QC -- 不良 --> NG[不良记录]
NG --> DISP{处置方式}
DISP -- 返修 --> RW[返修任务] --> G1
DISP -- 报废 --> SC[报废确认]
DISP -- 隔离 --> HOLD[隔离待处理]

2.5 缺少 OQC 出货检验 ❌

问题：流程直接从 J["SMT完工处理"] 跳到 K(["转入DIP/测试工序"])。

缺失：
- OQC 抽样检验触发条件
- OQC 不合格的处理
- 批次放行授权

对比 MES：
DONEU --> OQC{Trigger OQC sampling?}
OQC -- Yes --> OQCT[OQC sampling task] --> OQCP{OQC passed?}
OQCP -- No --> OQCH[Hold isolation] --> DISP
---
三、与 MES 系统的差异点

| 差异项         | SMT 草稿 | MES 规范                | 影响               |
|----------------|----------|-------------------------|--------------------
| 状态机         | 无       | 三级状态机(WO/Run/Unit) | 无法与系统状态同步 |
| TrackIn/Out    | 未体现   | 核心追溯机制            | 单件追溯断链       |
| Routing Engine | 未体现   | 执行引擎核心            | 工序流转无规范     |
| 不良处置       | 无       | REWORK/SCRAP/HOLD       | 质量闭环缺失       |
| OQC            | 无       | 出货抽检                | 批次放行无卡控     |
| 异常记录       | 简化     | record/handle/review    | 异常追溯不完整     |

---
四、具体修改建议

4.1 增加状态标注（高优先级）

在关键节点增加状态标识，与 MES 状态机对齐：

Start(["SMT工单下达<br>WO=RECEIVED"]) --> A["SMT产线准备<br>RUN=PREP"]
...
E["批量生产授权<br>RUN=AUTHORIZED"] --> G["批量生产监控<br>RUN=IN_PROGRESS"]
...
J["SMT完工处理<br>RUN=COMPLETED"]

4.2 增加 TrackIn/TrackOut 节点（高优先级）

在批量生产监控中增加追溯节点：

subgraph G_Sub [监控维度--数采]
    direction TB
    TI[SN TrackIn<br>扫码进站] --> G1
    G1["设备监控..."]
    ...
    G4 --> TO[TrackOut判定<br>PASS/FAIL]
    TO --> RES{结果?}
end

4.3 增加不良处置分支（必须）
RES -- FAIL --> NG[不良记录<br>• 不良模式<br>• 位置标记<br>• 图片证据]
NG --> DISP{处置方式?}
DISP -- 返修 --> RW[返修任务] --> TI
DISP -- 报废 --> SC[报废确认<br>库存扣减]
DISP -- 隔离 --> HOLD[隔离区<br>待MRB评审]

4.4 增加 OQC 节点（建议）

J["SMT完工处理"] --> OQC{触发OQC?}
OQC -- 否 --> K
OQC -- 是 --> OQCT[OQC抽样检验]
OQCT --> OQCR{OQC结果?}
OQCR -- 合格 --> K(["转入DIP/测试工序"])
OQCR -- 不合格 --> OQCH[批次隔离] --> MRB[MRB评审]

4.5 强化异常处理闭环

B7["报警锁定"] --> B8["异常处理<br>• 异常编号<br>• 原因分析<br>• 责任人"]
B8 --> B9{审核通过?}
B9 -- 是 --> B2
B9 -- 否 --> B10[升级处理<br>• 工程师介入<br>• 停线决策]

---
五、总结

| 类别       | 问题数 | 严重程度 |
|------------|--------|----------|
| 闭环缺失   | 3      | 高       |
| 状态缺失   | 1      | 高       |
| 功能缺失   | 2      | 中       |
| 细节不完善 | 2      | 低       |

核心问题：SMT 流程图是"活动图"而非"状态图"，与 MES 系统的状态机驱动模型存在本质差异。建议在保留当前活动描述的基础上，增加状态标注和异常分支，使其能够与 MES 系统的 TrackIn/TrackOut 和状态转换机制对接。
