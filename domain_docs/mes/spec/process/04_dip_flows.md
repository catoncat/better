# DIP 产线执行流程

```mermaid
flowchart TD
    Start(["DIP 工序开始"]) --> PREP["产线准备"]

    subgraph PREP_SUB [产线准备]
        direction TB
        A1["PCB 接收确认"]
        A2["插件物料准备"]
        A3["波峰焊设备就绪"]
        A4["工装夹具准备"]

        A1 --> A2 --> A3 --> A4
    end

    PREP --> A1

    A4 --> FAI_GATE{Run 是否需要 FAI?}

    FAI_GATE -- 是 --> FAI_PROD["首件生产（路由首段）"]
    FAI_PROD --> FAI_CREATE["创建 FAI"]
    FAI_CREATE --> FAI_COMPLETE["完成 FAI"]
    FAI_COMPLETE --> FAI_OK{FAI 合格?}
    FAI_OK -- 否 --> FAI_PROD
    FAI_OK -- 是 --> AUTH["Run 授权"]

    FAI_GATE -- 否 --> AUTH

    AUTH --> DIP1["插件作业"]

    subgraph DIP1_SUB [插件作业]
        direction TB
        B1["AI 辅助插件"]
        B2["手工插件"]
        B3["异形件插件"]
        B1 --> B2 --> B3
    end

    DIP1 --> B1

    B3 --> DIP1_OK{结果?}
    DIP1_OK -- PASS --> DIP2["波峰焊接"]
    DIP1_OK -- FAIL --> DIP1_REWORK["插件返修"] --> DIP1

    DIP2 --> DIP2_OK{结果?}
    DIP2_OK -- PASS --> IPQC3["后焊首件检查（IPQC）"]
    DIP2_OK -- FAIL --> DIP2_REWORK["焊接返修"] --> DIP2

    IPQC3 --> DIP3["后焊作业"]

    subgraph DIP3_SUB [后焊作业]
        direction TB
        C1["手工焊接"]
        C2["剪脚处理"]
        C3["三防漆喷涂"]
        C4["固化处理"]
        C5["人工外观检验"]

        C1 --> C2 --> C3 --> C4 --> C5
    end

    DIP3 --> C1

    C5 --> DIP3_OK{外观结果?}
    DIP3_OK -- PASS --> IPQC4["测试首件检查（IPQC）"]
    DIP3_OK -- FAIL --> DIP3_REWORK["外观返修"] --> DIP3

    IPQC4 --> DIP4["功能测试"]
    DIP4 --> TEST_OK{测试结果?}
    TEST_OK -- PASS --> DONEU["Unit=DONE"]
    TEST_OK -- FAIL --> TEST_REWORK["测试返修"] --> DIP4

    DONEU --> RUNCHK{Run 完成?}
    RUNCHK -- 否 --> DIP1
    RUNCHK -- 是 --> OQC{触发 OQC?}

    OQC -- 否 --> END_RUN["Run=COMPLETED"]
    OQC -- 是 --> OQC_CREATE["OQC 创建（自动/手动）"]
    OQC_CREATE --> OQC_COMPLETE["OQC 完成"]
    OQC_COMPLETE --> OQC_OK{OQC 合格?}
    OQC_OK -- 合格 --> END_RUN
    OQC_OK -- 不合格 --> HOLD["Run=ON_HOLD"] --> MRB["MRB 决策"]

    MRB --> MRB_DEC{决策?}
    MRB_DEC -- 放行 --> END_RUN
    MRB_DEC -- 返修 --> REWORK_RUN["创建返修 Run"] --> PREP
    MRB_DEC -- 报废 --> SCRAP["Run=SCRAPPED"]
```

## 说明

- DIP 与 SMT 可处于同一 Run 的组合路由；如需展示/分段，可在 `RoutingStep.meta.stepGroup` 中标注（可选）。
- FAI 为 Run 级（一次）授权门禁；DIP 的“段首件”（后焊/测试）建议用 IPQC 记录，不作为 Run 授权门禁（当前未实现 IPQC）。
- OQC 与 MRB 为 Run 级闭环：OQC 不合格进入 `Run=ON_HOLD`，由 MRB 决策进入 `COMPLETED`/`CLOSED_REWORK`/`SCRAPPED`（返修会创建新的返修 Run）。

## References

- 实现对齐: `spec/impl_align/04_dip_align.md`
- 任务追踪: `plan/tasks.md.md`
