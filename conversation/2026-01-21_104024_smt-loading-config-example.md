# Context
User asked for a realistic, more complex SMT example explaining slot config, material mapping, and loading flow with field meanings.

# Decisions
- None.

# Plan
- Provide a concrete end-to-end example aligned with SMT loading flow, including slot config, mapping, load-table, scanning, readiness, and traceability.

# Findings
- Use real field names from slot config (slotCode/slotName/position) and mapping (materialCode/productCode/routingId/priority/isAlternate/unitConsumption/isCommonMaterial).
- Barcode format is "物料编码|批次号"; lots are required for traceability.

# Progress
- Prepared a step-by-step example narrative for response.

# Errors
- None.

# Open Questions
- None.

# References
- apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx
- apps/web/src/routes/_authenticated/mes/loading/-components/slot-dialog.tsx
- apps/web/src/routes/_authenticated/mes/loading/-components/mapping-dialog.tsx
- apps/server/src/modules/mes/loading/service.ts

## Findings (SMT flow diagram)
- SMT flow diagram includes "上料防错" sub-flow with steps: B1 加载站位表 → B2 扫码验证 → B3 验证结果 → (正确) B4 确认上料 / (错误) B5 报警锁定重试.
- "上料防错" happens after readiness checks pass and before FAI creation.
- Run status starts PREP then AUTHORIZED then IN_PROGRESS then end states; readiness items include LOADING among others.

## Findings (SMT user flow detail)
- Customer SMT flow shows detailed preparation steps: stencil verification, solder paste management with FIFO/warmup/stirring/expiry, material preparation with feeder prep and label checks, equipment program/parameters/nozzles.
- Loading (上料防错) detail: pull "物料站位表" → scan material QR + slot QR → system line-by-line compare against station table → error-proof judgment → pass confirms loading; fail triggers alarm/lock + exception handling + retry.
- After loading, process goes to first-article production/inspection (SPI → reflow → AOI → manual checks), then authorization for mass production.

## Findings (SMT forms)
- QR-Pro-121 "SMT物料上机对照表" columns: 站位(Station), 零件P/N(Part P/N), 单耗, 共用料Y/N; includes header fields like 客户名称, Job#, 线别, 程式名称, 数量, 日期.
- QR-Mac-022 "SMT生产换料记录表" columns: 日期/时间/产品型号/换料位置/零件编码/零件描述/包装数量/生产设备/换料人/审核.
