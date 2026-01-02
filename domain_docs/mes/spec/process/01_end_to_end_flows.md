# End-to-End Business Flows (Mermaid)

> **更新时间**: 2025-01-02
> **实现状态**: M1 系列已完成，M2 Line Readiness 已完成，其余 M2 功能进行中

## 实现进度说明

| 流程节点 | 状态 | 备注 |
|---------|------|------|
| ERP Master Data Sync | ✅ 已实现 | Kingdee 适配器 + Mock 模式 |
| Route import/normalize | ✅ 已实现 | ENG_Route 同步 |
| Configure execution semantics | ✅ 已实现 | 路由详情页可编辑 |
| Compile executable version | ✅ 已实现 | UI + API 可用 |
| MES receive work order | ✅ 已实现 | 手动/ERP 同步 |
| Dispatch to line | ✅ 已实现 | Release 操作 |
| Create production run | ✅ 已实现 | UI 可用 |
| Line readiness check | ✅ 已实现 | 设备/物料/路由检查 |
| Exception record/handle | ✅ 已实现 | 豁免 + 异常看板 |
| FAI task | ⬜ 未实现 | M2 待完成 |
| Batch authorization | ✅ 已实现 | 含 Readiness 门禁 |
| TrackIn/TrackOut (MANUAL) | ✅ 已实现 | 工位执行页 |
| AUTO/BATCH/TEST ingest | ⚠️ 部分实现 | 框架就绪，待扩展 |
| Data collection | ⬜ 未实现 | M3 待完成 |
| Record defect | ⚠️ 部分实现 | 表存在，逻辑待完善 |
| Disposition (REWORK/SCRAP/HOLD) | ⬜ 未实现 | M2 待完成 |
| OQC sampling | ⬜ 未实现 | M2 待完成 |
| Final confirmation/closeout | ⬜ 未实现 | M2 待完成 |

---

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
  R --> P[Line readiness check<br/>equipment/material/process docs/qualification]
  P --> POK{Ready?}
  POK -- No --> PEX[Exception record/handle/review] --> P
  POK -- Yes --> FAI[Create FAI task<br/>FAI=PENDING]

  FAI --> F1[FAI trial run (limited quantity allowed)]
  F1 --> F2[FAI inspection record]
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

    DC[Collect/validate by config<br/>manual/auto/frequency/spec/limits] --> OUT[TrackOut decision]
    OUT --> RES{PASS/FAIL?}
    RES -- PASS --> ADV[Advance routing pointer]
    RES -- FAIL --> NG[Record defect]
    NG --> DISP{Disposition?}
    DISP -- REWORK --> RW[Rework task/action] --> S0
    DISP -- SCRAP --> SC[Scrap confirmation/record] --> DONEU
    DISP -- HOLD --> HOLD[Hold isolation] --> REL[Release/review] --> S0

    ADV --> LAST{Last step?}
    LAST -- No --> S0
    LAST -- Yes --> DONEU[Unit complete]
  end

  DONEU --> OQC{Trigger OQC sampling?}
  OQC -- No --> FINCHK{Run/WO complete?}
  OQC -- Yes --> OQCT[OQC sampling task] --> OQCP{OQC passed?}
  OQCP -- No --> OQCH[Hold isolation] --> DISP
  OQCP -- Yes --> FINCHK

  FINCHK -- No --> LOOP
  FINCHK -- Yes --> LASTCONF[Final confirmation/closeout]
  LASTCONF --> ARCH[Archive/feedback placeholder]
  ARCH --> END((Closure))
```

## References
- `domain_docs/mes/spec/integration/01_system_integrations.md`
