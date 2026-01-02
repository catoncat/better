# Integration Payload Contracts (ERP / TPM)

> **更新时间**: 2025-01-02
> **实现状态**: ✅ M1.6 已完成，Mock + Kingdee 实际同步可用

This document defines the pull payload structures from ERP and TPM and how they map into MES.
All API responses use the standard envelope, with the integration payload in `data`:

```json
{
  "ok": true,
  "data": {
    "sourceSystem": "ERP",
    "entityType": "ROUTING",
    "cursor": { "nextSyncAt": "2025-03-27T14:00:00Z", "hasMore": false },
    "items": []
  }
}
```

---

## 0. Mock Endpoints (MES)

For contract testing, MES exposes mock pull endpoints:
- `GET /api/integration/mock/erp/routes`
- `GET /api/integration/mock/erp/work-orders`
- `GET /api/integration/mock/erp/materials`
- `GET /api/integration/mock/erp/boms`
- `GET /api/integration/mock/erp/work-centers`
- `GET /api/integration/mock/tpm/equipment`
- `GET /api/integration/mock/tpm/status-logs`
- `GET /api/integration/mock/tpm/maintenance-tasks`

These return the envelope above with representative payloads.
ERP routing mock data is derived from `others/erp_route.csv` when present; otherwise MES uses a built-in fallback.

Manual pull:
- `POST /api/integration/erp/routes/sync` returns the same envelope for real ERP pulls.
- `POST /api/integration/erp/work-orders/sync`
- `POST /api/integration/erp/materials/sync`
- `POST /api/integration/erp/boms/sync`
- `POST /api/integration/erp/work-centers/sync`
- `POST /api/integration/tpm/equipment/sync`
- `POST /api/integration/tpm/status-logs/sync`
- `POST /api/integration/tpm/maintenance-tasks/sync`

---

## 1. ERP Payloads

### 1.1 Routing (ENG_Route)

```json
{
  "header": {
    "headId": "228055",
    "routeNo": "100-241-184R",
    "routeName": "100-241-184R(CABLE)",
    "productCode": "100-241-184R",
    "productName": "Cable Driver Board",
    "useOrgCode": "100",
    "createOrgCode": "100",
    "effectiveFrom": "2025-03-27",
    "effectiveTo": "9999-12-31",
    "routeSource": "ERP",
    "bomCode": "100-241-184R",
    "modifiedAt": "2025-03-27T13:48:50Z"
  },
  "steps": [
    {
      "stepNo": 10,
      "processCode": "Cable",
      "processName": "Cable",
      "workCenterCode": "WC000001",
      "workCenterName": "Production",
      "departmentCode": "BM000006",
      "departmentName": "Production",
      "description": "Cable",
      "keyOper": true,
      "firstPieceInspect": false,
      "processRecordStation": false,
      "qualityInspectStation": false
    }
  ]
}
```

Mapping:
- `Routing.code = header.routeNo`
- `Routing.productCode = header.productCode`
- `Routing.effectiveFrom/To = header.effectiveFrom/To`
- `RoutingStep.stepNo = step.stepNo`
- `RoutingStep.sourceStepKey = ERP:{routeNo}:{stepNo}:{processCode}`
- `WorkCenterStationGroupMapping` uses `workCenterCode` or `departmentCode`

---

### 1.2 Work Orders

```json
{
  "woNo": "WO20250327-001",
  "productCode": "100-241-184R",
  "productName": "Cable Driver Board",
  "productSpec": "ASSY Cable Driver Board",
  "plannedQty": 100,
  "planStartDate": "2025-04-01T00:00:00Z",
  "planFinishDate": "2025-04-10T00:00:00Z",
  "unitCode": "EA",
  "unitName": "EA",
  "routingCode": "100-241-184R",
  "routingName": "100-241-184R",
  "workshopCode": "WS-01",
  "workshopName": "Assembly",
  "status": "2",
  "pickStatus": "3",
  "priority": "2",
  "srcBillNo": "SO-20250327-01",
  "rptFinishQty": 20,
  "scrapQty": 1,
  "dueDate": "2025-04-10T00:00:00Z",
  "updatedAt": "2025-03-27T08:00:00Z"
}
```

Mapping:
- `WorkOrder.woNo = woNo`
- `WorkOrder.productCode = productCode`
- `WorkOrder.plannedQty = plannedQty`
- `WorkOrder.routingId` resolved by `routingCode` when provided
- `WorkOrder.erpStatus = status` (ERP FStatus)
- `WorkOrder.erpPickStatus = pickStatus` (ERP FPickMtrlStatus)
- `WorkOrder.meta.erp.productName = productName`
- `WorkOrder.meta.erp.productSpec = productSpec`
- `WorkOrder.meta.erp.unitCode = unitCode`
- `WorkOrder.meta.erp.unitName = unitName`
- `WorkOrder.meta.erp.planStartDate = planStartDate`
- `WorkOrder.meta.erp.planFinishDate = planFinishDate`
- `WorkOrder.meta.erp.workshopCode = workshopCode`
- `WorkOrder.meta.erp.workshopName = workshopName`
- `WorkOrder.meta.erp.routingName = routingName`
- `WorkOrder.meta.erp.priority = priority`
- `WorkOrder.meta.erp.srcBillNo = srcBillNo`
- `WorkOrder.meta.erp.rptFinishQty = rptFinishQty`
- `WorkOrder.meta.erp.scrapQty = scrapQty`

Notes:
- `routingCode` defaults to `FRoutingId.FNumber` in Kingdee; MES will attempt to resolve by `productCode` when missing.
- `workshopCode`/`workshopName` are optional; current Kingdee env provides `FWorkShopID.*`.
- `dueDate` may be omitted if the source does not provide a finish date.
- `lineCode` is not available from PRD_MO in the current Kingdee environment; line assignment is handled in MES at release/run creation (optional mapping via workshop/department).

---

### 1.3 Materials

```json
{
  "materialCode": "100-241-184R",
  "name": "Cable Driver Board",
  "category": "Assembly",
  "categoryCode": "ASSY",
  "unit": "EA",
  "unitCode": "EA",
  "specification": "ASSY Cable Driver Board",
  "barcode": "MAT-100-241-184R",
  "description": "Cable driver board",
  "documentStatus": "C",
  "forbidStatus": "A",
  "isBatchManage": true,
  "isKFPeriod": false,
  "isProduce": true,
  "isPurchase": false,
  "produceUnitCode": "EA",
  "produceUnitName": "EA",
  "updatedAt": "2025-03-27T00:00:00Z"
}
```

Mapping:
- `Material.code = materialCode`
- `Material.name = name`
- `Material.category = category`
- `Material.unit = unit`
- `Material.meta.erp.specification = specification`
- `Material.meta.erp.barcode = barcode`
- `Material.meta.erp.description = description`
- `Material.meta.erp.documentStatus = documentStatus`
- `Material.meta.erp.forbidStatus = forbidStatus`
- `Material.meta.erp.isBatchManage = isBatchManage`
- `Material.meta.erp.isKFPeriod = isKFPeriod`
- `Material.meta.erp.isProduce = isProduce`
- `Material.meta.erp.isPurchase = isPurchase`
- `Material.meta.erp.categoryCode = categoryCode`
- `Material.meta.erp.unitCode = unitCode`
- `Material.meta.erp.produceUnitCode = produceUnitCode`
- `Material.meta.erp.produceUnitName = produceUnitName`
- Optional fields can be stored in `Material.meta.erp` if schema is not yet extended.

---

### 1.4 BOM

```json
{
  "bomCode": "100-241-184R",
  "parentCode": "100-241-184R",
  "parentName": "Cable Driver Board",
  "parentSpec": "ASSY Cable Driver Board",
  "childCode": "COMP-001",
  "childName": "Connector",
  "childSpec": "CONN-001",
  "qty": 2,
  "denominator": 1,
  "scrapRate": 0.02,
  "fixScrapQty": 0,
  "isKeyComponent": true,
  "issueType": "1",
  "backflushType": "1",
  "unit": "EA",
  "unitCode": "EA",
  "documentStatus": "C",
  "forbidStatus": "A",
  "updatedAt": "2025-03-27T00:00:00Z"
}
```

Mapping:
- `BomItem.parentCode = parentCode`
- `BomItem.childCode = childCode`
- `BomItem.qty = qty`
- `BomItem.unit = unit`
- `BomItem.meta.erp.bomCode = bomCode`
- `BomItem.meta.erp.parentName = parentName`
- `BomItem.meta.erp.parentSpec = parentSpec`
- `BomItem.meta.erp.childName = childName`
- `BomItem.meta.erp.childSpec = childSpec`
- `BomItem.meta.erp.denominator = denominator`
- `BomItem.meta.erp.scrapRate = scrapRate`
- `BomItem.meta.erp.fixScrapQty = fixScrapQty`
- `BomItem.meta.erp.isKeyComponent = isKeyComponent`
- `BomItem.meta.erp.issueType = issueType`
- `BomItem.meta.erp.backflushType = backflushType`
- `BomItem.meta.erp.unitCode = unitCode`
- `BomItem.meta.erp.documentStatus = documentStatus`
- `BomItem.meta.erp.forbidStatus = forbidStatus`
- Optional fields can be stored in `BomItem.meta.erp` if schema is not yet extended.

---

### 1.5 Work Centers

```json
{
  "workCenterCode": "WC000001",
  "name": "Production",
  "departmentCode": "BM000006",
  "departmentName": "Production",
  "workCenterType": "1",
  "description": "Main production center",
  "documentStatus": "C",
  "updatedAt": "2025-03-27T00:00:00Z"
}
```

Mapping:
- `WorkCenter.code = workCenterCode`
- `WorkCenter.name = name`
- `WorkCenter.departmentCode = departmentCode`
- `WorkCenter.departmentName = departmentName`
- `WorkCenter.meta.erp.workCenterType = workCenterType`
- `WorkCenter.meta.erp.description = description`
- `WorkCenter.meta.erp.documentStatus = documentStatus`
- `WorkCenterStationGroupMapping.sourceWorkCenter = workCenterCode`
- `WorkCenterStationGroupMapping.sourceDepartment = departmentCode`

Notes:
- Current Kingdee environment does not expose `workshopCode` or `isProductLine` on work centers.

---

## 2. TPM Payloads

### 2.1 Equipment

```json
{
  "equipmentCode": "ST-001",
  "name": "Manual Station 1",
  "status": "normal",
  "workshopCode": "WS-01",
  "location": "Line A",
  "updatedAt": "2025-03-27T06:30:00Z"
}
```

Mapping:
- `Station.code = equipmentCode` (direct match)
- `Station.status` or gate uses `status`

---

### 2.2 Status Logs

```json
{
  "equipmentCode": "ST-001",
  "status": "normal",
  "reason": "Ready",
  "startedAt": "2025-03-27T06:00:00Z",
  "endedAt": null
}
```

Mapping:
- Gate TrackIn/TrackOut when status != normal
- Use latest open log for current availability

---

### 2.3 Maintenance Tasks

```json
{
  "taskNo": "MT-20250327-001",
  "equipmentCode": "ST-001",
  "type": "routine",
  "status": "completed",
  "scheduledDate": "2025-03-27",
  "startTime": "2025-03-27T05:00:00Z",
  "completedAt": "2025-03-27T05:30:00Z"
}
```

Mapping:
- Block execution if there is an in-progress maintenance task
- Use maintenance history for prep checks and audit
