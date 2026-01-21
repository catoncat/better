# 验证步骤到数据表映射

## 1. 目的
将 `05_validation/*` 中的关键验证步骤映射到数据库表与关键字段，便于定位数据与排查问题。

## 2. 上料防错（`05_validation/01_loading_validation.md`）
| 验证步骤 | 主要数据表 | 关键字段 | 说明 |
|---|---|---|---|
| 加载站位表 | `RunSlotExpectation` | `runId`, `slotId`, `expectedMaterialCode`, `status` | 每个站位生成一条期望记录，初始 `status=PENDING` |
| 扫码 PASS | `LoadingRecord` | `verifyResult`, `status`, `materialLotId`, `materialCode`, `expectedCode`, `loadedAt`, `loadedBy`, `packageQty` | PASS 后写入上料记录 |
| 期望状态更新 | `RunSlotExpectation` | `status`, `loadedMaterialCode`, `loadedAt`, `loadedBy` | 期望记录被更新为 LOADED |
| 站位当前料 | `FeederSlot` | `currentMaterialLotId`, `failedAttempts` | 当前料批指向最新上料记录 |
| 扫码 WARNING | `LoadingRecord` | `verifyResult=WARNING`, `status=LOADED` | 替代料上料记录 |
| 扫码 FAIL | `LoadingRecord` | `verifyResult=FAIL`, `status=UNLOADED`, `failReason` | 失败记录写入 |
| 站位锁定 | `FeederSlot` | `isLocked`, `failedAttempts`, `lockedAt`, `lockedReason` | 连续失败达到阈值后锁定 |
| 幂等扫码 | `LoadingRecord` | `status=LOADED` | 返回已有记录（响应含 `isIdempotent`） |
| 换料 | `LoadingRecord` | `status=REPLACED`, `meta.replaceReason` | 旧记录标记 REPLACED，新记录写入 |
| 解锁 | `FeederSlot` | `isLocked`, `failedAttempts`, `meta.unlockHistory` | 解锁事件写入 meta 历史 |

## 3. 批次与执行（`05_validation/02_run_and_execution_validation.md`）
| 验证步骤 | 主要数据表 | 关键字段 | 说明 |
|---|---|---|---|
| 工单接收 | `WorkOrder` | `woNo`, `productCode`, `plannedQty`, `routingId`, `status` | 接收/更新工单 |
| 创建 Run | `Run` | `runNo`, `woId`, `lineId`, `routeVersionId`, `planQty`, `status` | 绑定产线与冻结路由版本 |
| 生成 Unit | `Unit` | `sn`, `runId`, `woId`, `status`, `currentStepNo` | Unit 初始为 QUEUED |
| 就绪检查 | `ReadinessCheck` | `runId`, `type`, `status`, `checkedAt`, `checkedBy` | 记录检查结果 |
| 就绪明细 | `ReadinessCheckItem` | `itemType`, `itemKey`, `status`, `failReason`, `evidenceJson`, `waivedBy` | 单项检查明细 |
| FAI 任务 | `Inspection` | `runId`, `type=FAI`, `status`, `sampleQty`, `startedAt`, `decidedAt`, `decidedBy` | FAI 生命周期 |
| FAI 项 | `InspectionItem` | `inspectionId`, `unitSn`, `itemName`, `result`, `defectCode` | FAI 检验项 |
| 授权 | `Authorization` | `runId`, `status`, `authorizedBy`, `authorizedAt` | Run 授权记录 |
| Track 执行 | `Track` | `unitId`, `stepNo`, `stationId`, `inAt`, `outAt`, `result`, `operatorId` | TrackIn/TrackOut 记录 |
| Unit 状态 | `Unit` | `status`, `currentStepNo` | DONE/OUT_FAILED 等状态更新 |
| OQC 抽检规则 | `OqcSamplingRule` | `productCode`, `lineId`, `routingId`, `samplingType`, `sampleValue`, `priority` | 抽检策略 |
| OQC 任务 | `Inspection` | `runId`, `type=OQC`, `status`, `decidedAt`, `decidedBy` | OQC 判定 |
| OQC 项 | `InspectionItem` | `inspectionId`, `unitSn`, `itemName`, `result`, `defectCode` | 抽检项 |
| 完工 | `Run` | `status`, `endedAt` | OQC 通过后完工 |

## 4. 追溯（`05_validation/03_traceability_validation.md`）
| 验证步骤 | 主要数据表 | 关键字段 | 说明 |
|---|---|---|---|
| 单件追溯 | `TraceSnapshot` | `unitId`, `snapshot` | 追溯快照（若已生成） |
| 路由版本 | `ExecutableRouteVersion` | `id`, `versionNo`, `snapshotJson`, `compiledAt` | 冻结路由版本信息 |
| 执行轨迹 | `Track` | `unitId`, `stepNo`, `stationId`, `inAt`, `outAt`, `result` | 轨迹与结果 |
| 上料记录 | `LoadingRecord` | `runId`, `slotId`, `materialLotId`, `verifyResult`, `loadedAt` | 上料摘要 |
| 检验记录 | `Inspection` / `InspectionItem` | `type`, `status`, `decidedAt`, `itemName`, `result` | FAI/OQC 结果 |
| 料批反查 | `MaterialLot` / `MaterialUse` | `materialCode`, `lotNo`, `unitId` | 料批与 Unit 关联 |
