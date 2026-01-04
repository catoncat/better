# Acceptance Scenarios & Test Cases

此文件列出用于验证 MES 系统功能的验收测试场景，确保各个业务闭环与 API 实现的正确性。

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

**描述**：验证数据采集和追溯功能。

**步骤**：
1. **创建数据采集配置**：
   - 调用 `POST /api/operations/{operationCode}/data-specs` 接口，配置采集规则。
   - 验证返回的数据采集配置成功。
2. **采集数据**：
   - 调用 `POST /api/data/collect` 接口，手动采集数据并绑定到指定的 `trackId`。
   - 验证采集的数据是否正确绑定。
3. **追溯查询**：
   - 调用 `GET /api/trace/units/{sn}` 查询某个单件的追溯信息。
   - 验证返回的追溯数据是否与系统中已采集的数据一致。

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
