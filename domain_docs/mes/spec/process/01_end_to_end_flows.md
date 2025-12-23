# End-to-End Business Flows (Mermaid)

```mermaid
flowchart TB
  A((ERP/APS 工单下发)) --> B[MES 接收工单<br/>WO=RECEIVED]
  B --> C[下发到线体/站点组<br/>WO=RELEASED]

  C --> R[创建生产运行 Run<br/>RUN=PREP]
  R --> P[产线准备检查<br/>设备/物料/工艺文件/人员资质]
  P --> POK{准备就绪?}
  POK -- 否 --> PEX[异常记录/处理/复核] --> P
  POK -- 是 --> FAI[创建首件任务<br/>FAI=PENDING]

  FAI --> F1[首件试产(允许限定数量过站)]
  F1 --> F2[首件检验记录]
  F2 --> FOK{首件合格?}
  FOK -- 否 --> ADJ[参数调整/原因记录] --> F1
  FOK -- 是 --> AUTH[批量授权<br/>RUN=AUTHORIZED]

  AUTH --> LOOP

  subgraph LOOP["批量生产执行（Routing Engine 驱动）"]
    direction TB
    S0[选择/确认下一工序 step] --> ST{Station Type?}
    ST -- MANUAL --> M1[操作员登录工位]
    M1 --> M2[SN 进站 TrackIn] --> DC
    ST -- AUTO --> A1[设备事件进出站 Ingest] --> DC
    ST -- BATCH --> B1[载具/炉次进出站 Ingest] --> DC
    ST -- TEST --> T1[测试结果导入/对接] --> DC

    DC[按采集配置采集/校验<br/>手动/自动/频率/规格/阈值] --> OUT[出站判定 TrackOut]
    OUT --> RES{PASS/FAIL?}
    RES -- PASS --> ADV[推进 Routing 指针]
    RES -- FAIL --> NG[登记不良]
    NG --> DISP{处置?}
    DISP -- 返修 --> RW[返修任务/返修作业] --> S0
    DISP -- 报废 --> SC[报废确认/记录] --> DONEU
    DISP -- 隔离 --> HOLD[隔离 HOLD] --> REL[解禁/复判] --> S0

    ADV --> LAST{是否最后工序?}
    LAST -- 否 --> S0
    LAST -- 是 --> DONEU[Unit 完成]
  end

  DONEU --> OQC{是否触发 OQC 抽检?}
  OQC -- 否 --> FINCHK{Run/WO 达成?}
  OQC -- 是 --> OQCT[OQC 抽检任务] --> OQCP{OQC 通过?}
  OQCP -- 否 --> OQCH[隔离 HOLD] --> DISP
  OQCP -- 是 --> FINCHK

  FINCHK -- 否 --> LOOP
  FINCHK -- 是 --> LASTCONF[末件确认/收尾]
  LASTCONF --> ARCH[归档/回传占位]
  ARCH --> END((结案))
```