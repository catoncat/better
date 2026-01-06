# Data Collection Specs

> **更新时间**: 2025-01-02

## 1. Data Collection Overview
The Data Collection Specifications define how data will be captured during the production process.

## 2. Key Concepts
* **DataCollectionSpec**: Defines what data to collect, trigger rules, and validation specs (alarm limits).

## 3. Configuration Model
### 3.1 Specification Structure
- **name**: Name of the data point (e.g., "Peak Temperature").
- **itemType**: `KEY` (critical) or `OBSERVATION` (non-critical).
- **dataType**: `NUMBER`, `TEXT`, `BOOLEAN`, `JSON`.
- **triggerType**: `EVENT`, `TIME`, `EACH_UNIT`, `EACH_CARRIER`.
- **spec**: Validation limits (e.g., `{"min": 240, "max": 250}`).
- **alarm**: Action on limit breach (e.g., `{"action": "ALARM_ONLY"}`).

### 3.2 Sample JSON
```json
{
  "name": "Peak Temperature",
  "itemType": "KEY",
  "dataType": "NUMBER",
  "triggerType": "EVENT",
  "triggerRule": {"event": "TRACK_OUT"},
  "spec": {"min": 240, "max": 250, "unit": "C"},
  "alarm": {"min": 235, "max": 255, "action": "ALARM_ONLY"},
  "isRequired": true
}
```

## 4. Collection Flow
1. **Manual**: Operator input via UI.
2. **Auto**: Data parsed from `Ingest` events or `TrackOut` payloads.

## 5. Validation Rules
- Data values are validated against `spec` at the time of collection.
- Limit breaches should trigger an `AuditEvent` (audit log) and optionally lock the unit/run
  if `alarm.action` is set to `HOLD` (planned; M2+ enters `ON_HOLD`).
