# Acceptance Scenarios & Test Cases

> **更新时间**: 2026-01-08
> **状态**: 场景 1~5、8~16 与当前实现一致；场景 4 的 DataCollectionSpec 配置 API 待 M3 实现。

此文件列出用于验证 MES 系统功能的验收测试场景，确保各个业务闭环与 API 实现的正确性。

**自动化验收脚本**：`bun apps/server/scripts/test-mes-flow.ts`
- `--scenario happy`：OQC PASS → Run COMPLETED
- `--scenario oqc-fail-mrb-release`：OQC FAIL → ON_HOLD → MRB RELEASE → COMPLETED
- `--scenario oqc-fail-mrb-scrap`：OQC FAIL → ON_HOLD → MRB SCRAP → SCRAPPED

## 1. E2E 场景测试

### 场景 1：工单接收与释放

**描述**：验证工单从接收到释放的完整流程。

**步骤**：
1. **接收工单**：
   - 调用 `POST /api/integration/work-orders` 接口，提交工单信息。
   - 验证返回的工单状态为 `RECEIVED`。
2. **下发工单**：
   - 调用 `POST /api/work-orders/{woNo}/release` 接口。
   - 验证返回的状态为 `RELEASED`。

**预期结果**：
- 工单接收后状态为 `RECEIVED`。
- 工单下发后状态变为 `RELEASED`。

### 场景 2：生产运行创建与进站

**描述**：验证生产运行的创建及单件进站的流程。

**步骤**：
1. **创建生产运行**：
   - 调用 `POST /api/work-orders/{woNo}/runs` 接口，提交生产运行数据。
   - 验证返回的生产运行状态为 `PREP`。
2. **授权生产运行**：
   - 调用 `POST /api/runs/{runNo}/authorize` 接口，提交 `{"action":"AUTHORIZE"}`。
   - 验证返回的生产运行状态为 `AUTHORIZED`。
3. **进站 TrackIn**：
   - 调用 `POST /api/stations/{stationCode}/track-in` 接口，提交单件 SN 进入站点（包含 `runNo`）。
   - 验证返回的状态为 `IN_STATION`。

**预期结果**：
- 生产运行状态为 `PREP`。
- 生产运行授权后状态为 `AUTHORIZED`。
- 单件进站后状态为 `IN_STATION`。

### 场景 3：TrackOut 与质量控制

**描述**：验证 TrackOut 操作与质量控制（PASS/FAIL）闭环。

**步骤**：
1. **进站**：
   - 调用 `POST /api/stations/{stationCode}/track-in` 接口，提交单件进站（包含 `runNo`）。
   - 验证返回状态为 `IN_STATION`。
2. **出站 TrackOut**：
   - 调用 `POST /api/stations/{stationCode}/track-out` 接口，提交出站信息（包含 `runNo`），设定状态为 `PASS`。
   - 验证返回的状态为 `QUEUED`（进入下一工序）或 `DONE`（最后工序）。
3. **如果 TrackOut 状态为 FAIL**：
   - 验证返回状态为 `OUT_FAILED`。

**预期结果**：
- 单件在 TrackOut 时根据质量结果（PASS/FAIL）进行状态转换。
- 失败时，系统会自动进行不良记录与返修、隔离等处置。

### 场景 4：数据采集与追溯

> ⚠️ **注意**：数据采集配置 API（步骤 1~2）待 M3 `3.5.x` 任务实现。当前仅追溯查询可用。

**描述**：验证数据采集和追溯功能。

**步骤**：
1. **创建数据采集配置**（待实现）：
   - 调用 `POST /api/data-collection-specs` 接口，配置采集规则。
   - 验证返回的数据采集配置成功。
2. **采集数据**（待实现）：
   - TrackOut 时按绑定的 specs 输入数据值。
   - 验证采集的数据是否正确绑定到 TrackRecord。
3. **追溯查询**（已实现）：
   - 调用 `GET /api/trace/units/{sn}` 查询某个单件的追溯信息。
   - 验证返回的追溯数据包含 route/routeVersion/steps/tracks。

**预期结果**：
- 数据采集配置和采集操作能够正常记录数据。
- 追溯查询能够返回完整的单件生产和质量追溯信息。

### 场景 5：OQC 抽检与 MRB 处置

**描述**：验证 OQC 抽检失败后进入 MRB 处置闭环。

**步骤**：
1. **准备批次状态**：
   - 确保批次所有 Unit 已完成（`DONE`），系统已触发或手动创建 OQC。
2. **创建并开始 OQC**（如需手动触发）：
   - 调用 `POST /api/oqc/run/{runNo}` 创建 OQC 任务。
   - 调用 `POST /api/oqc/{oqcId}/start` 启动检验。
3. **录入检验项**：
   - 调用 `POST /api/oqc/{oqcId}/items` 录入至少 1 条检验项。
4. **完成 OQC（FAIL）**：
   - 调用 `POST /api/oqc/{oqcId}/complete`，提交 `decision=FAIL` 且 `failedQty > 0`。
   - 验证 OQC 状态为 `FAIL`，Run 状态变为 `ON_HOLD`。
5. **MRB 决策**：
   - 调用 `POST /api/runs/{runNo}/mrb-decision`，提交 `decision=REWORK/RELEASE/SCRAP`。
   - `reason` 最少 4 个字；返修需附带 `reworkType`，复用就绪可选 `faiWaiver` + `faiWaiverReason`。

**预期结果**：
- OQC FAIL 后 Run 进入 `ON_HOLD`。
- MRB 放行：Run → `COMPLETED`。
- MRB 返修：Run → `CLOSED_REWORK`，并创建返修 Run（`REUSE_PREP` 为 `AUTHORIZED`；`FULL_PREP` 为 `PREP`）。
- MRB 报废：Run → `SCRAPPED`。

## 2. 并发与异常测试

### 场景 6：并发测试

**描述**：验证多用户同时进行工单和生产操作时的并发处理能力。

**步骤**：
1. 模拟多个用户同时创建工单，调用 `POST /api/integration/work-orders` 接口。
2. 同时多个用户创建生产运行，调用 `POST /api/work-orders/{woNo}/runs` 接口。

**预期结果**：
- 系统能够正确处理并发请求，返回幂等的响应，避免重复操作。

### 场景 7：异常处理

**描述**：验证系统在异常情况下（如数据不完整、无权限访问等）的错误处理能力。

**步骤**：
1. 提交缺失必要字段的请求，例如工单请求中缺少 `productCode` 字段。
2. 调用无权限的 API，模拟权限不足的错误。

**预期结果**：
- 系统返回明确的错误信息，错误码与消息应语义化，且能够处理幂等性问题。

## 3. 边界条件与性能测试

### 场景 8：大批量数据处理

**描述**：验证系统在处理大量数据时的性能表现。

**步骤**：
1. 生成大量工单，调用 `POST /api/integration/work-orders` 接口批量提交。
2. 检查系统是否能够稳定处理大量数据，并且 API 响应时间在合理范围内。

**预期结果**：
- 系统能够在合理时间内处理大量请求，且无性能瓶颈。

## 4. 上料防错与集成 (M2)

### 场景 8：上料防错 - 正确物料验证

**描述**：验证正确物料扫码时上料验证通过并记录绑定关系。

**步骤**：
1. 配置站位与槽位-物料映射（`POST /api/lines/{lineId}/feeder-slots` + `POST /api/slot-mappings`）。
2. 为 Run 加载站位表期望（`POST /api/runs/{runNo}/loading/load-table`）。
3. 扫码验证正确物料（`POST /api/loading/verify`）。
4. 查询上料记录与期望（`GET /api/runs/{runNo}/loading`、`GET /api/runs/{runNo}/loading/expectations`）。

**预期结果**：
- 上料验证结果为 PASS。
- RunSlotExpectation 状态更新为 LOADED。
- LoadingRecord 记录 materialCode 与 expectedCode。

### 场景 9：上料防错 - 物料不匹配

**描述**：验证错误物料扫码时返回 FAIL 并记录失败原因。

**步骤**：
1. 完成场景 8 的站位表与期望加载。
2. 扫码验证错误物料（`POST /api/loading/verify`）。

**预期结果**：
- 上料验证结果为 FAIL。
- 返回 failReason，RunSlotExpectation 状态为 MISMATCH。

### 场景 10：连续失败触发锁定

**描述**：验证连续失败触发站位锁定，且需手动解锁。

**步骤**：
1. 对同一 slot 连续 3 次扫码错误物料（`POST /api/loading/verify`）。
2. 再次扫码验证任意物料。
3. 手动解锁（`POST /api/feeder-slots/{slotId}/unlock`），再扫码正确物料。

**预期结果**：
- 第 3 次失败后 slot 进入锁定状态。
- 锁定期间返回 `SLOT_LOCKED` 错误。
- 解锁后可正常 PASS。

### 场景 11：上料门禁阻断 Run 授权

**描述**：验证上料未完成时，授权被 readiness gate 阻断。

**步骤**：
1. Run 未完成上料验证时调用 `POST /api/runs/{runNo}/authorize`。
2. 完成上料验证后再次授权。

**预期结果**：
- 第一次授权失败，返回 `READINESS_CHECK_FAILED`。
- 上料完成后授权成功。

### 场景 12：钢网状态接收 - 自动模式

**描述**：验证 TPM 自动推送钢网状态并用于就绪检查。

**步骤**：
1. 绑定钢网到产线（`POST /api/integration/lines/{lineId}/stencil/bind`）。
2. 推送钢网状态（`POST /api/integration/stencil-status`，status=READY）。
3. 执行 readiness check（`POST /api/runs/{runNo}/readiness/check`）。

**预期结果**：
- 接口幂等（重复 eventId 返回相同结果）。
- readiness item 为 PASSED（STENCIL）。

### 场景 13：钢网状态不就绪阻断

**描述**：验证钢网处于 MAINTENANCE 时就绪检查失败。

**步骤**：
1. 绑定钢网并推送 `status=MAINTENANCE`。
2. 执行 readiness check。

**预期结果**：
- readiness item 为 FAILED（STENCIL），授权被阻断。

### 场景 14：锡膏状态接收 - 合规

**描述**：验证 WMS 推送锡膏合规状态并用于就绪检查。

**步骤**：
1. 绑定锡膏到产线（`POST /api/integration/lines/{lineId}/solder-paste/bind`）。
2. 推送锡膏状态（`POST /api/integration/solder-paste-status`，status=COMPLIANT）。
3. 执行 readiness check。

**预期结果**：
- readiness item 为 PASSED（SOLDER_PASTE）。

### 场景 15：锡膏过期阻断

**描述**：验证锡膏状态 EXPIRED 时就绪检查失败。

**步骤**：
1. 绑定锡膏并推送 `status=EXPIRED`。
2. 执行 readiness check。

**预期结果**：
- readiness item 为 FAILED（SOLDER_PASTE），授权被阻断。

### 场景 16：手动降级模式

**描述**：验证手动录入模式允许外部系统不可用时继续推进。

**步骤**：
1. 手动推送钢网/锡膏状态（`source=MANUAL`，包含 `operatorId`）。
2. 执行 readiness check。

**预期结果**：
- 手动模式请求成功（缺少 `operatorId` 应拒绝）。
- readiness item 按状态结果计算（READY/COMPLIANT 时 PASSED）。
