# SMT 流程实现对齐

对应流程: `spec/process/03_smt_flows.md`

> 缺失的节点 = 尚未对齐实现
> Align 仅映射流程图中的动作节点（矩形）；开始/结束/判断节点不单独列出。

## 工单/批次

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 工单接收 (WO=RECEIVED) | `POST /api/integration/work-orders` | `apps/server/src/modules/mes/integration/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/work-order-receive-dialog.tsx` |
| 工单释放 (WO=RELEASED) | `POST /api/work-orders/:woNo/release` | `apps/server/src/modules/mes/work-order/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/work-order-release-dialog.tsx` |
| 创建批次 (Run=PREP) | `POST /api/work-orders/:woNo/runs` | `apps/server/src/modules/mes/work-order/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/run-create-dialog.tsx` |

## 产线准备/上料/首件/授权

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 产线准备 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 钢网就绪检查 | `POST /api/integration/stencil-status`, `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/integration/stencil-service.ts`, `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 锡膏合规检查 | `POST /api/integration/solder-paste-status`, `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/integration/solder-paste-service.ts`, `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 物料备料 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 设备就绪 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 异常记录/处理 | `GET /api/readiness/exceptions`, `POST /api/runs/:runNo/readiness/items/:itemId/waive` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/readiness-exceptions.tsx` |
| 上料防错 | `GET /api/runs/:runNo/loading/expectations`, `POST /api/runs/:runNo/loading/load-table`, `POST /api/loading/verify` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` |
| 加载站位表 | `POST /api/runs/:runNo/loading/load-table` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/index.tsx` |
| 扫码验证 | `POST /api/loading/verify` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` |
| 确认上料 | `POST /api/loading/verify` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` |
| 报警/锁定/重试 | `POST /api/loading/verify`, `POST /api/loading/replace` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` |
| 换料记录 | `POST /api/loading/replace` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx` |
| 换料记录查询 | `GET /api/runs/:runNo/loading` | `apps/server/src/modules/mes/loading/service.ts` | `apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx` |
| 创建 FAI (FAI=PENDING) | `POST /api/fai/run/:runNo` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| 首件生产(试产) | `POST /api/fai/:faiId/start`, `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/fai/service.ts`, `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| 记录首件检验项 | `POST /api/fai/:faiId/items` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| 首件判定 | `POST /api/fai/:faiId/complete` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| Run 授权 (Run=AUTHORIZED) | `POST /api/runs/:runNo/authorize` | `apps/server/src/modules/mes/run/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |

## 批量执行与质量闭环

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 批量执行 (Run=IN_PROGRESS) | - | - | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| TrackIn (Unit=IN_STATION) | `POST /api/stations/:stationCode/track-in` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 数据采集(可选) | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| TrackOut | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 推进路由 (Unit=QUEUED) | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 单件完成 (Unit=DONE) | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 不良记录 (Unit=OUT_FAILED) | `POST /api/defects`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/defect/service.ts`, `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 创建返修任务/回流 | `POST /api/defects/:defectId/disposition`, `GET /api/rework-tasks` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/rework-tasks.tsx` |
| 报废确认 (Unit=SCRAPPED) | `POST /api/defects/:defectId/disposition` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 隔离 (Unit=ON_HOLD) | `POST /api/defects/:defectId/disposition`, `POST /api/defects/:defectId/release` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 处置评审 | `POST /api/defects/:defectId/disposition` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| OQC 抽检任务 | `POST /api/oqc/run/:runNo`, `GET /api/oqc` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| Run=COMPLETED | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| Run=ON_HOLD | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| Run=CLOSED_REWORK (创建返修 Run) | `POST /api/runs/:runNo/mrb-decision`, `POST /api/runs/:runNo/rework` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
| Run=SCRAPPED | `POST /api/runs/:runNo/mrb-decision` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
