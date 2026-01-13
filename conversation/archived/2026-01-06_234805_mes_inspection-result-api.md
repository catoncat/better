# MES Implementation: SPI/AOI Inspection Result API

> Date: 2026-01-06
> Tasks: 2.6.4, 2.6.8

## Summary

Implemented `POST /api/integration/inspection-result` endpoint to receive SPI/AOI inspection results from SCADA systems.

## Changes

### New Files
- `packages/db/prisma/schema/schema.prisma`: Added `InspectionResultType`, `InspectionResultStatus` enums and `InspectionResultRecord` model
- `apps/server/src/modules/mes/integration/inspection-result-schema.ts`: TypeBox request/response schemas
- `apps/server/src/modules/mes/integration/inspection-result-service.ts`: Core service logic

### Modified Files
- `apps/server/src/modules/mes/integration/routes.ts`: Added `/inspection-result` endpoint
- `domain_docs/mes/plan/phase2_tasks.md`: Marked 2.6.4 and 2.6.8 as completed
- `domain_docs/mes/spec/impl_align/01_e2e_align.md`: Added external integration section

## Key Features
1. **Idempotency**: Based on `eventId` - duplicate requests return existing record
2. **Auto Track Resolution**: If `trackId` not provided, auto-find by runNo + stationCode + unitSn + stepNo
3. **Defect Auto-Creation**: FAIL results automatically create Defect records
4. **Audit Trail**: All operations logged to `IntegrationMessage` and `AuditEvent`

## API Contract

### PASS Request
```json
{
  "eventId": "SPI-20250327-001",
  "eventTime": "2025-03-27T08:30:00Z",
  "runNo": "RUN20250327-01",
  "stationCode": "SPI-01",
  "unitSn": "SN0001",
  "stepNo": 20,
  "inspectionType": "SPI",
  "result": "PASS",
  "source": "AUTO",
  "equipmentId": "SPI-MACHINE-01"
}
```

### FAIL Request (with defects)
```json
{
  "eventId": "AOI-20250327-001",
  "eventTime": "2025-03-27T08:30:00Z",
  "runNo": "RUN20250327-01",
  "stationCode": "AOI-01",
  "unitSn": "SN0001",
  "stepNo": 30,
  "inspectionType": "AOI",
  "result": "FAIL",
  "defects": [
    { "code": "SOLDER_BRIDGE", "location": "U1-R5", "description": "Solder bridge between pins 3-4" }
  ],
  "source": "AUTO",
  "equipmentId": "AOI-MACHINE-01"
}
```

## Next Steps
- Task 2.6.10: Integrate inspection results into FAI/TrackOut flows
- Task 2.6.12: UI for manual entry (fallback mode)
