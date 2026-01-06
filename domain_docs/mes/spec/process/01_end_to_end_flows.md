# MES 端到端流程

```mermaid
flowchart TB
  subgraph ERP_SYNC["ERP 主数据/工艺同步"]
    direction TB
    R0((ERP 数据)) --> R1[路由/主数据同步入库]
    R1 --> R2[映射校验/补全 (Operation/WorkCenter)]
    R2 --> R3[配置执行语义 (RouteExecutionConfig)]
    R3 --> R4[编译可执行版本 (ExecutableRouteVersion=READY)]
  end

  A((工单下达)) --> B[工单接收 (WO=RECEIVED)]
  B --> C[工单释放/派工 (WO=RELEASED)]

  C --> R[创建批次 (Run=PREP)]
  R4 --> R

  R --> P[产线准备/就绪检查]
  P --> POK{就绪通过?}
  POK -- 否 --> PEX[异常处理] --> P
  POK -- 是 --> LV[上料防错]

  LV --> LVOK{上料通过?}
  LVOK -- 否 --> LVERR[报警/锁定/重试] --> LV
  LVOK -- 是 --> FAI[创建 FAI (FAI=PENDING)]

  FAI --> F1[FAI 试产]
  F1 --> F2[FAI 记录/判定]
  F2 --> FOK{FAI 合格?}
  FOK -- 否 --> F1
  FOK -- 是 --> AUTH[Run 授权 (Run=AUTHORIZED)]

  AUTH --> LOOP

  subgraph LOOP["批量执行 (Run=IN_PROGRESS)"]
    direction TB
    S0[选择/确认下一工序] --> ST{站点类型?}
    ST -- MANUAL --> M1[人工进站] --> DC
    ST -- AUTO --> A1[设备事件进出站] --> DC
    ST -- BATCH --> B1[载具/批次进出站] --> DC
    ST -- TEST --> T1[测试结果接入] --> DC

    DC[数据采集/校验] --> OUT[出站判定]
    OUT --> RES{PASS/FAIL?}
    RES -- PASS --> LAST{末工序?}
    LAST -- 否 --> ADV[推进路由 (Unit=QUEUED)] --> S0
    LAST -- 是 --> DONEU[Unit 完成 (Unit=DONE)]

    RES -- FAIL --> NG[不良记录 (Unit=OUT_FAILED)]
    NG --> DISP{处置?}
    DISP -- REWORK --> RW[返修任务/回流] --> S0
    DISP -- SCRAP --> SC[报废确认 (Unit=SCRAPPED)]
    DISP -- HOLD --> HOLD[隔离 (Unit=ON_HOLD)] --> QA[处置评审] --> DISP
  end

  DONEU --> RUNCHK{Run 完成?}
  RUNCHK -- 否 --> LOOP
  RUNCHK -- 是 --> OQC{触发 OQC?}
  OQC -- 否 --> COMPLETED[Run=COMPLETED]
  OQC -- 是 --> OQCT[OQC 抽检任务] --> OQCP{OQC 合格?}
  OQCP -- 合格 --> COMPLETED
  OQCP -- 不合格 --> OQCH[Run=ON_HOLD]

  OQCH --> MRB_RUN{MRB 决策?}
  MRB_RUN -- 放行 --> COMPLETED
  MRB_RUN -- 返修 --> CLOSED_REWORK[Run=CLOSED_REWORK (创建返修 Run)]
  MRB_RUN -- 报废 --> SCRAPPED[Run=SCRAPPED]

  COMPLETED --> END((结束))
  CLOSED_REWORK --> END
  SCRAPPED --> END
```

## 说明

- 本文定义 MES 的通用端到端闭环流程；SMT/DIP 细节见对应流程文档。
- Run/WO/Unit 的状态枚举与语义以状态机文档为准。

## References

- SMT 流程: `spec/process/03_smp_flows.md`
- DIP 流程: `spec/process/04_dip_flows.md`
- 实现对齐: `spec/impl_align/01_e2e_align.md`
- 任务追踪: `plan/phase2_tasks.md`
