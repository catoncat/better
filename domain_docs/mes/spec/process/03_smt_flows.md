# SMT 产线执行流程

```mermaid
flowchart TD
    Start(["ERP/APS 工单下达"]) --> WO_RCV["工单接收 (WO=RECEIVED)"]
    WO_RCV --> WO_REL["工单释放 (WO=RELEASED)"]
    WO_REL --> RUN_CREATE["创建批次 (Run=PREP)"]
    RUN_CREATE --> A["产线准备"]

    subgraph A_Sub [准备流程]
        direction TB
        A1["钢网就绪检查"]
        A2["锡膏合规检查"]
        A3["物料备料"]
        A4["设备就绪"]

        A1 --> A2 --> A3 --> A4
    end

    A --> A1

    A4 --> P{就绪检查通过?}
    P -- 否 --> PEX["异常记录/处理"] --> A1
    P -- 是 --> B["上料防错"]

    subgraph B_Sub [上料防错流程]
        direction TB
        B1["加载站位表"]
        B2["扫码验证"]
        B3{"验证结果"}
        B4["确认上料"]
        B5["报警/锁定/重试"]

        B1 --> B2 --> B3
        B3 -- 正确 --> B4
        B3 -- 错误 --> B5 --> B2
    end

    B --> B1

    B4 --> C["创建 FAI (FAI=PENDING)"]

    subgraph C_Sub [FAI 流程]
        direction TB
        C1["首件生产(试产)"]
        C2["记录首件检验项"]
        C3["首件判定"]

        C1 --> C2 --> C3
    end

    C --> C1

    C3 --> D{FAI 合格?}
    D -- 否 --> C1
    D -- 是 --> E["Run 授权 (Run=AUTHORIZED)"]

    E --> G["批量执行 (Run=IN_PROGRESS)"]

    subgraph G_Sub [执行追溯]
        direction TB
        TI["TrackIn (Unit=IN_STATION)"]
        DC["数据采集(可选)"]
        TO["TrackOut"]

        TI --> DC --> TO
    end

    G --> TI

    TO --> RES{PASS/FAIL?}

    RES -- PASS --> LAST{末工序?}
    LAST -- 否 --> ADV["推进路由 (Unit=QUEUED)"] --> TI
    LAST -- 是 --> DONEU["单件完成 (Unit=DONE)"]

    RES -- FAIL --> NG["不良记录 (Unit=OUT_FAILED)"]
    NG --> DISP{处置方式?}
    DISP -- 返修 --> RW["创建返修任务/回流"] --> TI
    DISP -- 报废 --> SC["报废确认 (Unit=SCRAPPED)"]
    DISP -- 隔离 --> HOLD["隔离 (Unit=ON_HOLD)"] --> MRB["处置评审"] --> DISP

    DONEU --> RUNCHK{Run 完成?}
    RUNCHK -- 否 --> TI
    RUNCHK -- 是 --> OQC{触发 OQC?}
    OQC -- 否 --> END_RUN["Run=COMPLETED"]
    OQC -- 是 --> OQCT["OQC 抽检任务"] --> OQCR{OQC 合格?}
    OQCR -- 合格 --> END_RUN
    OQCR -- 不合格 --> ONHOLD["Run=ON_HOLD"] --> MRB_RUN{MRB 决策?}
    MRB_RUN -- 放行 --> END_RUN
    MRB_RUN -- 返修 --> CLOSED_REWORK["Run=CLOSED_REWORK (创建返修 Run)"]
    MRB_RUN -- 报废 --> SCRAPPED["Run=SCRAPPED"]
```

## 说明

- 本文定义 SMT 产线的目标流程（diagram + 关键约束），不包含实现进度与接口清单。
- Run 授权门禁：就绪检查通过 + FAI 通过。授权接口会在缺少 Formal 就绪检查时自动触发一次 Formal 检查。
- 就绪检查项由 `Run.meta.readinessChecks.enabled` 控制；支持的项包含：STENCIL、SOLDER_PASTE、EQUIPMENT、MATERIAL、ROUTE、LOADING。
- Run 状态流转：`PREP`(创建) → `AUTHORIZED`(授权) → `IN_PROGRESS`(首个 TrackIn) → `COMPLETED`/`ON_HOLD`/`CLOSED_REWORK`/`SCRAPPED`。
- OQC 触发：当 `track-out` 使 Unit 进入 `DONE` 后，会检查 Run 是否满足“全部 Unit DONE”，满足则按抽样规则创建 OQC；无命中规则则直接完工。
- MRB 决策：`RELEASE`/`REWORK`/`SCRAP`；`REWORK` 会创建返修 Run（`REUSE_PREP`/`FULL_PREP`），并支持在权限允许时豁免返修 Run 的 FAI（需记录原因）。

## References

- 实现对齐: `spec/impl_align/03_smt_align.md`
- 任务追踪: `plan/tasks.md.md`
