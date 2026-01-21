# 上料防错验证步骤

## 1. 验证目标
确保“加载站位表 → 扫码验证 → 锁定/解锁 → 换料记录”全流程行为与数据一致。

## 2. 前置数据
- Run：状态 PREP，已绑定产线
- FeederSlot：产线下存在站位
- SlotMaterialMapping：每个站位至少 1 条主料映射
- Material：物料主数据已导入
- 操作人：verify/replace/unlock 需要登录用户（operatorId）

## 3. 验证用接口与页面
- `POST /api/runs/:runNo/loading/load-table`
- `GET /api/runs/:runNo/loading/expectations`
- `POST /api/loading/verify`
- `POST /api/loading/replace`
- `GET /api/runs/:runNo/loading`
- `POST /api/feeder-slots/:slotId/unlock`
- 页面：`/mes/loading`

## 4. 加载站位表验证
### 4.1 正常加载
- 操作：调用 `load-table`
- 示例：`POST /api/runs/RUN-WO-20250526-001-.../loading/load-table`（无请求体）
- 期望：返回 created=站位数量
- 数据检查：
  - RunSlotExpectation 生成
  - status= PENDING

### 4.2 缺少映射
- 前置：删除某站位映射
- 操作：调用 `load-table`
- 期望：`SLOT_MAPPING_MISSING`

### 4.3 已开始上料
- 前置：已有 LoadingRecord
- 操作：调用 `load-table`
- 期望：`LOADING_ALREADY_STARTED`

## 5. 扫码验证（PASS）
- 操作：`verify` + 正确条码（物料编码|批次号）
- 示例请求体：
```json
{
  "runNo": "RUN-WO-20250526-001-...",
  "slotCode": "2F-34",
  "materialLotBarcode": "5212090007|LOT-20250526-003",
  "operatorId": "OP-01"
}
```
- 期望：
  - 返回 verifyResult=PASS
  - RunSlotExpectation.status = LOADED
  - FeederSlot.failedAttempts = 0
  - LoadingRecord.status = LOADED

## 6. 扫码验证（WARNING 替代料）
- 操作：`verify` + 替代料条码
- 示例请求体：
```json
{
  "runNo": "RUN-WO-20250526-001-...",
  "slotCode": "2F-46",
  "materialLotBarcode": "5212090001B|LOT-20250526-002",
  "operatorId": "OP-01",
  "packageQty": 2000
}
```
- 期望：
  - verifyResult=WARNING
  - RunSlotExpectation.status = LOADED
  - LoadingRecord.status = LOADED

## 7. 扫码验证（FAIL + 锁定）
- 操作：连续 3 次扫码错误物料
- 示例请求体（重复 3 次）：
```json
{
  "runNo": "RUN-WO-20250526-001-...",
  "slotCode": "1R-14",
  "materialLotBarcode": "9999999999|LOT-FAIL-001",
  "operatorId": "OP-01"
}
```
- 期望：
  - verifyResult=FAIL
  - LoadingRecord.status = UNLOADED
  - FeederSlot.isLocked = true
  - 站位再次扫码返回 `SLOT_LOCKED`

## 8. 幂等与重复扫码
- 前置：站位已 LOADED
- 操作：扫码同一物料
- 期望：
  - 返回 isIdempotent=true
  - 不新增 LoadingRecord

## 9. 已上料后扫码不同物料
- 前置：站位已 LOADED
- 操作：扫码不同物料
- 期望：`SLOT_ALREADY_LOADED`

## 10. 物料批次异常
- 物料批次不存在 → `MATERIAL_LOT_NOT_FOUND`
- 条码不唯一 → `MATERIAL_LOT_AMBIGUOUS`

## 11. 换料验证
- 前置：站位已 LOADED
- 操作：`replace` + reason
- 示例请求体：
```json
{
  "runNo": "RUN-WO-20250526-001-...",
  "slotCode": "2F-46",
  "newMaterialLotBarcode": "5212090001|LOT-20250526-001",
  "operatorId": "OP-01",
  "reason": "Demo replace to primary",
  "packageQty": 1800
}
```
- 期望：
  - 旧记录标记 REPLACED
  - 新记录写入 meta.replaceReason
  - FeederSlot.currentMaterialLotId 更新

## 12. 解锁验证
- 操作：`unlock`
- 示例请求体：
```json
{
  "reason": "Demo unlock after wrong scan"
}
```
- 期望：
  - isLocked=false
  - failedAttempts=0
  - unlockHistory 写入

## 13. 验证输出
- `GET /api/runs/:runNo/loading` 返回完整上料记录
- `GET /api/runs/:runNo/loading/expectations` 返回当前期望状态
