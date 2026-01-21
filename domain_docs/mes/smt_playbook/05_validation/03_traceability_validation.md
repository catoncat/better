# 追溯验证步骤

## 1. 验证目标
确保 Trace 输出完整反映 Run 冻结路由版本、执行轨迹、上料记录与检验记录。

## 2. 前置数据
- 已完成上料（LoadingRecord）
- 已完成执行（TrackIn/TrackOut）
- 已生成 FAI/OQC 记录（至少其一）

## 3. 验证接口
- `GET /api/trace/units/{sn}`
- `GET /api/trace/material-lots/{materialCode}/{lotNo}/units`

## 4. 单件追溯验证
### 4.1 基本字段
- unit.sn、unit.status、unit.woNo、unit.runNo

### 4.2 路由与版本冻结
- route.code / route.sourceSystem / route.sourceKey
- routeVersion.id 或 versionNo
- 确认与 Run 绑定版本一致

### 4.3 执行轨迹
- tracks: stepNo / inAt / outAt / result
- dataValues: name / value / judge

### 4.4 检验摘要
- inspections: FAI/OQC 的 status、decidedAt、decidedBy

### 4.5 上料记录
- loadingRecords: slotCode / materialCode / lotNo / verifyResult / loadedAt

## 5. 料批反查验证
- 调用：`GET /api/trace/material-lots/{materialCode}/{lotNo}/units`
- 期望：返回包含该料批的 SN 列表

## 6. 验证场景建议
- PASS 单件：应包含完整 tracks + loadingRecords + inspections
- FAIL 单件：应显示 FAIL 结果与相关检验

## 7. 常见问题排查
- 缺少 loadingRecords：检查是否完成上料
- 缺少 tracks：检查是否完成 TrackIn/TrackOut
- routeVersion 缺失：检查 Run 是否绑定了执行版本
