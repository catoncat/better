# DIP 流程实现对齐

对应流程: `spec/process/04_dip_flows.md`

> 缺失的节点 = 尚未对齐实现
> Align 仅映射流程图中的动作节点（矩形）；开始/结束/判断节点不单独列出。

## 门禁（准备/首件/授权）

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 产线准备 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| PCB 接收确认 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 插件物料准备 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 波峰焊设备就绪 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 工装夹具准备 | `POST /api/runs/:runNo/readiness/check` | `apps/server/src/modules/mes/readiness/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |
| 首件生产（路由首段） | `POST /api/fai/:faiId/start`, `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/fai/service.ts`, `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| 创建 FAI | `POST /api/fai/run/:runNo` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| 完成 FAI | `POST /api/fai/:faiId/complete` | `apps/server/src/modules/mes/fai/service.ts` | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| Run 授权 | `POST /api/runs/:runNo/authorize` | `apps/server/src/modules/mes/run/service.ts` | `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` |

## 产线执行（插件/焊接/后焊/测试）

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| 插件作业 | - | - | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| AI 辅助插件 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 手工插件 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 异形件插件 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 插件返修 | `POST /api/defects/:defectId/disposition`, `GET /api/rework-tasks` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 波峰焊接 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 焊接返修 | `POST /api/defects/:defectId/disposition`, `GET /api/rework-tasks` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 后焊作业 | - | - | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 手工焊接 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 剪脚处理 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 三防漆喷涂 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 固化处理 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 人工外观检验 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 外观返修 | `POST /api/defects/:defectId/disposition`, `GET /api/rework-tasks` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| 功能测试 | `POST /api/stations/:stationCode/track-in`, `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| Unit=DONE | `POST /api/stations/:stationCode/track-out` | `apps/server/src/modules/mes/execution/service.ts` | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 测试返修 | `POST /api/defects/:defectId/disposition`, `GET /api/rework-tasks` | `apps/server/src/modules/mes/defect/service.ts` | `apps/web/src/routes/_authenticated/mes/defects.tsx` |

## OQC/MRB 闭环

| 节点 | API | Server | Web |
|------|-----|--------|-----|
| Run=COMPLETED | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| OQC 创建（自动/手动） | `POST /api/oqc/run/:runNo` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| OQC 完成 | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/-components/oqc-complete-dialog.tsx` |
| Run=ON_HOLD | `POST /api/oqc/:oqcId/complete` | `apps/server/src/modules/mes/oqc/service.ts` | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| MRB 决策 | `POST /api/runs/:runNo/mrb-decision` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
| 创建返修 Run | `POST /api/runs/:runNo/rework` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
| Run=SCRAPPED | `POST /api/runs/:runNo/mrb-decision` | `apps/server/src/modules/mes/oqc/mrb-service.ts` | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
