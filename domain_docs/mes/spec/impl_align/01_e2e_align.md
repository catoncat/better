# MES 端到端流程实现对齐

对应流程: `spec/process/01_end_to_end_flows.md`

> 缺失的节点 = 尚未对齐实现
> Align 仅映射流程图中的动作节点（矩形）；开始/结束/判断节点不单独列出。

## 路由/主数据同步闭环

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 路由/主数据同步入库 | `POST /api/integration/erp/routes/sync` | `apps/server/src/modules/mes/integration/erp/index.ts` | - |
| 映射校验/补全 (Operation/WorkCenter) | `POST /api/integration/erp/routes/sync` | `apps/server/src/modules/mes/integration/erp/apply-routes.ts` | - |
| 配置执行语义 (RouteExecutionConfig) | `GET/POST/PATCH /api/routes/:routingCode/execution-config` | `apps/server/src/modules/mes/routing/service.ts` | `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx` |
| 编译可执行版本 (ExecutableRouteVersion=READY) | `POST /api/routes/:routingCode/compile`, `GET /api/routes/:routingCode/versions` | `apps/server/src/modules/mes/routing/service.ts` | `apps/web/src/routes/_authenticated/mes/route-versions.tsx` |

## 外部系统集成

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 钢网状态接收 | `POST /api/integration/stencil-status` | `apps/server/src/modules/mes/integration/stencil-service.ts` | - |
| 锡膏状态接收 | `POST /api/integration/solder-paste-status` | `apps/server/src/modules/mes/integration/solder-paste-service.ts` | - |
| SPI/AOI 检测结果接收 | `POST /api/integration/inspection-result` | `apps/server/src/modules/mes/integration/inspection-result-service.ts` | - |
| SPI/AOI 检测结果消费 | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | - |
| 线体钢网绑定 | `POST /api/integration/lines/:lineId/stencil/bind` | `apps/server/src/modules/mes/integration/line-binding-service.ts` | - |
| 线体锡膏绑定 | `POST /api/integration/lines/:lineId/solder-paste/bind` | `apps/server/src/modules/mes/integration/line-binding-service.ts` | - |

## 工单/批次

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 工单接收 (WO=RECEIVED) | `POST /api/integration/work-orders` | `apps/server/src/modules/mes/integration/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/work-order-receive-dialog.tsx` |
| 工单释放/派工 (WO=RELEASED) | `POST /api/work-orders/:woNo/release` | `apps/server/src/modules/mes/work-order/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/work-order-release-dialog.tsx` |
| 创建批次 (Run=PREP) | `POST /api/work-orders/:woNo/runs` | `apps/server/src/modules/mes/work-order/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx` |

## 门禁（就绪/上料/首件/授权）

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 产线准备/就绪检查 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 异常处理 | `GET /api/readiness/exceptions`, `POST /api/runs/:runNo/readiness/items/:itemId/waive` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx` |
| 上料防错 | `GET /api/runs/:runNo/loading/expectations`, `POST /api/runs/:runNo/loading/load-table`, `POST /api/loading/verify` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` |
| 报警/锁定/重试 | `POST /api/loading/verify`, `POST /api/loading/replace` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` |
| 创建 FAI (FAI=PENDING) | `POST /api/fai/run/:runNo` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| FAI 试产 | `POST /api/fai/:faiId/start` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| FAI 记录/判定 | `POST /api/fai/:faiId/items`, `POST /api/fai/:faiId/complete` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| Run 授权 (Run=AUTHORIZED) | `POST /api/runs/:runNo/authorize` | `apps/server/src/modules/mes/run/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |

## 执行追溯与质量闭环

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 选择/确认下一工序 | - | - | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 人工进站 | `POST /api/stations/:stationCode/track-in` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 数据采集/校验 | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 出站判定 | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 推进路由 (Unit=QUEUED) | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| Unit 完成 (Unit=DONE) | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 不良记录 (Unit=OUT_FAILED) | `POST /api/defects`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 返修任务/回流 | `POST /api/defects/:defectId/disposition`, `GET /api/rework-tasks` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/rework-tasks.tsx` |
| 报废确认 (Unit=SCRAPPED) | `POST /api/defects/:defectId/disposition` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 隔离 (Unit=ON_HOLD) | `POST /api/defects/:defectId/disposition`, `POST /api/defects/:defectId/release` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 处置评审 | `POST /api/defects/:defectId/disposition` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| OQC 抽检任务 | `POST /api/oqc/run/:runNo`, `GET /api/oqc` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| Run=COMPLETED | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| Run=ON_HOLD | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| Run=CLOSED_REWORK (创建返修 Run) | `POST /api/runs/:runNo/mrb-decision`, `POST /api/runs/:runNo/rework` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
| Run=SCRAPPED | `POST /api/runs/:runNo/mrb-decision` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |

## 收尾关闭

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 批次收尾确认 | `POST /api/runs/:runNo/close` | `apps/server/src/modules/mes/run/service.ts`, `apps/server/src/modules/mes/run/routes.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`, `apps/web/src/routes/_authenticated/mes/-components/closeout-dialog.tsx` |
| 工单收尾确认 (WO=COMPLETED) | `POST /api/work-orders/:woNo/close` | `apps/server/src/modules/mes/work-order/service.ts`, `apps/server/src/modules/mes/work-order/routes.ts` | `apps/web/src/routes/_authenticated/mes/work-orders.tsx`, `apps/web/src/routes/_authenticated/mes/-components/closeout-dialog.tsx` |
