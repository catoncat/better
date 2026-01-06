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

  subgraph LOOP["Batch Execution (Routing Engine, RUN=IN_PROGRESS)"]
    direction TB
    S0[Select/confirm next step] --> ST{Station Type?}
    ST -- MANUAL --> M1[Operator sign-in at station]
    M1 --> M2[SN TrackIn] --> DC
    ST -- AUTO --> A1[Equipment event TrackIn/Out ingest] --> DC
    ST -- BATCH --> B1[Carrier/lot TrackIn/Out ingest] --> DC
    ST -- TEST --> T1[Test result ingest/integration] --> DC

    DC[Collect/validate by config<br/>🔌 auto/manual/spec/limits] --> OUT[TrackOut decision]
    OUT --> RES{PASS/FAIL?}
    RES -- PASS --> LAST{Last step?}
    LAST -- No --> ADV[Advance routing pointer<br/>UNIT=QUEUED] --> S0
    LAST -- Yes --> DONEU[Unit complete<br/>UNIT=DONE]

    RES -- FAIL --> NG[Record defect<br/>UNIT=OUT_FAILED<br/>code/location/description]
    NG --> DISP{Disposition?}
    DISP -- REWORK --> RW[Rework task/action] --> S0
    DISP -- SCRAP --> SC[Scrap confirmation<br/>UNIT=SCRAPPED]
    DISP -- HOLD --> HOLD[Hold isolation<br/>UNIT=ON_HOLD] --> QA[Quality disposition/release] --> DISP
  end

  DONEU --> RUNCHK{Run complete?}
  RUNCHK -- No --> LOOP
  RUNCHK -- Yes --> OQC{Trigger OQC sampling?}
  OQC -- No --> COMPLETED[RUN=COMPLETED]
  OQC -- Yes --> OQCT[OQC sampling task] --> OQCP{OQC passed?}
  OQCP -- Yes --> COMPLETED
  OQCP -- No --> OQCH[Hold isolation<br/>RUN=ON_HOLD]

  OQCH --> MRB_RUN{MRB Decision?}
  MRB_RUN -- Release --> COMPLETED
  MRB_RUN -- Rework --> CLOSED_REWORK[RUN=CLOSED_REWORK<br/>创建返修Run]
  MRB_RUN -- Scrap --> SCRAPPED[RUN=SCRAPPED]

  COMPLETED --> FINCHK{Run/WO complete?}
  CLOSED_REWORK --> END
  SCRAPPED --> END

  FINCHK -- No --> LOOP
  FINCHK -- Yes --> LASTCONF[Final confirmation/closeout]
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
| Run | PREP → AUTHORIZED → IN_PROGRESS → ON_HOLD → COMPLETED / CLOSED_REWORK / SCRAPPED |
| Unit | QUEUED ↔ IN_STATION → QUEUED / OUT_FAILED / DONE / ON_HOLD / SCRAPPED |

## References
- SMT 产线流程: `domain_docs/mes/spec/process/03_smp_flows.md`
- DIP 产线流程: `domain_docs/mes/spec/process/04_dip_flows.md`
- 状态机定义: `domain_docs/mes/spec/process/02_state_machines.md`
- 集成规范: `domain_docs/mes/spec/integration/01_system_integrations.md`

---

## Implementation Status

<!-- 完成 MES 功能后同步更新此表。Status: ✅ done | 🟡 partial | ⬜ pending | 🔌 integration -->

### 图例

| 状态 | 含义 |
|------|------|
| ✅ | 已完成（API + 后端 + 前端） |
| 🟡 | 部分完成（API + 后端，前端未完成） |
| ⬜ | 未开始（规划中） |
| 🔌 | 外部集成点 |
| - | 无需前端 |

### 工单管理

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| 工单接收 | `POST /api/integration/erp/work-orders/sync` | `integration/service.ts` | - | ✅ | M1 |
| 工单列表查询 | `GET /api/work-orders` | `work-order/service.ts` | `routes/mes/work-orders.tsx` | ✅ | M1 |
| 工单释放 | `POST /api/work-orders/{woNo}/release` | `work-order/service.ts` | `work-order-release-dialog.tsx` | ✅ | M1 |

### 批次管理

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| 批次列表查询 | `GET /api/runs` | `run/service.ts` | `routes/mes/runs/index.tsx` | ✅ | M1 |
| 批次详情查询 | `GET /api/runs/{runNo}` | `run/service.ts` | `routes/mes/runs/$runNo.tsx` | ✅ | M1 |
| 创建批次 | `POST /api/work-orders/{woNo}/runs` | `work-order/service.ts` | `run-create-dialog.tsx` | ✅ | M1 |
| 批次授权 | `POST /api/runs/{runNo}/authorize` | `run/service.ts` | `routes/mes/runs/$runNo.tsx` | ✅ | M1 |
| 批次撤销授权 | `POST /api/runs/{runNo}/authorize` (revoke) | `run/service.ts` | `routes/mes/runs/$runNo.tsx` | ✅ | M1 |

### 就绪检查 🔌

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| 就绪检查状态查询 | `GET /api/runs/{runNo}/readiness/latest` | `readiness/service.ts` | `routes/mes/runs/$runNo.tsx` | ✅ | M2 |
| 就绪异常列表 | `GET /api/readiness/exceptions` | `readiness/service.ts` | `routes/mes/readiness-exceptions.tsx` | ✅ | M2 |
| 钢网就绪检查 🔌 | `POST /api/runs/{runNo}/readiness/check` | `readiness/service.ts` | - | ✅ | M2 |
| 锡膏合规检查 🔌 | `POST /api/runs/{runNo}/readiness/check` | `readiness/service.ts` | - | ✅ | M2 |

### 上料防错

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| 上料验证页面 | `GET /api/runs/{runNo}/loading/expectations` | `loading/service.ts` | `routes/mes/loading/index.tsx` | ✅ | M2 |
| 扫码验证 | `POST /api/loading/verify` | `loading/service.ts` | `loading/scan-panel.tsx` | ✅ | M2 |

### FAI 首件检验

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| FAI 列表查询 | `GET /api/fai` | `fai/service.ts` | `routes/mes/fai.tsx` | ✅ | M1 |
| FAI 创建 | `POST /api/fai/run/{runNo}` | `fai/service.ts` | `routes/mes/fai.tsx` | ✅ | M1 |
| FAI 记录检验项 | `POST /api/fai/{faiId}/items` | `fai/service.ts` | `routes/mes/fai.tsx` | ✅ | M1 |
| FAI 完成 | `POST /api/fai/{faiId}/complete` | `fai/service.ts` | `routes/mes/fai.tsx` | ✅ | M1 |

### 执行追溯

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| 执行工作台 | - | - | `routes/mes/execution.tsx` | ✅ | M1 |
| TrackIn | `POST /api/stations/{stationCode}/track-in` | `execution/service.ts` | `routes/mes/execution.tsx` | ✅ | M1 |
| TrackOut | `POST /api/stations/{stationCode}/track-out` | `execution/service.ts` | `routes/mes/execution.tsx` | ✅ | M1 |
| 查询 Unit 追溯 | `GET /api/trace/units/{sn}` | `trace/service.ts` | `routes/mes/trace.tsx` | ✅ | M1 |

### 不良管理

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| 不良列表查询 | `GET /api/defects` | `defect/service.ts` | `routes/mes/defects.tsx` | ✅ | M1 |
| 不良记录 | `POST /api/defects` | `defect/service.ts` | `routes/mes/execution.tsx` | ✅ | M1 |
| 不良处置 | `POST /api/defects/{defectId}/disposition` | `defect/service.ts` | `routes/mes/defects.tsx` | ✅ | M2 |
| 返修任务列表 | `GET /api/rework-tasks` | `defect/service.ts` | `routes/mes/rework-tasks.tsx` | ✅ | M2 |

### OQC 抽检

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| OQC 列表查询 | `GET /api/oqc` | `oqc/service.ts` | `routes/mes/oqc.tsx` | ✅ | M2 |
| OQC 创建（手动） | `POST /api/oqc/run/{runNo}` | `oqc/service.ts` | `routes/mes/oqc.tsx` | ✅ | M2 |
| OQC 记录检验项 | `POST /api/oqc/{oqcId}/items` | `oqc/service.ts` | `oqc-record-dialog.tsx` | ✅ | M2 |
| OQC 完成 | `POST /api/oqc/{oqcId}/complete` | `oqc/service.ts` | `oqc-complete-dialog.tsx` | ✅ | M2 |
| OQC 抽样规则管理 | `GET/POST /api/oqc/sampling-rules` | `oqc/sampling-rule-service.ts` | `routes/mes/oqc/rules.tsx` | ✅ | M2 |

### MRB 评审

| 流程节点 | API | Backend Module | Frontend | Status | MS |
|---------|-----|----------------|----------|--------|-----|
| MRB 决策记录 | `POST /api/runs/{runNo}/mrb-decision` | `oqc/mrb-service.ts` | `mrb-decision-dialog.tsx` | ✅ | M2 |
| 创建返修 Run | `POST /api/runs/{runNo}/rework` | `oqc/mrb-service.ts` | `mrb-decision-dialog.tsx` | ✅ | M2 |
| 查询返修 Run | `GET /api/runs/{runNo}/rework-runs` | `oqc/mrb-service.ts` | `routes/mes/runs/$runNo.tsx` | ✅ | M2 |

## MRB Decision & Terminal States

OQC 不合格时触发 MRB 评审，Run 进入 `ON_HOLD` 状态后根据 MRB 决策进入终态：

| MRB 决策 | 原 Run 终态 | 行为 |
|---------|-----------|------|
| Release (放行) | `COMPLETED` | 质量问题已解决或可接受 |
| Rework (返修) | `CLOSED_REWORK` | 创建返修 Run，原 Run 闭环 |
| Scrap (报废) | `SCRAPPED` | 整批报废，无后续 Run |

**返修 Run 类型**:
- `REUSE_PREP`: 复用就绪，返修 Run 直接进入 `AUTHORIZED` (可豁免 FAI)
- `FULL_PREP`: 重新检查，返修 Run 从 `PREP` 开始

详见 `domain_docs/mes/spec/process/03_smp_flows.md` → “关键设计决策”。
