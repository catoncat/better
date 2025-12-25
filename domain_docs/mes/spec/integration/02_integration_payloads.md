# Integration Payload Contracts (ERP / TPM)

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
  "plannedQty": 100,
  "routingCode": "100-241-184R",
  "status": "RELEASED",
  "dueDate": "2025-04-10T00:00:00Z",
  "updatedAt": "2025-03-27T08:00:00Z"
}
```

Mapping:
- `WorkOrder.woNo = woNo`
- `WorkOrder.productCode = productCode`
- `WorkOrder.plannedQty = plannedQty`
- `WorkOrder.routingId` resolved by `routingCode`

---

### 1.3 Materials

```json
{
  "materialCode": "100-241-184R",
  "name": "Cable Driver Board",
  "category": "Assembly",
  "unit": "EA",
  "model": "ASSY Cable Driver Board",
  "updatedAt": "2025-03-27T00:00:00Z"
}
```

Mapping:
- `Material.code = materialCode`
- `Material.name = name`

---

### 1.4 BOM

```json
{
  "parentCode": "100-241-184R",
  "childCode": "COMP-001",
  "qty": 2,
  "unit": "EA",
  "updatedAt": "2025-03-27T00:00:00Z"
}
```

Mapping:
- `Bom.parentCode = parentCode`
- `Bom.childCode = childCode`
- `Bom.qty = qty`

---

### 1.5 Work Centers

```json
{
  "workCenterCode": "WC000001",
  "name": "Production",
  "departmentCode": "BM000006",
  "departmentName": "Production",
  "updatedAt": "2025-03-27T00:00:00Z"
}
```

Mapping:
- `WorkCenterStationGroupMapping.sourceWorkCenter = workCenterCode`
- `WorkCenterStationGroupMapping.sourceDepartment = departmentCode`

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
