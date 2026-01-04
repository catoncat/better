# End-to-End Business Flows (Mermaid)


```mermaid
flowchart TB
  subgraph ERP_SYNC["ERP Master Data and Routing Sync"]
    direction TB
    R0((ERP Routing/Master Data)) --> R1[Route import/normalize]
    R1 --> R2[Mapping validate/complete<br/>Operation/WorkCenter]
    R2 --> R3[Configure execution semantics<br/>RouteExecutionConfig]
    R3 --> R4[Compile executable version<br/>ExecutableRouteVersion=READY]
  end

  A((ERP/APS Work Order Release)) --> B[MES receive work order<br/>WO=RECEIVED]
  B --> C[Dispatch to line/station group<br/>WO=RELEASED]

  C --> R[Create production run<br/>RUN=PREP]
  R4 --> R
  R --> P[Line readiness check<br/>🔌 钢网就绪/锡膏合规<br/>物料备料/设备就绪]
  P --> POK{Ready?}
  POK -- No --> PEX[Exception record/handle/review] --> P
  POK -- Yes --> LV[Loading verify<br/>站位表→扫码→BOM比对→绑定]

  LV --> LVOK{Loading OK?}
  LVOK -- No --> LVERR[Alarm/lock/retry] --> LV
  LVOK -- Yes --> FAI[Create FAI task<br/>FAI=PENDING]

  FAI --> F1[FAI trial run (limited quantity)]
  F1 --> F2[FAI inspection record<br/>🔌 SPI/AOI results]
  F2 --> FOK{FAI passed?}
  FOK -- No --> ADJ[Parameter adjustment/cause record] --> F1
  FOK -- Yes --> AUTH[Batch authorization<br/>RUN=AUTHORIZED]

  AUTH --> LOOP

  subgraph LOOP["Batch Execution (Routing Engine)"]
    direction TB
    S0[Select/confirm next step] --> ST{Station Type?}
    ST -- MANUAL --> M1[Operator sign-in at station]
    M1 --> M2[SN TrackIn] --> DC
    ST -- AUTO --> A1[Equipment event TrackIn/Out ingest] --> DC
    ST -- BATCH --> B1[Carrier/lot TrackIn/Out ingest] --> DC
    ST -- TEST --> T1[Test result ingest/integration] --> DC

    DC[Collect/validate by config<br/>🔌 auto/manual/spec/limits] --> OUT[TrackOut decision]
    OUT --> RES{PASS/FAIL?}
    RES -- PASS --> ADV[Advance routing pointer]
    RES -- FAIL --> NG[Record defect<br/>code/location/description]
    NG --> DISP{Disposition?}
    DISP -- REWORK --> RW[Rework task/action] --> S0
    DISP -- SCRAP --> SC[Scrap confirmation<br/>UNIT=SCRAPPED] --> DONEU
    DISP -- HOLD --> HOLD[Hold isolation<br/>UNIT=ON_HOLD] --> REL[MRB review/release] --> DISP

    ADV --> LAST{Last step?}
    LAST -- No --> S0
    LAST -- Yes --> DONEU[Unit complete<br/>UNIT=DONE]
  end

  DONEU --> OQC{Trigger OQC sampling?}
  OQC -- No --> FINCHK{Run/WO complete?}
  OQC -- Yes --> OQCT[OQC sampling task] --> OQCP{OQC passed?}
  OQCP -- No --> OQCH[Batch hold isolation] --> OQCMRB[MRB review]
  OQCMRB -- Release --> FINCHK
  OQCMRB -- Rework --> LOOP
  OQCMRB -- Scrap --> OQCSC[Batch scrap]
  OQCP -- Yes --> FINCHK

  FINCHK -- No --> LOOP
  FINCHK -- Yes --> LASTCONF[Final confirmation/closeout<br/>RUN=COMPLETED]
  LASTCONF --> ARCH[Archive/feedback placeholder]
  ARCH --> END((Closure))
```

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔌 | Integration point (supports AUTO/MANUAL fallback) |

## State Reference

| Entity | States |
|--------|--------|
| WorkOrder | RECEIVED → RELEASED → IN_PROGRESS → COMPLETED |
| Run | PREP → AUTHORIZED → IN_PROGRESS → COMPLETED |
| Unit | IN_STATION → QUEUED / OUT_FAILED / DONE / ON_HOLD / SCRAPPED |

## References
- SMT 产线流程: `domain_docs/mes/spec/process/03_smp_flows.md`
- 状态机定义: `domain_docs/mes/spec/process/02_state_machines.md`
- 集成规范: `domain_docs/mes/spec/integration/01_system_integrations.md`
